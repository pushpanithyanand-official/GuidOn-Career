const test = require('node:test');
const assert = require('node:assert/strict');
const { cvGenerationModeSchema, modeSelectionInputSchema, generationModePolicy,
 creativeSuggestionSchema, checkCreativeSuggestions } = require('../lib/cv-generation-mode.js');
const { generateCvTask } = require('../lib/cv-prompts.js');

const jobId = '550e8400-e29b-41d4-a716-446655440011';
const metricId = '550e8400-e29b-41d4-a716-446655440012';
const storyId = '550e8400-e29b-41d4-a716-446655440013';
const changeId = '550e8400-e29b-41d4-a716-446655440014';

const profile = { experience: [{
 id: jobId, employer: 'Real Employer', title: 'Tax Analyst',
 keyNumbers: [{ id: metricId, label:'Improved efficiency', value:25,
   unit:'%', verification:'user_confirmed' }],
 starStories: [{
   id: storyId, situation:'Manual task', task:'Improve process',
   action:'Automated reconciliation', result:'Reduced cycle time',
   linkedKeyNumberIds:[metricId], verification:'user_confirmed',
 }],
}] };

test('creative mode is explicitly chosen before CV preparation', () => {
 assert.deepEqual(cvGenerationModeSchema.options, ['evidence_first','think_creatively']);
 assert.equal(modeSelectionInputSchema.safeParse({
  workspaceId:jobId, modeChangeId:changeId, generationMode:'think_creatively',
  expectedStageVersion:0, acknowledgeFactPreservation:true,
 }).success, true);
 assert.equal(modeSelectionInputSchema.safeParse({
  workspaceId:jobId, modeChangeId:changeId, generationMode:'think_creatively',
  expectedStageVersion:0, acknowledgeFactPreservation:false,
 }).success, false);
 const policy = generationModePolicy('think_creatively');
 for (const phrase of ['real employer', 'official designation', 'user approval',
  'no-tables']) {
  assert.ok(policy.toLowerCase().includes(phrase), phrase);
 }
});

test('creative output can describe functional work but cannot replace real role identity', () => {
 const proposal = { kind:'functional_department_label', employmentId:jobId,
  evidenceIds:[jobId,storyId], proposedLabel:'Financial Operations & Transformation',
  isOfficialDepartment:false, reason:'Verified reporting and automation work',
  userApproved:false };
 assert.equal(creativeSuggestionSchema.safeParse(proposal).success,true);
 assert.equal(creativeSuggestionSchema.safeParse({
  ...proposal, isOfficialDepartment:true,
 }).success,false);
 assert.equal(creativeSuggestionSchema.safeParse({
  ...proposal, officialJobTitle:'Investment Banker',
 }).success,false);
 const checked = checkCreativeSuggestions(profile,[proposal]);
 assert.equal(checked.valid,true);
 assert.equal(checked.accepted[0].userApproved,false);
 assert.equal(checkCreativeSuggestions(profile,[{
  ...proposal, evidenceIds:['550e8400-e29b-41d4-a716-446655440099'],
 }]).valid,false);
});

test('creative reframe must cite confirmed STAR or metrics from the same job', () => {
 const accepted = checkCreativeSuggestions(profile,[{
  kind:'achievement_reframe', employmentId:jobId, evidenceIds:[storyId,metricId],
  oldText:'Prepared reports',
  proposedText:'Automated finance reports: reduced reporting cycle time',
  reason:'Emphasise verified impact', userApproved:true,
 }]);
 assert.equal(accepted.valid,true);
 const madeUp = checkCreativeSuggestions(profile,[{
  kind:'achievement_reframe', employmentId:jobId,
  evidenceIds:['550e8400-e29b-41d4-a716-446655440099'],
  oldText:'Prepared reports', proposedText:'Grew revenue by ten million',
  reason:'Invented impact', userApproved:true,
 }]);
 assert.equal(madeUp.valid,false);
});

test('same one-page and no-tables requirements apply in either generation mode', () => {
 const regular = generateCvTask({}, {}, 'JD', 'Feedback');
 const creative = generateCvTask({}, {}, 'JD', 'Feedback', 'think_creatively');
 assert.equal(regular.input.generationMode,'evidence_first');
 assert.equal(creative.input.generationMode,'think_creatively');
 for (const prompt of [regular, creative]) {
  assert.match(prompt.system,/NO TABLES/);
  assert.match(prompt.system,/ONE-PAGE/);
  assert.match(prompt.system,/confirmed profile revision/);
 }
 assert.match(creative.system,/FUNCTIONAL AREA/);
 assert.match(creative.system,/Do not replace the real employer/);
});
