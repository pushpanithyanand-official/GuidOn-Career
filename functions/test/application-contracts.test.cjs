const test = require('node:test');
const assert = require('node:assert/strict');
const { createApplicationSchema, applicationStatusUpdateSchema,
  applicationStatusSchema } = require('../lib/application-contracts.js');

const ids = {
  jobId: '550e8400-e29b-41d4-a716-446655440080',
  eventId: '550e8400-e29b-41d4-a716-446655440081',
  cvWorkspaceId: '550e8400-e29b-41d4-a716-446655440082',
  cvVersionId: '550e8400-e29b-41d4-a716-446655440083',
};

test('recording Applied requires a user-confirmed true submission', () => {
  const valid = {...ids, status:'submitted', userConfirmed:true};
  assert.equal(createApplicationSchema.safeParse(valid).success,true);
  assert.equal(createApplicationSchema.safeParse({...valid,userConfirmed:false}).success,false);
  assert.equal(createApplicationSchema.safeParse({...valid,uid:'somebody_else'}).success,false);
  assert.equal(createApplicationSchema.safeParse({...valid,submittedOn:'tomorrow'}).success,false);
  assert.equal(createApplicationSchema.safeParse({...valid,cvWorkspaceId:undefined}).success,false);
  assert.equal(createApplicationSchema.safeParse({
    ...valid,status:'preparing',submittedOn:'2026-11-23',
  }).success,false);
});

test('application timelines support interview dates but never mail-derived auto states', () => {
  const result = applicationStatusUpdateSchema.safeParse({
    applicationId:ids.jobId,eventId:ids.eventId,expectedVersion:1,
    status:'interview_scheduled',userConfirmed:true,
    interview:{startsAt:'2026-12-02T13:00:00+00:00',timezone:'Europe/Dublin'},
  });
  assert.equal(result.success,true);
  assert.equal(applicationStatusUpdateSchema.safeParse({
    applicationId:ids.jobId,eventId:ids.eventId,expectedVersion:1,
    status:'interview_scheduled',userConfirmed:false,
  }).success,false);
  assert.equal(applicationStatusUpdateSchema.safeParse({
    applicationId:ids.jobId,eventId:ids.eventId,expectedVersion:1,
    status:'rejected',userConfirmed:true,
    interview:{startsAt:'2026-12-02T13:00:00+00:00',timezone:'Europe/Dublin'},
  }).success,false);
  assert.ok(applicationStatusSchema.options.includes('offer_received'));
  assert.equal(applicationStatusSchema.safeParse('email_inferred_offer').success,false);
});
