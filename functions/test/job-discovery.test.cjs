const test = require('node:test');
const assert = require('node:assert/strict');
const { careerProfileSchema } = require('../lib/contracts.js');
const {
 jobListingSchema, jobFilterSchema, jobUserStateSchema, filterJobListings,
 sortJobListings, smartJobRank, summarizeJobStatuses, getJobFilterFacets,
 userJobStatusSchema,
} = require('../lib/job-discovery.js');

const ids = [
 '550e8400-e29b-41d4-a716-446655440021',
 '550e8400-e29b-41d4-a716-446655440022',
 '550e8400-e29b-41d4-a716-446655440023',
 '550e8400-e29b-41d4-a716-446655440024',
];

function makeJob(id, company, designation, location, dept, source, status = 'discovered',
  favorite = false, postedAt = '2026-11-10T08:00:00Z', skills = []) {
  return {
    ...jobListingSchema.parse({
      id, company, designation, location,
      department: { name: dept, provenance: 'inferred_from_title' },
      source: { category: source, name: source, url: 'https://jobs.example.com/listing' },
      discoveredAt: '2026-11-10T08:00:00Z', postedAt, skills,
    }),
    userState: jobUserStateSchema.parse({ status, favorite }),
  };
}
const rows = [
 makeJob(ids[0], 'Delta Finance', 'Financial Analyst', 'Dublin, Ireland',
   'Finance', 'Employer ATS', 'interested', true, '2026-11-13T08:00:00Z', ['SQL', 'Power BI']),
 makeJob(ids[1], 'Alpha Firm', 'Tax Adviser', 'Cork, Ireland',
   'Tax', 'Linked Job Link', 'not_interested', false, '2026-11-20T08:00:00Z', ['Tax']),
 makeJob(ids[2], 'Beacon', 'Credit Analyst', 'Dublin, Ireland',
   'Credit', 'Employer ATS', 'cv_prepared', false, '2026-11-21T08:00:00Z', ['Excel']),
 makeJob(ids[3], 'Delta Finance', 'Financial Analyst', 'Belfast, UK',
   'Finance', 'Linked Job Link', 'applied_connected', true, '2026-11-22T08:00:00Z', ['SQL']),
];

test('status labels are canonical and favourites are independent of application state', () => {
 assert.deepEqual(userJobStatusSchema.options, [
  'discovered', 'interested', 'cv_preparing', 'cv_prepared',
  'applied', 'applied_connected', 'rejected', 'not_interested', 'snoozed',
 ]);
 assert.equal(filterJobListings(rows, {}).length, 3);
 assert.equal(filterJobListings(rows, { statusPreset: 'all' }).length, 4);
 assert.equal(filterJobListings(rows, { statusPreset: 'excluded' }).length, 1);
 assert.equal(filterJobListings(rows, { statusPreset: 'applied' }).length, 1);
 assert.equal(filterJobListings(rows, { statusPreset: 'cv_pipeline' }).length, 1);
 assert.equal(filterJobListings(rows, { favoritesOnly: true }).length, 2);
 assert.deepEqual(summarizeJobStatuses(rows).favorites, 2);
 assert.deepEqual(summarizeJobStatuses(rows).appliedConnected, 1);
});

test('multi-select include/exclude filters apply to entire job set and exclusions win', () => {
 const jobs = filterJobListings(rows, {
  statusPreset: 'all',
  company: { include: ['Delta Finance'], exclude: ['Alpha Firm'] },
  location: { include: ['Dublin, Ireland'], exclude: [] },
  department: { include: ['Finance'], exclude: ['Credit'] },
  designation: { include: ['Financial Analyst'], exclude: [] },
  discoveryCategory: { include: ['Employer ATS'], exclude: [] },
 });
 assert.deepEqual(jobs.map(x => x.id), [ids[0]]);
 const hidden = filterJobListings(rows, { statusPreset: 'all',
  company: { include: ['Delta Finance'], exclude: ['Delta Finance'] },
 });
 assert.equal(hidden.length, 0);
 const facets = getJobFilterFacets(rows);
 assert.deepEqual(facets.companies, ['Alpha Firm','Beacon','Delta Finance']);
 assert.ok(facets.discoveryCategories.includes('Employer ATS'));
});

test('smart sort uses confirmed profile goals and does not assert recruiter or ATS scores', () => {
 const profile = careerProfileSchema.parse({
  targetRoles: ['Financial Analyst'],
  targetLocations: ['Dublin'],
  skills: ['SQL', 'Power BI'],
  experience: [{ id: ids[0], title: 'Finance Analyst', employer: 'Example' }],
 });
 const ranked = sortJobListings(rows, 'smart_match', profile, new Date('2026-11-23T10:00:00Z'));
 assert.equal(ranked[0].id, ids[0]);
 assert.ok(ranked[0].smartMatch.score > ranked[1].smartMatch.score);
 assert.ok(ranked[0].smartMatch.reasons.includes('Matches a target role'));
 assert.equal('recruiterFit' in ranked[0].smartMatch, false);
 const newestFallback = sortJobListings(rows, 'smart_match', null, new Date('2026-11-23T10:00:00Z'));
 assert.equal(newestFallback[0].id, ids[3]);
 assert.equal(newestFallback[0].smartMatch.score, null);
});

test('search and sources are independent from application status and profile sorting', () => {
 assert.deepEqual(filterJobListings(rows, { statusPreset:'all', search:'power bi' })
  .map(job => job.id), [ids[0]]);
 assert.equal(filterJobListings(rows, { statusPreset:'all', visa:'confirmed_yes' }).length, 0);
 assert.deepEqual(sortJobListings(rows, 'company_az', null).map(job => job.company),
  ['Alpha Firm','Beacon','Delta Finance','Delta Finance']);
 assert.equal(jobFilterSchema.parse({}).statusPreset,'active');
 assert.equal(smartJobRank(rows[0], null, new Date()).score, null);
});

test('invalid filter extras and invented department verification are rejected', () => {
 assert.equal(jobFilterSchema.safeParse({ uid: 'another-account' }).success, false);
 assert.equal(jobListingSchema.safeParse({
  ...rows[0], userState: undefined,
  department: { name: 'Finance', provenance: 'verified_without_source' },
 }).success, false);
});
