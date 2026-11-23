"""Real-document CV generator tests; synthetic candidates only."""
import copy
from pathlib import Path
import shutil
import tempfile
import unittest

from cv_generate import compose, generate
from cv_render_qa import inspect_docx_structure


def fixture():
    return {
        'profileRevisionId': 'test-confirmed-revision',
        'userConfirmedEvidenceSelection': True,
        'generationMode': 'evidence_first',
        'profile': {
            'displayName': 'Example Candidate',
            'contact': {'city': 'Dublin', 'country': 'Ireland',
                        'email': 'example@example.invalid'},
            'professionalSummary': (
                'Finance professional with experience in reporting, forecasting, '
                'account reconciliations and practical process automation.'
            ),
            'skills': ['SQL', 'Power BI', 'Microsoft Excel',
                       'Financial Analysis', 'Budgeting'],
            'experience': [
                {
                    'id': '550e8400-e29b-41d4-a716-446655440001',
                    'title': 'Financial Analyst', 'employer': 'Example Finance',
                    'startDate': '2024', 'endDate': 'Present',
                    'keyNumbers': [],
                    'starStories': [{
                        'id': '550e8400-e29b-41d4-a716-446655440002',
                        'verification': 'user_confirmed',
                        'situation': 'Manual monthly reporting',
                        'task': 'Improve reporting controls',
                        'action': 'Automated account reconciliations',
                        'result': 'Reduced processing time by 25 percent',
                        'linkedKeyNumberIds': [],
                    }],
                },
                {
                    'id': '550e8400-e29b-41d4-a716-446655440003',
                    'title': 'Tax Analyst', 'employer': 'Example Advisory',
                    'startDate': '2021', 'endDate': '2024',
                    'keyNumbers': [],
                    'starStories': [{
                        'id': '550e8400-e29b-41d4-a716-446655440004',
                        'verification': 'user_confirmed',
                        'situation': 'Large multinational tax compliance',
                        'task': 'Prepare reliable tax documentation',
                        'action': 'Coordinated evidence collection and reviewed reporting',
                        'result': 'Delivered audit-ready work on schedule',
                        'linkedKeyNumberIds': [],
                    }],
                },
            ],
            'education': [{
                'id': '550e8400-e29b-41d4-a716-446655440005',
                'credential': 'MSc Finance', 'institution': 'Example University',
                'startDate': '2025', 'endDate': '2026',
            }],
        },
    }


class CvGenerationTests(unittest.TestCase):
    def test_unverified_stories_and_missing_explicit_consent_block_output(self):
        record = fixture()
        record['userConfirmedEvidenceSelection'] = False
        with self.assertRaisesRegex(ValueError, 'approve'):
            compose(record)
        record['userConfirmedEvidenceSelection'] = True
        record['profile']['experience'][0]['starStories'][0]['verification'] = 'unconfirmed'
        record['selectedStoryIds'] = ['550e8400-e29b-41d4-a716-446655440002']
        with self.assertRaisesRegex(ValueError, 'not confirmed'):
            compose(record)

    def test_generator_never_invents_metrics_or_changes_official_role(self):
        record = fixture()
        document, claims, narrative = compose(record)
        self.assertEqual(len(claims), 2)
        self.assertIn('Financial Analyst | Example Finance',
                      '\n'.join(p.text for p in document.paragraphs))
        self.assertIn('Reduced processing time by 25 percent', narrative)
        self.assertNotIn('£10 million', narrative)
        self.assertEqual(len(document.tables), 0)
        self.assertFalse(document.sections[0].header.paragraphs[0].text)

    @unittest.skipUnless(shutil.which('libreoffice'), 'LibreOffice is needed for real render QA')
    def test_real_docx_and_pdf_strictly_one_page_zero_tables_and_aligned_dates(self):
        with tempfile.TemporaryDirectory() as td:
            report = generate(fixture(), Path(td))
            self.assertTrue(report['qualityPassed'], report['render']['issues'])
            self.assertEqual(report['render']['pageCount'], 1)
            self.assertLessEqual(report['quality']['leftEdgeMaxDriftPt'], 1)
            self.assertLessEqual(report['quality']['rightEdgeMaxDriftPt'], 1)
            self.assertGreaterEqual(report['render']['bulletCount'], 2)
            self.assertLessEqual(report['render']['maximumBulletLines'], 2)
            self.assertEqual(report['quality']['tableCount'], 0)
            self.assertEqual(report['quality']['columnCount'], 1)
            self.assertTrue(inspect_docx_structure(Path(td) / 'resume.docx')['passed'])
            self.assertTrue((Path(td) / 'resume.pdf').is_file())
            self.assertIn('Financial Analyst', (Path(td) / 'resume.txt').read_text())
            self.assertFalse(report['aiModelUsed'])
            self.assertFalse(report['uploadedBaseCvFormatPreserved'])

    @unittest.skipUnless(shutil.which('libreoffice'), 'LibreOffice is needed for real render QA')
    def test_long_star_bullet_is_blocked_not_hidden_or_font_shrunk(self):
        record = copy.deepcopy(fixture())
        record['profile']['experience'][0]['starStories'][0]['action'] = (
            'Reviewed many detailed reports and reconciled figures ' * 18
        )
        with tempfile.TemporaryDirectory() as td:
            report = generate(record, Path(td))
            self.assertFalse(report['qualityPassed'])
            self.assertEqual(report['status'], 'blocked_render_qa')
            self.assertTrue((Path(td) / 'manifest.json').is_file())


if __name__ == '__main__':
    unittest.main()
