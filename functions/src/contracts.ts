import { z } from 'zod';

export const MAX_BASE_CV_BYTES = 10 * 1024 * 1024;

export const cvUploadInput = z.object({
  fileName: z.string().trim().min(1).max(160),
  mimeType: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  sizeBytes: z.number().int().positive().max(MAX_BASE_CV_BYTES),
  // Separate storage permission from a future paid AI-extraction action.
  consentToStore: z.literal(true),
  // Required idempotency key: retrying a request must not double-charge a quota.
  clientRequestId: z.string().uuid(),
}).strict().superRefine((value, context) => {
  const name = value.fileName.toLowerCase();
  const expected = value.mimeType === 'application/pdf' ? '.pdf' : '.docx';
  if (!name.endsWith(expected)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['fileName'], message: 'File extension must match MIME type' });
  }
});

const short = z.string().trim().max(180);
const date = z.string().trim().max(30);

// Capture evidence at the source (employment/education), not just as CV wording.
// The value and unit remain separate so the AI never needs to invent a number.
export const keyNumberSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(180),
  value: z.number().finite(),
  unit: z.string().trim().min(1).max(35),
  context: z.string().trim().max(400).optional(),
  timeframe: z.string().trim().max(80).optional(),
  sourceNote: z.string().trim().max(500).optional(),
  verification: z.enum(['unconfirmed', 'user_confirmed']).default('unconfirmed'),
}).strict();

// STAR sections may remain partial drafts while the user enriches their profile.
// Only complete, explicitly confirmed stories may be used as verified CV evidence.
export const starStorySchema = z.object({
  id: z.string().uuid(),
  situation: z.string().trim().max(1000).optional(),
  task: z.string().trim().max(1000).optional(),
  action: z.string().trim().max(1500).optional(),
  result: z.string().trim().max(1500).optional(),
  linkedKeyNumberIds: z.array(z.string().uuid()).max(15).default([]),
  sourceNote: z.string().trim().max(500).optional(),
  verification: z.enum(['unconfirmed', 'user_confirmed']).default('unconfirmed'),
}).strict().superRefine((story, ctx) => {
  if (story.verification === 'user_confirmed') {
    for (const field of ['situation', 'task', 'action', 'result'] as const) {
      if (!story[field]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field],
          message: 'A confirmed STAR story must include Situation, Task, Action and Result.' });
      }
    }
  }
});

function checkStoryMetrics(
  value: { keyNumbers: { id: string }[]; starStories: { linkedKeyNumberIds: string[] }[] },
  ctx: z.RefinementCtx,
) {
  const availableIds = new Set(value.keyNumbers.map(metric => metric.id));
  for (const [index, story] of value.starStories.entries()) {
    for (const [position, id] of story.linkedKeyNumberIds.entries()) {
      if (!availableIds.has(id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom,
          path: ['starStories', index, 'linkedKeyNumberIds', position],
          message: 'STAR metric reference must belong to the same employment/education entry.' });
      }
    }
  }
}

export const experienceSchema = z.object({
  id: z.string().uuid(),
  employer: short,
  title: short,
  location: z.string().trim().max(200).optional(),
  startDate: date.optional(),
  endDate: date.optional(),
  current: z.boolean().optional(),
  highlights: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  keyNumbers: z.array(keyNumberSchema).max(40).default([]),
  starStories: z.array(starStorySchema).max(30).default([]),
}).strict().superRefine(checkStoryMetrics);

export const educationSchema = z.object({
  id: z.string().uuid(),
  institution: short,
  credential: short,
  fieldOfStudy: short.optional(),
  startDate: date.optional(),
  endDate: date.optional(),
  highlights: z.array(z.string().trim().min(1).max(400)).max(15).default([]),
  keyNumbers: z.array(keyNumberSchema).max(40).default([]),
  starStories: z.array(starStorySchema).max(30).default([]),
}).strict().superRefine(checkStoryMetrics);

export const projectSchema = z.object({
  id: z.string().uuid(),
  name: short,
  description: z.string().trim().max(2000),
  skills: z.array(short).max(30).default([]),
}).strict();

