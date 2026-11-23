#!/usr/bin/env python3
"""GuidOn CV rendering gate: render DOCX once and inspect actual PDF geometry.

The worker is run in a prebuilt image with LibreOffice; it must never install
LibreOffice from scratch for each CV. Rendering failure blocks acceptance.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path
from zipfile import ZipFile, BadZipFile
from xml.etree import ElementTree as ET

import fitz

SECTION_HEADING = re.compile(
    r"^(professional summary|profile|summary|skills|technical skills|professional experience|experience|"
    r"work experience|education|certifications|projects|qualifications|achievements)$", re.I
)
DATE_ONLY = re.compile(
    r"^(?:[A-Za-z]{3,9}\s+)?(?:19|20)\d{2}\s*(?:to|[-–—])\s*"
    r"(?:(?:[A-Za-z]{3,9}\s+)?(?:19|20)\d{2}|present|current)$|^(?:19|20)\d{2}$", re.I
)
BULLET = re.compile("^[•●◦▪‣·\uf0b7]")


def inspect_pdf(pdf_path: str) -> dict:
    with fitz.open(pdf_path) as doc:
        pages = len(doc)
        page_margins = []
        all_text = []
        section_left = []
        date_right = []
        fonts = []
        clipped = []
        bullet_lengths = []
        for page_index, page in enumerate(doc):
            entries = []
            for block in page.get_text('dict').get('blocks', []):
                if block.get('type') != 0:
                    continue
                for line in block.get('lines', []):
                    spans = [sp for sp in line.get('spans', []) if sp.get('text', '').strip()]
                    if not spans:
                        continue
                    text = ''.join(sp['text'] for sp in spans).strip()
                    if not text:
                        continue
                    rect = fitz.Rect(line['bbox'])
                    entries.append({'text': text, 'left': rect.x0, 'right': rect.x1,
                                    'top': rect.y0, 'bottom': rect.y1})
                    fonts.extend(sp['size'] for sp in spans if len(sp['text'].strip()) > 1)
                    if (rect.x0 < -0.5 or rect.y0 < -0.5 or
                        rect.x1 > page.rect.width + 0.5 or rect.y1 > page.rect.height + 0.5):
                        clipped.append({'page': page_index + 1, 'text': text[:80]})
                    if SECTION_HEADING.fullmatch(text.strip(' :')):
                        section_left.append(round(rect.x0, 2))
                    if DATE_ONLY.fullmatch(text) and rect.x0 > page.rect.width * 0.45:
                        date_right.append(round(rect.x1, 2))
            entries.sort(key=lambda e: (round(e['top'] / 3), e['left']))
            all_text.append('\n'.join(entry['text'] for entry in entries))
            for i, line in enumerate(entries):
                if not BULLET.match(line['text']):
                    continue
                # Word may render bullet glyphs in a separate font and text line.
                anchor = next((entry for entry in entries[i + 1:]
                               if abs(entry['top'] - line['top']) <= 3 and
                               entry['left'] >= line['right'] + 3), None)
                # Modern DOCX generators commonly render bullet and sentence in
                # a single PDF span. Inspect these too; never silently skip them.
                if anchor is None:
                    anchor = line
                lines = 1
                last_bottom = anchor['bottom']
                seen_anchor = anchor is line
                for following in entries[i + 1:]:
                    if not seen_anchor:
                        if following is anchor:
                            seen_anchor = True
                        continue
                    if BULLET.match(following['text']) or SECTION_HEADING.fullmatch(following['text']):
                        break
                    if (0 <= following['top'] - last_bottom <= 12 and
                        following['left'] >= anchor['left'] - 3):
                        lines += 1
                        last_bottom = following['bottom']
                    else:
                        break
                bullet_lengths.append(lines)
            if entries:
                page_margins.append({
                    'page': page_index + 1,
                    'leftMarginPt': round(min(e['left'] for e in entries), 2),
                    'rightMarginPt': round(page.rect.width - max(e['right'] for e in entries), 2),
                    'topMarginPt': round(min(e['top'] for e in entries), 2),
                    'bottomMarginPt': round(page.rect.height - max(e['bottom'] for e in entries), 2),
                })
        text = '\n'.join(all_text)
        left_drift = (round(max(section_left) - min(section_left), 2)
                      if len(section_left) >= 2 else None)
        right_drift = (round(max(date_right) - min(date_right), 2)
                       if len(date_right) >= 2 else None)
        readable = len(re.findall(r'\w+', text)) >= 25 and '\ufffd' not in text
        issues = []
        if pages != 1:
            issues.append('one_page_required')
        if not readable:
            issues.append('cv_text_unreadable')
        if clipped:
            issues.append('clipped_text')
        if fonts and min(fonts) < 10:
            issues.append('body_font_below_10pt')
        if page_margins and any(min(p['leftMarginPt'], p['rightMarginPt']) < 36 for p in page_margins):
            issues.append('horizontal_margin_below_half_inch')
        if left_drift is None:
            issues.append('section_alignment_unverified')
        elif left_drift > 1:
            issues.append('section_left_alignment_drift')
        if right_drift is None:
            issues.append('date_alignment_unverified')
        elif right_drift > 1:
            issues.append('date_right_alignment_drift')
        if any(count > 2 for count in bullet_lengths):
            issues.append('bullet_over_two_lines')
        if not bullet_lengths:
            issues.append('bullet_lengths_unverified')
        return {
            'pageCount': pages, 'passed': not issues, 'issues': issues,
            'textExtractable': readable, 'pageMargins': page_margins,
            'leftEdgeMaxDriftPt': left_drift,
            'rightEdgeMaxDriftPt': right_drift,
            'minRenderedFontPt': round(min(fonts), 2) if fonts else None,
            'dateAnchorsCount': len(date_right),
            'sectionAnchorsCount': len(section_left),
            'bulletCount': len(bullet_lengths),
            'maximumBulletLines': max(bullet_lengths, default=None),
            'textPreview': text[:200], 'textCharacterCount': len(text),
            'clipped': clipped,
            # The final CV still requires human visual and evidence/STAR review.
            'humanReviewRequired': True,
        }



WORD = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
WORD_NS = {'w': WORD}


def inspect_docx_structure(docx_path: Path) -> dict:
    """Fail closed on tables, text boxes and multicolumn Word structures."""
    tables = text_boxes = graphics = header_footer_text = 0
    columns = 1
    try:
        with ZipFile(docx_path) as archive:
            members = [name for name in archive.namelist() if
                       name == 'word/document.xml' or
                       re.fullmatch(r'word/(header|footer)\d+\.xml', name)]
            if 'word/document.xml' not in members:
                raise ValueError('Missing main Word document')
            for name in members:
                # We inspect document and headers/footers, not just PDF text.
                data = archive.read(name)
                if len(data) > 8_000_000:
                    raise ValueError('Word XML part too large for inspection')
                root = ET.fromstring(data)
                tables += len(root.findall('.//w:tbl', WORD_NS))
                text_boxes += len(root.findall('.//w:txbxContent', WORD_NS))
                graphics += len(root.findall('.//w:drawing', WORD_NS))
                graphics += sum(1 for e in root.iter() if e.tag.endswith('}pict'))
                if name != 'word/document.xml':
                    header_footer_text += sum(1 for e in root.findall('.//w:t', WORD_NS)
                                              if e.text and e.text.strip())
                else:
                    for cols in root.findall('.//w:cols', WORD_NS):
                        count = cols.attrib.get(f'{{{WORD}}}num', '1')
                        columns = max(columns, int(count))
    except (BadZipFile, ET.ParseError, OSError, ValueError) as exc:
        return {'passed': False, 'issues': ['invalid_docx_structure'],
                'detail': str(exc)[:180], 'tableCount': None, 'textBoxCount': None,
                'graphicsCount': None, 'columnCount': None,
                'headerFooterTextCount': None}
    issues = []
    if tables:
        issues.append('cv_tables_prohibited')
    if text_boxes:
        issues.append('cv_text_boxes_prohibited')
    if columns != 1:
        issues.append('cv_multiple_columns_prohibited')
    if graphics:
        issues.append('cv_graphics_prohibited')
    if header_footer_text:
        issues.append('cv_header_footer_text_prohibited')
    return {'passed': not issues, 'issues': issues,
            'tableCount': tables, 'textBoxCount': text_boxes,
            'graphicsCount': graphics, 'columnCount': columns,
            'headerFooterTextCount': header_footer_text}



def render_docx(docx_path: Path) -> dict:
    with tempfile.TemporaryDirectory(prefix='guidon-cv-') as directory:
        temporary = Path(directory)
        profile = (temporary / 'lo_profile').as_uri()
        result = subprocess.run([
            'libreoffice', f'-env:UserInstallation={profile}', '--headless',
            '--convert-to', 'pdf', '--outdir', str(temporary), str(docx_path),
        ], capture_output=True, text=True, timeout=90, check=False)
        pdf = temporary / (docx_path.stem + '.pdf')
        if result.returncode != 0 or not pdf.is_file():
            raise RuntimeError('CV render failed: ' + result.stderr[-500:])
        report = inspect_pdf(str(pdf))
        structure = inspect_docx_structure(docx_path)
        report['wordStructure'] = structure
        report['issues'].extend(structure['issues'])
        report['passed'] = report['passed'] and structure['passed']
        return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('document', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if not args.document.is_file():
        parser.error('Input document not found')
    if args.document.suffix.lower() == '.docx':
        report = render_docx(args.document.resolve())
    elif args.document.suffix.lower() == '.pdf':
        report = inspect_pdf(str(args.document.resolve()))
    else:
        parser.error('Only .docx and .pdf are supported')
    payload = json.dumps(report, indent=2)
    if args.output:
        args.output.write_text(payload + '\n', encoding='utf-8')
    else:
        print(payload)
    raise SystemExit(0 if report['passed'] else 2)


if __name__ == '__main__':
    main()
