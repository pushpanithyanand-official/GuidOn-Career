import { z } from 'zod';
import { careerProfileSchema } from './contracts';

const text = (limit: number) => z.string().trim().min(1).max(limit);
export const userJobStatusSchema = z.enum([
  'discovered', 'interested', 'cv_preparing', 'cv_prepared',
  'applied', 'applied_connected', 'rejected', 'not_interested', 'snoozed',
]);
export type UserJobStatus = z.infer<typeof userJobStatusSchema>;

export const jobListingSchema = z.object({
  id: z.string().uuid(),
  company: text(200),
  designation: text(200),
  location: text(250),
  department: z.object({
    name: text(130),
    provenance: z.enum(['employer_verified', 'inferred_from_title', 'unknown']),
  }).strict().optional(),
  source: z.object({
    category: text(80),
    name: text(120),
    url: z.string().url().max(2000),
  }).strict(),
  discoveredAt: z.string().datetime({ offset: true }),
  postedAt: z.string().datetime({ offset: true }).optional(),
  summary: z.string().trim().max(3000).optional(),
  skills: z.array(text(100)).max(60).default([]),
  visaSponsorship: z.enum(['confirmed_yes', 'confirmed_no', 'unknown']).default('unknown'),
  salary: z.object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    minimum: z.number().finite().nonnegative().optional(),
    maximum: z.number().finite().nonnegative().optional(),
    period: z.enum(['hour', 'day', 'year']),
    provenance: z.enum(['employer_verified', 'inferred']),
  }).strict().optional(),
}).strict();

export const jobUserStateSchema = z.object({
  status: userJobStatusSchema.default('discovered'),
  favorite: z.boolean().default(false),
  version: z.number().int().nonnegative().default(0),
}).strict();

const multiValue = z.object({
  include: z.array(text(200)).max(50).default([]),
  exclude: z.array(text(200)).max(50).default([]),
}).strict();

export const jobFilterSchema = z.object({
  company: multiValue.default({ include: [], exclude: [] }),
  location: multiValue.default({ include: [], exclude: [] }),
  department: multiValue.default({ include: [], exclude: [] }),
  designation: multiValue.default({ include: [], exclude: [] }),
  discoveryCategory: multiValue.default({ include: [], exclude: [] }),
  statusPreset: z.enum(['active', 'all', 'excluded', 'cv_pipeline', 'applied', 'unapplied']).default('active'),
  statuses: z.array(userJobStatusSchema).max(9).optional(),
  favoritesOnly: z.boolean().default(false),
  search: z.string().trim().max(200).default(''),
  visa: z.enum(['all', 'confirmed_yes', 'confirmed_no', 'unknown']).default('all'),
}).strict();

export const jobSortSchema = z.enum([
  'smart_match', 'newest', 'oldest', 'company_az', 'designation_az', 'location_az',
  'recent_status_change',
]);
export const jobListRequestSchema = z.object({
  filters: jobFilterSchema.default({}),
  sort: jobSortSchema.default('smart_match'),
  page: z.number().int().min(1).max(100_000).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
}).strict();

export type JobListing = z.infer<typeof jobListingSchema>;
export type JobFilters = z.infer<typeof jobFilterSchema>;
export type JobListRequest = z.infer<typeof jobListRequestSchema>;
export type JobWithState = JobListing & {
  userState: z.infer<typeof jobUserStateSchema>;
  stateUpdatedAt?: string;
};
export type TargetProfile = z.infer<typeof careerProfileSchema>;

export function normalizeJobText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

function inMulti(value: string, values: z.infer<typeof multiValue>) {
  const key = normalizeJobText(value);
  const positives = new Set(values.include.map(normalizeJobText));
  const negatives = new Set(values.exclude.map(normalizeJobText));
  if (negatives.has(key)) return false; // Explicit exclusions always take precedence.
  return positives.size === 0 || positives.has(key);
}

export const activeJobStatuses = new Set<UserJobStatus>([
  'discovered', 'interested', 'cv_preparing', 'cv_prepared',
  'applied', 'applied_connected', 'snoozed',
]);

function matchesStatus(status: UserJobStatus, filters: JobFilters) {
  if (filters.statuses?.length) return filters.statuses.includes(status);
  switch (filters.statusPreset) {
    case 'active': return activeJobStatuses.has(status);
    case 'all': return true;
    case 'excluded': return status === 'rejected' || status === 'not_interested';
    case 'cv_pipeline': return status === 'cv_preparing' || status === 'cv_prepared';
    case 'applied': return status === 'applied' || status === 'applied_connected';
    case 'unapplied': return !['applied', 'applied_connected', 'rejected', 'not_interested'].includes(status);
  }
}

export function filterJobListings(rows: readonly JobWithState[], raw: unknown) {
  const filters = jobFilterSchema.parse(raw);
  const needle = normalizeJobText(filters.search);
  return rows.filter(row => {
    if (!matchesStatus(row.userState.status, filters)) return false;
    if (filters.favoritesOnly && !row.userState.favorite) return false;
    if (filters.visa !== 'all' && row.visaSponsorship !== filters.visa) return false;
    if (!inMulti(row.company, filters.company) ||
        !inMulti(row.location, filters.location) ||
        !inMulti(row.department?.name ?? 'Unknown', filters.department) ||
        !inMulti(row.designation, filters.designation) ||
        !inMulti(row.source.category, filters.discoveryCategory)) return false;
    return !needle || normalizeJobText([
      row.company, row.designation, row.location,
      row.department?.name ?? '', row.summary ?? '',
      row.skills.join(' '),
    ].join(' ')).includes(needle);
  });
}

