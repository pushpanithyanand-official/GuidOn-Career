const test = require('node:test');
const assert = require('node:assert/strict');
const { careerProfileSchema } = require('../lib/contracts.js');
const { scoreRawAtsKeywords, scoreRecruiterFit, recruiterCategories,
  canTransitionCvStage, gapFeedbackSchema, compactGapSchema,
  scoreSnapshotSchema, validateCvQuality } = require('../lib/cv-workflow.js');

const id = '550e8400-e29b-41d4-a716-446655440000';
const num = '550e8400-e29b-41d4-a716-446655440001';
const keyNumber = { id: num, label: 'Improved reporting efficiency', value: 25, unit: '%',
  context: 'Reporting workflow improvement', verification: 'user_confirmed' };
const star = { id, situation: 'Manual reporting was slow',
  task: 'Improve turnaround', action: 'Automated reconciliations',
  result: 'Reduced processing time', linkedKeyNumberIds: [num],
  verification: 'user_confirmed' };

test('employment and education each retain standalone key numbers and STAR evidence', () => {
  const profile = careerProfileSchema.parse({
    experience: [{ id, employer: 'Example Employer', title: 'Financial Analyst',
      keyNumbers: [keyNumber], starStories: [star] }],
    education: [{ id, institution: 'Example College', credential: 'MSc',
      keyNumbers: [keyNumber], starStories: [star] }],
  });
  assert.equal(profile.experience[0].keyNumbers[0].value, 25);
  assert.equal(profile.education[0].starStories[0].action, 'Automated reconciliations');
});

test('confirmed STAR stories require all four parts and cannot borrow a different job metric', () => {
  const missing = { ...star, result: undefined };
  assert.equal(careerProfileSchema.safeParse({ experience: [
    { id, employer: 'A', title: 'Analyst', keyNumbers: [keyNumber],
      starStories: [missing] }] }).success, false);
  assert.equal(careerProfileSchema.safeParse({ experience: [
    { id, employer: 'A', title: 'Analyst', keyNumbers: [],
      starStories: [star] }] }).success, false);
  assert.equal(careerProfileSchema.safeParse({ experience: [
    { id, employer: 'A', title: 'Analyst', keyNumbers: [keyNumber],
      starStories: [{ ...missing, verification: 'unconfirmed' }] }] }).success, true);
});

test('raw ATS is percentage of distinct JD keywords covered, not repeated mentions', () => {
  const keyword = phrase => ({ phrase, jdQuote: phrase, importance: 'required' });
  const scored = scoreRawAtsKeywords(
    [keyword('Power BI'), keyword('SQL'), keyword('power-bi'), keyword('Financial analysis')],
    'POWER BI; Power BI; SQL');
  assert.equal(scored.totalCount, 3);
  assert.equal(scored.matchedCount, 2);
  assert.equal(scored.score, 66.67);
  assert.deepEqual(scored.missing, ['Financial analysis']);
  assert.equal(scoreRawAtsKeywords([], 'anything').score, null);
});

test('recruiter fit uses evidence-backed, weighted criteria independently of ATS', () => {
  const criteria = recruiterCategories.map(category => ({
    category, rating: 3, rationale: 'Verified experience', evidenceIds: [id],
  }));
  const result = scoreRecruiterFit({ criteria, evidenceBasis: 'confirmed_profile', rubricVersion: 'recruiter-v1' });
  assert.equal(result.score, 75);
  assert.equal(result.status, 'scored');
  assert.equal(result.breakdown.length, 6);
  const incomplete = criteria.map((value, index) => index === 0 ?
    { ...value, rating: null, evidenceIds: [] } : value);
  assert.equal(scoreRecruiterFit({ criteria: incomplete,
    evidenceBasis: 'confirmed_profile', rubricVersion: 'recruiter-v1' }).score, null);
  assert.throws(() => scoreRecruiterFit({ criteria: criteria.map(value => ({ ...value, evidenceIds: [] })),
    evidenceBasis: 'rendered_cv', rubricVersion: 'recruiter-v1' }));
});

