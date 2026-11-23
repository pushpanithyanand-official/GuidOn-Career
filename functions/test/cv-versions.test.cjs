const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRenderedCvMedia, validateVisibleEvidenceClaims } = require('../lib/cv-versions.js');
const { validateCvQuality } = require('../lib/cv-workflow.js');

const docx = Buffer.concat([Buffer.from('PK'), Buffer.alloc(150, 1)]);
const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(250, 2)]);
const text = 'Financial Analyst: automated financial reporting; improved operating efficiency and delivered clear monthly forecasts. '.repeat(3);

test('real binary headers, readable text and document size are required', () => {
  assert.equal(validateRenderedCvMedia(docx, pdf, text).valid, true);
  assert.equal(validateRenderedCvMedia(Buffer.alloc(200), pdf, text).valid, false);
  assert.equal(validateRenderedCvMedia(docx, Buffer.alloc(200), text).valid, false);
  assert.equal(validateRenderedCvMedia(docx, pdf, 'tiny').valid, false);
  assert.equal(validateRenderedCvMedia(Buffer.concat([Buffer.from('PK'), Buffer.alloc(2_500_001)]), pdf, text).valid, false);
});

test('one-page visual QA does not silently forgive two pages or misalignment', () => {
  const qa = { pageCount: 1, leftEdgeMaxDriftPt: 0.4, rightEdgeMaxDriftPt: 0.4,
    minimumBodyFontPt: 10.5, starBulletsComplete: true, starBulletsWithinTwoLines: true,
    baseFormatReviewed: true, bodyText: text, inspectedFromRenderedOutput: true };
  assert.equal(validateCvQuality(qa).passed, true);
  assert.equal(validateCvQuality({ ...qa, pageCount: 2 }).passed, false);
  assert.equal(validateCvQuality({ ...qa, rightEdgeMaxDriftPt: 1.2 }).passed, false);
  assert.equal(validateCvQuality({ ...qa, starBulletsComplete: false }).passed, false);
  assert.equal(validateCvQuality({ ...qa, bodyText: 'Reduced turnaround - improved controls' }).passed, false);
});

test('visible recruiter evidence must be present in rendered text and confirmed profile', () => {
  const evidenceId = '550e8400-e29b-41d4-a716-446655440011';
  const claimId = '550e8400-e29b-41d4-a716-446655440012';
  const claims = [{ claimId, exactVisibleText: 'Improved operating efficiency',
    evidenceIds: [evidenceId] }];
  const valid = validateVisibleEvidenceClaims(text, claims, new Set([evidenceId]));
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.representedEvidenceIds, [evidenceId]);
  const absent = validateVisibleEvidenceClaims(text,
    [{ ...claims[0], exactVisibleText: 'Invented £4 million sales increase' }],
    new Set([evidenceId]));
  assert.equal(absent.valid, false);
  const unknown = validateVisibleEvidenceClaims(text, claims, new Set());
  assert.equal(unknown.valid, false);
});