const words = (value: string) => new Set(normalizeJobText(value).split(' ').filter(token => token.length >= 3));
function overlap(a: string, b: string): number {
  const as = words(a), bs = words(b);
  if (!as.size || !bs.size) return 0;
  let matched = 0;
  for (const token of as) if (bs.has(token)) matched++;
  return matched / Math.max(as.size, bs.size);
}

/**
 * Explainable listing ranking, separate from Recruiter Fit and Raw ATS.
 * Does not infer a user's eligibility, work permit or probability of interview.
 */
export function smartJobRank(job: JobListing, profile: TargetProfile | null, now: Date) {
  if (!profile) return { score: null as number | null, reasons: ['A confirmed career profile is needed for Smart Sort'] };
  let score = 0;
  const reasons: string[] = [];
  const title = normalizeJobText(job.designation);
  const roleFit = Math.max(0, ...profile.targetRoles.map(role =>
    title === normalizeJobText(role) ? 1 : overlap(job.designation, role)));
  if (roleFit > 0) {
    score += Math.round(roleFit * 40);
    reasons.push('Matches a target role');
  }
  const regionFit = profile.targetLocations.some(loc => {
    const target = normalizeJobText(loc), actual = normalizeJobText(job.location);
    return actual === target || (target.length >= 4 && actual.includes(target));
  });
  if (regionFit) { score += 20; reasons.push('Matches a target location'); }
  const skills = new Set(profile.skills.map(normalizeJobText));
  const matchedSkills = job.skills.filter(skill => skills.has(normalizeJobText(skill)));
  if (matchedSkills.length) {
    score += Math.min(matchedSkills.length * 5, 25);
    reasons.push('Matches confirmed profile skills');
  }
  const historyFit = Math.max(0, ...profile.experience.map(e => overlap(job.designation, e.title)));
  if (historyFit > 0) {
    score += Math.round(historyFit * 10);
    reasons.push('Relevant previous work');
  }
  // Freshness breaks ties; users can always choose chronological sort instead.
  const ageDays = (now.getTime() - Date.parse(job.postedAt ?? job.discoveredAt)) / 86_400_000;
  const freshness = Number.isFinite(ageDays) ? Math.max(0, 5 - Math.floor(Math.max(0, ageDays) / 7)) : 0;
  score += freshness;
  return { score: Math.min(score, 100), reasons };
}

export function sortJobListings(rows: readonly JobWithState[], method: z.infer<typeof jobSortSchema>,
  profile: TargetProfile | null, now = new Date()) {
  const rank = new Map(rows.map(row => [row.id, smartJobRank(row, profile, now)]));
  const newest = (row: JobWithState) => Date.parse(row.postedAt ?? row.discoveredAt);
  const comparison = (a: JobWithState, b: JobWithState) => {
    switch (method) {
      case 'smart_match':
        if (profile) {
          const diff = (rank.get(b.id)?.score ?? 0) - (rank.get(a.id)?.score ?? 0);
          if (diff) return diff;
        }
        return newest(b) - newest(a) || a.id.localeCompare(b.id);
      case 'newest': return newest(b) - newest(a) || a.id.localeCompare(b.id);
      case 'oldest': return newest(a) - newest(b) || a.id.localeCompare(b.id);
      case 'company_az': return a.company.localeCompare(b.company) || a.id.localeCompare(b.id);
      case 'designation_az': return a.designation.localeCompare(b.designation) || a.id.localeCompare(b.id);
      case 'location_az': return a.location.localeCompare(b.location) || a.id.localeCompare(b.id);
      case 'recent_status_change': return (Date.parse(b.stateUpdatedAt ?? b.discoveredAt) -
        Date.parse(a.stateUpdatedAt ?? a.discoveredAt)) || a.id.localeCompare(b.id);
    }
  };
  return [...rows].sort(comparison).map(row => ({
    ...row, smartMatch: rank.get(row.id)!,
  }));
}

export function getJobFilterFacets(rows: readonly JobWithState[]) {
  const values = (selector: (row: JobWithState) => string) =>
    [...new Set(rows.map(selector))].sort((a, b) => a.localeCompare(b));
  return {
    companies: values(row => row.company),
    locations: values(row => row.location),
    departments: values(row => row.department?.name ?? 'Unknown'),
    designations: values(row => row.designation),
    discoveryCategories: values(row => row.source.category),
    statuses: userJobStatusSchema.options,
  };
}

export function summarizeJobStatuses(rows: readonly JobWithState[]) {
  const count = (predicate: (row: JobWithState) => boolean) => rows.filter(predicate).length;
  return {
    discovery: count(row => row.userState.status === 'discovered'),
    cvPreparing: count(row => row.userState.status === 'cv_preparing'),
    cvPrepared: count(row => row.userState.status === 'cv_prepared'),
    applied: count(row => row.userState.status === 'applied'),
    appliedConnected: count(row => row.userState.status === 'applied_connected'),
    rejected: count(row => row.userState.status === 'rejected'),
    notInterested: count(row => row.userState.status === 'not_interested'),
    favorites: count(row => row.userState.favorite),
    active: count(row => activeJobStatuses.has(row.userState.status)),
  };
}