test('gap review must precede draft; user may revise after seeing both scores', () => {
  assert.equal(canTransitionCvStage('jd_review','profile_match'), true);
  assert.equal(canTransitionCvStage('profile_match','cv_draft'), false);
  assert.equal(canTransitionCvStage('awaiting_user_feedback','cv_draft'), true);
  assert.equal(canTransitionCvStage('post_cv_review','revision_requested'), true);
  assert.equal(canTransitionCvStage('revision_requested','cv_draft'), true);
  assert.equal(canTransitionCvStage('cv_draft','approved'), false);
  assert.equal(gapFeedbackSchema.safeParse({ acknowledged: false, userRequestedChanges: false }).success, false);
  assert.equal(gapFeedbackSchema.safeParse({ acknowledged: true, userRequestedChanges: true }).success, false);
  assert.equal(gapFeedbackSchema.safeParse({ acknowledged: true, userRequestedChanges: false }).success, true);
  assert.equal(compactGapSchema.safeParse({ id, kind: 'missing_profile_evidence',
    prompt: 'Can you confirm forecasting experience?' }).success, true);
  assert.equal(compactGapSchema.safeParse({ id, kind: 'missing_profile_evidence',
    prompt: Array(26).fill('experience').join(' ') }).success, false);
});

test('pre-CV and post-CV scores remain separate, linked to the CV version', () => {
  const pre = { timing: 'pre_cv', profileRevisionId: 'revision_0123456789012',
    rawAts: { score: 50, matchedCount: 5, totalCount: 10 },
    recruiterFit: { score: 72, rubricVersion: 'recruiter-v1' } };
  assert.equal(scoreSnapshotSchema.safeParse(pre).success, true);
  assert.equal(scoreSnapshotSchema.safeParse({ ...pre, timing: 'post_cv' }).success, false);
  assert.equal(scoreSnapshotSchema.safeParse({ ...pre, timing: 'post_cv',
    cvVersionId: 'version_0123456789012' }).success, true);
});

test('one-page rendering, aligned edges and STAR bullets are hard checks', () => {
  const clean = { pageCount: 1, leftEdgeMaxDriftPt: 0.5, rightEdgeMaxDriftPt: 0.5,
    minimumBodyFontPt: 10, starBulletsComplete: true, starBulletsWithinTwoLines: true,
    baseFormatReviewed: true, bodyText: 'Automated reporting: improved accuracy; saved 25% time.',
    inspectedFromRenderedOutput: true,
    inspectedDocxStructure: true,
    tableCount: 0, textBoxCount: 0, graphicsCount: 0,
    headerFooterTextCount: 0, columnCount: 1 };
  assert.equal(validateCvQuality(clean).passed, true);
  assert.ok(validateCvQuality({ ...clean, pageCount: 2 }).issues.includes('one_page_required'));
  assert.ok(validateCvQuality({ ...clean, leftEdgeMaxDriftPt: 2 }).issues.includes('unaligned_page_edges'));
  assert.ok(validateCvQuality({ ...clean, starBulletsWithinTwoLines: false }).issues.includes('star_bullet_too_long'));
});

test('single-column no-tables DOCX structure is required for valid CV QA', () => {
  const input = { pageCount: 1, leftEdgeMaxDriftPt: 0, rightEdgeMaxDriftPt: 0,
    minimumBodyFontPt: 11, starBulletsComplete: true, starBulletsWithinTwoLines: true,
    baseFormatReviewed: true, inspectedFromRenderedOutput: true, inspectedDocxStructure: true,
    bodyText: 'Analysed budgets: strengthened reporting; delivered accurate insights.',
    tableCount: 0, textBoxCount: 0, graphicsCount: 0, headerFooterTextCount: 0,
    columnCount: 1 };
  assert.equal(validateCvQuality(input).passed, true);
  assert.equal(validateCvQuality({ ...input, tableCount: 1 }).passed, false);
  assert.equal(validateCvQuality({ ...input, columnCount: 2 }).passed, false);
});
