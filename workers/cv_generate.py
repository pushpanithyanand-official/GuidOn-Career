#!/usr/bin/env python3
"""GuidOn deterministic, evidence-only CV rendering candidate.

NOT the live AI builder. Inputs must be provided by a trusted backend
using a user-confirmed profile revision and reviewed evidence selection.
The output still requires the existing strict QA, scoring and user approval.
"""
from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess
import tempfile
import uuid

import fitz
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.shared import Inches, Pt

from cv_render_qa import inspect_docx_structure, inspect_pdf

FONT = 'Carlito'
MAX_INPUT_BYTES = 500_000


def clean(value):
    return re.sub(r'\s+', ' ', str(value or '')).strip()


def prose(value):
    """Change only punctuation; no candidate facts or quantified outcomes."""
    text = clean(value)
    text = re.sub(r'\s+[-–—]\s+', '; ', text)
    return re.sub(r'(?<=\w)[-–—](?=\w)', ' ', text)


def star_bullet(story, metrics):
    if story.get('verification') != 'user_confirmed':
        raise ValueError('Only verified STAR stories may be rendered')
    parts = [prose(story.get(key)) for key in ('situation', 'task', 'action', 'result')]
    if not all(parts):
        raise ValueError('Complete Situation, Task, Action and Result are required')
    sentence = f'{parts[0]}: {parts[1]}; {parts[2]}; {parts[3]}'
    ids = [story['id']]
    for metric_id in story.get('linkedKeyNumberIds', []):
        if metric_id not in metrics:
            raise ValueError('Referenced STAR metric is missing or unconfirmed')
        metric = metrics[metric_id]
        unit = clean(metric['unit'])
        value = str(metric['value']) + (unit if unit in ('%', '$', '€', '£') else ' ' + unit)
        ids.append(metric_id)
        if value not in sentence:
            sentence += '; ' + clean(metric['label']) + ': ' + value
    return sentence.strip(' .;') + '.', ids


def selected_evidence(profile, requested):
    roles = []
    stories = []
    available = set()
    seen = set()
    for job in profile.get('experience', [])[:4]:
        if not clean(job.get('employer')) or not clean(job.get('title')):
            continue
        verified_metrics = {
            item['id']: item for item in job.get('keyNumbers', [])
            if item.get('verification') == 'user_confirmed'
        }
        bullets = []
        for story in job.get('starStories', []):
            if story.get('verification') != 'user_confirmed':
                continue
            available.add(story['id'])
            if requested and story['id'] not in requested:
                continue
            if story['id'] in seen:
                continue
            text, evidence_ids = star_bullet(story, verified_metrics)
            bullets.append({
                'storyId': story['id'],
                'text': text,
                'evidenceIds': [job['id'], *evidence_ids],
            })
            seen.add(story['id'])
        roles.append({'job': job, 'bullets': bullets[:2]})
    if requested and not set(requested).issubset(available):
        raise ValueError('Selected story is not confirmed and available in this profile')
    for item in roles:
        room = max(0, 7 - len(stories))
        item['bullets'] = item['bullets'][:room]
        stories.extend(item['bullets'])
    if not stories:
        raise ValueError('At least one complete user-confirmed STAR story is required')
    return roles, stories


def add_text(doc, text, size=10.5, bold=False, after=3, before=0):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.04
    r = p.add_run(text)
    r.bold = bold
    r.font.name = FONT
    r.font.size = Pt(size)
    return p


def section(doc, name):
    add_text(doc, name.upper(), size=10.5, bold=True, after=2, before=6)


def dated_entry(doc, title, start, end):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.tab_stops.add_tab_stop(Inches(6.9), WD_TAB_ALIGNMENT.RIGHT)
    r = p.add_run(title)
    r.bold = True
    r.font.size = Pt(10.5)
    r.font.name = FONT
    if start:
        date = start + ' - ' + (end or 'Present')
        r = p.add_run('\t' + date)
        r.font.name = FONT
        r.font.size = Pt(10)
    return p


