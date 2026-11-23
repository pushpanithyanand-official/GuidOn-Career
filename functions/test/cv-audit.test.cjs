const test = require('node:test');
const assert = require('node:assert/strict');
const { cvWorkspaceInputSchema, cvWorkspaceFolder, cvWorkspaceStorageRoot,
  tokenUsageSchema, tokenCost, summarizeTokenUsage, auditArtifactSchema,
  sha256Bytes, auditFileName, auditDocumentNames } = require('../lib/cv-audit.js');

const id = '550e8400-e29b-41d4-a716-446655440000';
const job = { clientRequestId: id, company: 'ACME & Co. / LTD',
  designation: 'Senior Financial Analyst', location: 'Dublin, Ireland',
  originalJd: 'Reporting and financial planning with SQL and Power BI; collaborate with teams to improve process outcomes.' };

test('private job folder includes company, designation and location, with an immutable disambiguator', () => {
  assert.equal(cvWorkspaceInputSchema.safeParse(job).success, true);
  const folder = cvWorkspaceFolder(job.company, job.designation, job.location, id);
  assert.equal(folder, 'ACME Co LTD - Senior Financial Analyst - Dublin Ireland__' + id);
  assert.equal(cvWorkspaceStorageRoot('user_one', folder),
    'users/user_one/job-cv-workspaces/' + folder);
  assert.match(auditFileName(folder,id), / - CV v550e8400.docx$/);
  assert.throws(() => cvWorkspaceStorageRoot('../attacker', folder));
  assert.throws(() => cvWorkspaceFolder('A','B','C','../malicious'));
});

test('workspace rejects fake client owner and rejects missing JD', () => {
  assert.equal(cvWorkspaceInputSchema.safeParse({ ...job, uid: 'other-account' }).success, false);
  assert.equal(cvWorkspaceInputSchema.safeParse({ ...job, originalJd: '' }).success, false);
  assert.equal(cvWorkspaceInputSchema.safeParse({ ...job, clientRequestId: '../attack' }).success, false);
});

test('token counter totals actual provider-reported usage without guessing unknown cost', () => {
  const usage = {
    provider: 'openai', model: 'example-model-1', stage: 'profile_match', requestId: 'req-a',
    measurement: 'provider_reported', inputTokens: 1000, outputTokens: 200,
    totalTokens: 1200, cachedInputTokens: 100, reasoningOutputTokens: 25,
  };
  const parsed = tokenUsageSchema.parse(usage);
  assert.equal(tokenCost(parsed), null);
  const priced = { ...parsed, priceSnapshot: {
    inputUsdPerMillion: 2, outputUsdPerMillion: 8, cachedInputUsdPerMillion: 1,
    asOf: '2026-11-23T00:00:00Z', sourceUrl: 'https://example.org/official-model-pricing',
  } };
  assert.equal(tokenCost(priced), 0.0035);
  const totals = summarizeTokenUsage([parsed, priced]);
  assert.equal(totals.requests, 2);
  assert.equal(totals.totalTokens, 2400);
  assert.equal(totals.reasoningOutputTokens, 50);
  assert.equal(totals.estimatedUsd, 0.0035);
  assert.equal(totals.unpricedRequests, 1);
  assert.equal(totals.completeCostAvailable, false);
});

test('token breakdown rejects misleading counts or client-reported values', () => {
  const valid = {
    provider: 'google', model: 'example', stage: 'cv_draft', requestId: 'req-b',
    measurement: 'provider_reported', inputTokens: 100, outputTokens: 20, totalTokens: 120,
  };
  assert.equal(tokenUsageSchema.safeParse(valid).success, true);
  assert.equal(tokenUsageSchema.safeParse({ ...valid, measurement: 'estimated' }).success, false);
  assert.equal(tokenUsageSchema.safeParse({ ...valid, cachedInputTokens: 101 }).success, false);
  assert.equal(tokenUsageSchema.safeParse({ ...valid, reasoningOutputTokens: 21 }).success, false);
  assert.equal(tokenUsageSchema.safeParse({ ...valid, totalTokens: 30 }).success, false);
});

test('audit manifest is path-safe, version-aware and content-addressed', () => {
  const text = '{"kind":"test"}';
  const item = {
    id, category: 'jd_input', path: auditDocumentNames.originalJd,
    sha256: sha256Bytes(text), byteLength: Buffer.byteLength(text),
    contentType: 'application/json',
  };
  assert.equal(auditArtifactSchema.safeParse(item).success, true);
  assert.equal(auditArtifactSchema.safeParse({ ...item, path: '../../others/source.json' }).success, false);
  assert.equal(auditArtifactSchema.safeParse({ ...item, sha256: 'bad' }).success, false);
  assert.equal(sha256Bytes(text), sha256Bytes(Buffer.from(text)));
});
