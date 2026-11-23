const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRenderedCvMedia } = require('../lib/cv-versions.js');
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