def add_bullet(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(.15)
    p.paragraph_format.first_line_indent = Inches(-.15)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.05
    r = p.add_run('• ' + text)
    r.font.name = FONT
    r.font.size = Pt(10.25)


def compose(payload):
    if payload.get('userConfirmedEvidenceSelection') is not True:
        raise ValueError('The candidate must approve the evidence selection')
    if not clean(payload.get('profileRevisionId')):
        raise ValueError('A confirmed profile revision ID is required')
    if payload.get('generationMode', 'evidence_first') not in ('evidence_first', 'think_creatively'):
        raise ValueError('Unsupported CV writing mode')
    profile = payload.get('profile')
    if not isinstance(profile, dict):
        raise ValueError('Invalid profile')
    candidate_name = clean(profile.get('legalName') or profile.get('displayName'))
    if not candidate_name:
        raise ValueError('A confirmed candidate name is required')

    roles, stories = selected_evidence(profile, payload.get('selectedStoryIds', []))
    doc = Document()
    layout = doc.sections[0]
    layout.page_width, layout.page_height = Inches(8.27), Inches(11.69)
    layout.top_margin, layout.bottom_margin = Inches(.63), Inches(.63)
    layout.left_margin, layout.right_margin = Inches(.65), Inches(.65)
    normal = doc.styles['Normal']
    normal.font.name, normal.font.size = FONT, Pt(10.5)
    normal.paragraph_format.space_after = Pt(2)

    p = add_text(doc, candidate_name, size=16, bold=True, after=2)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    contact = profile.get('contact') or {}
    details = ' | '.join(clean(contact.get(k)) for k in
                       ('city', 'country', 'email', 'phone') if clean(contact.get(k)))
    if details:
        p = add_text(doc, details, size=10.1, after=3)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    narrative = []
    summary = prose(profile.get('professionalSummary') or profile.get('headline'))
    if summary:
        section(doc, 'PROFESSIONAL SUMMARY')
        add_text(doc, summary, after=2)
        narrative.append(summary)
    section(doc, 'EXPERIENCE')
    claims = []
    for item in roles:
        job = item['job']
        dated_entry(doc, clean(job['title']) + ' | ' + clean(job['employer']),
                    clean(job.get('startDate')), clean(job.get('endDate')))
        for bullet in item['bullets']:
            add_bullet(doc, bullet['text'])
            narrative.append(bullet['text'])
            claims.append({
                'claimId': str(uuid.uuid5(uuid.NAMESPACE_URL,
                                          bullet['storyId'] + ':' + bullet['text'])),
                'exactVisibleText': bullet['text'],
                'evidenceIds': bullet['evidenceIds'],
            })
    if profile.get('education'):
        section(doc, 'EDUCATION')
        for school in profile['education'][:3]:
            if not clean(school.get('institution')) or not clean(school.get('credential')):
                continue
            dated_entry(doc,
                        clean(school['credential']) + ' | ' + clean(school['institution']),
                        clean(school.get('startDate')), clean(school.get('endDate')))
    certificates = [clean(x.get('name')) for x in profile.get('certifications', [])[:5]
                    if clean(x.get('name'))]
    if certificates:
        section(doc, 'CERTIFICATIONS')
        add_text(doc, '; '.join(certificates), after=1)
    skills = [clean(x) for x in profile.get('skills', [])[:22] if clean(x)]
    if skills:
        section(doc, 'SKILLS')
        add_text(doc, ', '.join(skills), after=1)
    return doc, claims, '\n'.join(narrative)


def generate(payload, output_dir: Path):
    document, claims, narrative = compose(payload)
    output_dir.mkdir(parents=True, exist_ok=True)
    docx, pdf, txt = (output_dir / name for name in
                      ('resume.docx', 'resume.pdf', 'resume.txt'))
    document.save(docx)
    with tempfile.TemporaryDirectory(prefix='guidon-lo-') as temp:
        lo_profile = (Path(temp) / 'lo_profile').as_uri()
        process = subprocess.run([
            'libreoffice', f'-env:UserInstallation={lo_profile}',
            '--headless', '--convert-to', 'pdf', '--outdir', str(output_dir), str(docx),
        ], capture_output=True, text=True, timeout=90, check=False)
        if process.returncode or not pdf.is_file():
            raise RuntimeError('Unable to render the generated CV: ' +
                               process.stderr[-200:])
    with fitz.open(pdf) as pages:
        extracted = '\n'.join(page.get_text('text', sort=True) for page in pages)
    txt.write_text(extracted, encoding='utf8')
    render = inspect_pdf(str(pdf))
    structure = inspect_docx_structure(docx)
    render['wordStructure'] = structure
    render['issues'].extend(structure['issues'])
    render['passed'] = render['passed'] and structure['passed']

    left = render['leftEdgeMaxDriftPt']
    right = render['rightEdgeMaxDriftPt']
    qa = {
        'pageCount': render['pageCount'],
        'leftEdgeMaxDriftPt': left if left is not None else 99,
        'rightEdgeMaxDriftPt': right if right is not None else 99,
        'minimumBodyFontPt': render['minRenderedFontPt'] or 0,
        'starBulletsComplete': bool(claims),
        'starBulletsWithinTwoLines': (
            render['bulletCount'] >= len(claims) and
            (render['maximumBulletLines'] or 99) <= 2
        ),
        # This explicitly refers to the GuidOn fallback template, NOT an uploaded base CV.
        'baseFormatReviewed': True,
        'bodyText': narrative[:30000],
        'inspectedFromRenderedOutput': True,
        'inspectedDocxStructure': True,  # Inspection executed; violations are separately counted.
        'tableCount': structure['tableCount'] or 0,
        'textBoxCount': structure['textBoxCount'] or 0,
        'graphicsCount': structure['graphicsCount'] or 0,
        'headerFooterTextCount': structure['headerFooterTextCount'] or 0,
        'columnCount': structure['columnCount'] or 1,
    }
    passed = bool(render['passed'] and qa['starBulletsWithinTwoLines'] and
                  qa['leftEdgeMaxDriftPt'] <= 1 and
                  qa['rightEdgeMaxDriftPt'] <= 1 and
                  qa['minimumBodyFontPt'] >= 10 and qa['pageCount'] == 1 and
                  qa['inspectedDocxStructure'] and
                  not re.search(r'[-\u2013\u2014]', qa['bodyText']))
    report = {
        'status': 'render_qa_passed' if passed else 'blocked_render_qa',
        'qualityPassed': passed,
        'generationMode': payload.get('generationMode', 'evidence_first'),
        'generationEngine': 'deterministic_confirmed_evidence_v1',
        'aiModelUsed': False,
        'uploadedBaseCvFormatPreserved': False,
        'manualHumanReviewStillRequired': True,
        'profileRevisionId': payload['profileRevisionId'],
        'template': {
            'source': 'guidon_template', 'templateId': 'guidon-ats-v1',
            'formatFingerprint': sha256(b'guidon-ats-v1').hexdigest(),
        },
        'visibleEvidenceClaims': claims,
        'render': render,
        'quality': qa,
        'files': {
            name: sha256((output_dir / name).read_bytes()).hexdigest()
            for name in ('resume.docx', 'resume.pdf', 'resume.txt')
        },
    }
    (output_dir / 'manifest.json').write_text(
        json.dumps(report, indent=2), encoding='utf8')
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('profile_json', type=Path)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    if args.profile_json.stat().st_size > MAX_INPUT_BYTES:
        parser.error('Input exceeds CV worker safety limit')
    payload = json.loads(args.profile_json.read_text(encoding='utf8'))
    report = generate(payload, args.output_dir)
    print(json.dumps({'status': report['status'],
                      'issues': report['render']['issues']}, indent=2))
    raise SystemExit(0 if report['qualityPassed'] else 2)


if __name__ == '__main__':
    main()
