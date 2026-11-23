"""Synthetic PDF geometry checks; no personal CVs or cloud project required."""
import unittest
import tempfile
from pathlib import Path

import fitz
from cv_render_qa import inspect_pdf


def draw(page, second_date_offset=0, body_font=10, left=45):
    page.insert_text((left, 60), 'EXPERIENCE', fontsize=13)
    page.insert_text((left, 80), 'FINANCIAL ANALYST', fontsize=11)
    first = '2024 - Present'
    page.insert_text((540 - fitz.get_text_length(first, fontsize=10), 80), first, fontsize=10)
    page.insert_text((left, 101), '·', fontsize=body_font)
    page.insert_text((left + 18, 101),
                     'Improved forecasting accuracy: delivered better reporting and valuable financial insights.',
                     fontsize=body_font)
    page.insert_text((left, 140), 'EDUCATION', fontsize=13)
    page.insert_text((left, 160), 'MSc Finance, Example University', fontsize=11)
    second = '2022 - 2023'
    page.insert_text((540 - fitz.get_text_length(second, fontsize=10) + second_date_offset, 160),
                     second, fontsize=10)
    page.insert_text((left, 184), '·', fontsize=body_font)
    page.insert_text((left + 18, 184),
                     'Analysed case studies: evaluated strategies and strengthened planning insights.',
                     fontsize=body_font)
    page.insert_text((left, 208),
                     'Skills: financial analysis, budgeting, SQL, Excel and stakeholder reporting.',
                     fontsize=body_font)


class CvRenderQaTests(unittest.TestCase):
    def inspect(self, **kwargs):
        with tempfile.TemporaryDirectory() as directory:
            pdf = fitz.open()
            draw(pdf.new_page(width=612, height=792), **kwargs)
            path = str(Path(directory) / 'cv.pdf')
            pdf.save(path)
            pdf.close()
            return inspect_pdf(path)

    def test_well_aligned_one_page_passes_automatic_geometry_checks(self):
        report = self.inspect()
        self.assertEqual(report['pageCount'], 1)
        self.assertEqual(report['leftEdgeMaxDriftPt'], 0)
        self.assertLessEqual(report['rightEdgeMaxDriftPt'], 1)
        self.assertEqual(report['maximumBulletLines'], 1)
        self.assertTrue(report['passed'])
        self.assertTrue(report['humanReviewRequired'])

    def test_misaligned_right_hand_dates_fail(self):
        report = self.inspect(second_date_offset=12)
        self.assertFalse(report['passed'])
        self.assertIn('date_right_alignment_drift', report['issues'])

    def test_margins_and_font_size_cannot_be_crushed_to_fit(self):
        report = self.inspect(body_font=9, left=20)
        self.assertFalse(report['passed'])
        self.assertIn('body_font_below_10pt', report['issues'])
        self.assertIn('horizontal_margin_below_half_inch', report['issues'])

    def test_second_page_is_hard_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            pdf = fitz.open()
            draw(pdf.new_page(width=612, height=792))
            pdf.new_page(width=612, height=792).insert_text((45, 60), 'SECOND PAGE', fontsize=12)
            path = str(Path(directory) / 'two.pdf')
            pdf.save(path)
            pdf.close()
            report = inspect_pdf(path)
            self.assertFalse(report['passed'])
            self.assertIn('one_page_required', report['issues'])


if __name__ == '__main__':
    unittest.main()