export const careerProfileSchema = z.object({
  legalName: short.optional(),
  contact: z.object({
    email: z.string().trim().email().max(254).optional(),
    phone: z.string().trim().max(40).optional(),
    city: short.optional(),
    country: short.optional(),
  }).strict().optional(),
  certifications: z.array(z.object({
    id: z.string().uuid(),
    name: short,
    issuer: short.optional(),
    issueDate: date.optional(),
    expiryDate: date.optional(),
  }).strict()).max(60).default([]),
  languages: z.array(z.object({
    name: short,
    level: z.enum(['basic', 'conversational', 'professional', 'fluent', 'native', 'unspecified']).default('unspecified'),
  }).strict()).max(30).default([]),
  workEligibility: z.array(z.object({
    country: z.string().trim().min(2).max(120),
    authorisedNow: z.enum(['yes', 'no', 'unknown']),
    sponsorshipNow: z.enum(['yes', 'no', 'unknown']),
    sponsorshipFuture: z.enum(['yes', 'no', 'unknown']),
    permitType: short.optional(),
    expiryDate: date.optional(),
    lastConfirmedOn: date.optional(),
  }).strict()).max(20).default([]),
  careerPreferences: z.object({
    workModes: z.array(z.enum(['remote', 'hybrid', 'onsite'])).max(3).default([]),
    relocation: z.enum(['yes', 'no', 'discuss', 'unknown']).default('unknown'),
    availabilityDate: date.optional(),
    noticePeriod: short.optional(),
    salaryCurrency: z.string().trim().regex(/^[A-Z]{3}$/).optional(),
    salaryMinimum: z.number().finite().nonnegative().max(100000000).optional(),
    salaryMaximum: z.number().finite().nonnegative().max(100000000).optional(),
  }).strict().optional(),
  achievements: z.array(z.object({
    id: z.string().uuid(),
    statement: z.string().trim().min(1).max(1000),
    evidenceNote: z.string().trim().max(1200).optional(),
  }).strict()).max(100).default([]),

  displayName: short.optional(),
  headline: z.string().trim().max(300).optional(),
  professionalSummary: z.string().trim().max(4000).optional(),
  location: z.string().trim().max(200).optional(),
  linkedInUrl: z.string().trim().url().max(500).optional(),
  websiteUrl: z.string().trim().url().max(500).optional(),
  skills: z.array(short).max(150).default([]),
  targetRoles: z.array(short).max(30).default([]),
  targetLocations: z.array(short).max(30).default([]),
  experience: z.array(experienceSchema).max(60).default([]),
  education: z.array(educationSchema).max(40).default([]),
  projects: z.array(projectSchema).max(60).default([]),
}).strict();

export const confirmProfileInput = z.object({
  profile: careerProfileSchema,
  // Explicit, user-triggered confirmation. Extraction output by itself is never verified.
  userConfirmed: z.literal(true),
  // Null for first confirmation. Later edits must provide the current revision.
  expectedRevisionId: z.string().regex(/^[A-Za-z0-9_-]{10,64}$/).nullable().optional(),
  sourceCvId: z.string().regex(/^[A-Za-z0-9_-]{10,64}$/).nullable().optional(),
}).strict();

export const saveProfileDraftInput = z.object({
  profile: careerProfileSchema,
  sourceCvId: z.string().regex(/^[A-Za-z0-9_-]{10,64}$/).nullable().optional(),
}).strict();

export const profileHistoryInput = z.object({
  limit: z.number().int().min(1).max(20).default(10),
}).strict();

export const completeCvInput = z.object({
  uploadId: z.string().regex(/^[A-Za-z0-9_-]{10,64}$/),
}).strict();

export type CareerProfile = z.infer<typeof careerProfileSchema>;
export type CvUploadRequest = z.infer<typeof cvUploadInput>;

export function cvStoragePath(uid: string, uploadId: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid) || !/^[A-Za-z0-9_-]{10,64}$/.test(uploadId)) {
    throw new Error('Unsafe upload storage path');
  }
  return `users/${uid}/base-cvs/${uploadId}/original`;
}

export function cvTypeForName(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  if (normalized.endsWith('.pdf')) return 'application/pdf';
  if (normalized.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return null;
}
