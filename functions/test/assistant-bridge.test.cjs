const test = require('node:test');
const assert = require('node:assert/strict');
const { assistantJobCaptureSchema, currentPageAutofillPlanSchema,
  approvedCurrentPageFields, isNavigationOrSubmissionAction } = require('../lib/assistant-bridge.js');

const job = {
  clientRequestId:'550e8400-e29b-41d4-a716-446655440040',
  company:'Example Finance',designation:'Analyst',location:'Dublin, Ireland',
  originalJd:'Analyse lending opportunities, review financial statements, assess transaction risk and prepare clear written reports for stakeholders.',
  sourceUrl:'https://employer.example.test/job/123',
  skills:['Financial analysis'],
};

test('supported extension capture requires user review and private account handoff', () => {
  const valid = { sourceSurface:'chrome_extension', captureMethod:'visible_dom',
    userReviewed:true,consentToStore:true,job };
  assert.equal(assistantJobCaptureSchema.safeParse(valid).success,true);
  assert.equal(assistantJobCaptureSchema.safeParse({...valid,userReviewed:false}).success,false);
  assert.equal(assistantJobCaptureSchema.safeParse({...valid,uid:'another-account'}).success,false);
  assert.equal(assistantJobCaptureSchema.safeParse({...valid,sourceSurface:'web_share'}).success,false);
  assert.equal(assistantJobCaptureSchema.safeParse({...valid,sourceSurface:'web_share',captureMethod:'share_sheet'}).success,true);
});

test('autofill never includes unknown, sensitive or unapproved fields', () => {
  const evidence = '550e8400-e29b-41d4-a716-446655440050';
  const reviewed = { fieldKey:'email',fieldLabel:'Email',fieldType:'email',
    confidence:'verified_answer',value:'person@example.test',
    sourceEvidenceIds:[evidence],reviewedByUser:true,approvedForFill:true };
  const unresolved = { fieldKey:'sponsorship',fieldLabel:'Will you require sponsorship?',
    fieldType:'radio',confidence:'unknown',value:null,
    sourceEvidenceIds:[],reviewedByUser:false,approvedForFill:false };
  const plan = { planId:'550e8400-e29b-41d4-a716-446655440051',
    workspaceId:'550e8400-e29b-41d4-a716-446655440052',
    jobId:'550e8400-e29b-41d4-a716-446655440053',
    sourceSurface:'chrome_extension',
    currentPageUrl:'https://employer.example.test/apply/1',
    documentFingerprint:'a'.repeat(64),action:'fill_current_page_only',
    userConfirmedCurrentPage:true,answers:[reviewed,unresolved] };
  const passed = approvedCurrentPageFields(plan);
  assert.equal(passed.fillable.length,1);
  assert.equal(passed.unresolved.length,1);
  assert.equal(passed.mustNotNavigateOrSubmit,true);
  assert.equal(currentPageAutofillPlanSchema.safeParse({...plan,action:'submit'}).success,false);
  assert.equal(currentPageAutofillPlanSchema.safeParse({...plan,action:'next'}).success,false);
  assert.equal(currentPageAutofillPlanSchema.safeParse({...plan,sourceSurface:'web_share'}).success,false);
  assert.equal(currentPageAutofillPlanSchema.safeParse({...plan,answers:[
    {...unresolved,approvedForFill:true}] }).success,false);
  assert.equal(isNavigationOrSubmissionAction('submit'),true);
  assert.equal(isNavigationOrSubmissionAction('continue'),true);
});
