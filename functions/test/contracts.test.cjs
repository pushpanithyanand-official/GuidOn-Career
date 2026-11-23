const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_BASE_CV_BYTES, cvUploadInput, completeCvInput,
  confirmProfileInput, cvStoragePath, cvTypeForName,
} = require('../lib/contracts.js');

const validPdf = {
  fileName: 'Base Resume.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 140000,
  consentToStore: true,
  clientRequestId: '550e8400-e29b-41d4-a716-446655440000',
};

test('consented DOCX and PDF upload metadata validates', () => {
  assert.doesNotThrow(() => cvUploadInput.parse(validPdf));
  assert.doesNotThrow(() => cvUploadInput.parse({
    ...validPdf,
    fileName: 'resume.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }));
});

test('unsupported, oversized, misleading or unconsented files are rejected', () => {
  const bad = [
    { ...validPdf, sizeBytes: MAX_BASE_CV_BYTES + 1 },
    { ...validPdf, mimeType: 'image/jpeg' },
    { ...validPdf, fileName: 'resume.pdf.exe' },
    { ...validPdf, fileName: 'resume.docx' },
    { ...validPdf, consentToStore: false },
    { ...validPdf, ownerUid: 'other-user' },
    { ...validPdf, clientRequestId: '../another-user' },
  ];
  for (const item of bad) {
    assert.equal(cvUploadInput.safeParse(item).success, false);
  }
});

test('storage paths cannot reference another user or escape their upload prefix', () => {
  assert.equal(cvStoragePath('test_user_123', 'uploadABC_987654321'), 'users/test_user_123/base-cvs/uploadABC_987654321/original');
  assert.throws(() => cvStoragePath('../other', 'uploadABC_987654321'));
  assert.throws(() => cvStoragePath('test_user_123', '../other'));
  assert.throws(() => cvStoragePath('test_user_123', 'x'));
  assert.equal(completeCvInput.safeParse({ uploadId: '../other' }).success, false);
});

test('extraction alone cannot confirm a career profile', () => {
  const basic = { profile: { skills: ['Accounting'] } };
  assert.equal(confirmProfileInput.safeParse(basic).success, false);
  assert.equal(confirmProfileInput.safeParse({ ...basic, userConfirmed: true }).success, true);
  assert.equal(confirmProfileInput.safeParse({ ...basic, userConfirmed: true, arbitraryAdminFlag: true }).success, false);
});

test('document types use strict extension recognition', () => {
  assert.equal(cvTypeForName('resume.pdf'), 'application/pdf');
  assert.equal(cvTypeForName('Resume.DOCX'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(cvTypeForName('resume.pdf.exe'), null);
});

test('work authorisation is explicit and does not infer sponsorship', () => {
  const base = { profile: {
    workEligibility: [{ country: 'Ireland', authorisedNow: 'unknown', sponsorshipNow: 'unknown', sponsorshipFuture: 'unknown' }],
  }, userConfirmed: true, expectedRevisionId: null };
  assert.equal(confirmProfileInput.safeParse(base).success, true);
  assert.equal(confirmProfileInput.safeParse({
    ...base,
    profile: { workEligibility: [{ country: 'Ireland', authorisedNow: 'maybe' }] },
  }).success, false);
});

test('profile drafts and version queries are bounded', () => {
  const { saveProfileDraftInput, profileHistoryInput } = require('../lib/contracts.js');
  assert.equal(saveProfileDraftInput.safeParse({ profile: { skills: ['Transfer Pricing'] } }).success, true);
  assert.equal(saveProfileDraftInput.safeParse({ profile: { skills: ['X'.repeat(250)] } }).success, false);
  assert.equal(profileHistoryInput.parse({}).limit, 10);
  assert.equal(profileHistoryInput.safeParse({ limit: 200 }).success, false);
});
