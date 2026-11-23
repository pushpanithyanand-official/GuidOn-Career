const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanJobDescription, validateJdRequirements,
  validateAtsKeywordsAgainstJd, verifiedEvidenceIds, validateRecruiterEvidence } =
  require('../lib/cv-matching.js');
const { recruiterCategories } = require('../lib/cv-workflow.js');
const jobId = '550e8400-e29b-41d4-a716-446655440001';
const educationId = '550e8400-e29b-41d4-a716-446655440002';
const metricId = '550e8400-e29b-41d4-a716-446655440003';
const storyId = '550e8400-e29b-41d4-a716-446655440004';

test('JD cleaning is conservative and original is preserved for audit', () => {
  const original = 'Perform SQL analytics and report forecasts for finance planning.\r\n\r\n\r\n\r\n  Maintain high accuracy across teams.';
  const report = cleanJobDescription(original);
  assert.equal(report.originalText, original);
  assert.match(report.cleanedText, /Perform SQL analytics/);
  assert.match(report.cleanedText, /Maintain high accuracy/);
  assert.equal(report.confirmedByUser, false);
  assert.ok(report.cleanupNotes.length);
});

test('extracted requirements must quote actual cleaned JD text', () => {
  const jd = 'Required: financial modelling, SQL and Power BI. Experience delivering forecasts and preparing management reports.';
  const make = (text, quote) => ({
    id: jobId, text, directJdQuote: quote, priority: 'required', validation: 'unconfirmed_extraction',
  });
  const result = validateJdRequirements(jd, [
    make('SQL experience', 'SQL and Power BI'),
    make('CFA charterholder', 'CFA charterholder certification'),
  ]);
  assert.equal(result.grounded.length, 1);
  assert.equal(result.ungrounded.length, 1);
  const keywords = [
    { phrase: 'SQL', jdQuote: 'SQL and Power BI', importance: 'required' },
    { phrase: 'CFA', jdQuote: 'CFA certificate', importance: 'preferred' },
  ];
  assert.deepEqual(validateAtsKeywordsAgainstJd(jd, keywords).ungroundedKeywords, ['CFA']);
});

test('recruiter score evidence IDs cannot be invented by a model', () => {
  const profile = {
    experience: [{
      id: jobId, title: 'Analyst', employer: 'Example Employer',
      keyNumbers: [{
        id: metricId, label: 'Forecast accuracy uplift', value: 20, unit: '%',
        verification: 'user_confirmed',
      }],
      starStories: [{
        id: storyId, situation: 'Manual forecasting', task: 'Improve forecast accuracy',
        action: 'Built new reporting checks', result: 'Improved accuracy',
        linkedKeyNumberIds: [metricId], verification: 'user_confirmed',
      }],
    }],
    education: [{ id: educationId, institution: 'Example Uni', credential: 'MSc' }],
  };
  const verified = verifiedEvidenceIds(profile);
  assert.ok(verified.has(metricId));
  assert.ok(verified.has(storyId));
  assert.ok(verified.has(educationId));
  const criteria = recruiterCategories.map(category => ({
    category, rating: 3, rationale: 'Verified evidence', evidenceIds: [jobId],
  }));
  const assessment = { criteria, rubricVersion: 'recruiter-v1', evidenceBasis: 'confirmed_profile' };
  assert.equal(validateRecruiterEvidence(profile, assessment).supported, true);
  const fake = criteria.map((entry, i) => i === 0 ?
    { ...entry, evidenceIds: ['550e8400-e29b-41d4-a716-446655440099'] } : entry);
  assert.equal(validateRecruiterEvidence(profile, { ...assessment, criteria: fake }).supported, false);
});
