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
}).strict().superRefine((value, context) => {
  const name = value.fileName.toLowerCase();
  const expected = value.mimeType === 'application/pdf' ? '.pdf' : '.docx';
  if (!name.endsWith(expected)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['fileName'], message: 'File extension must match MIME type' });
  }
});

const short = z.string().trim().max(180);
const date = z.string().trim().max(30);

export const experienceSchema = z.object({
  id: z.string().uuid(),
  employer: short,
  title: short,
  location: z.string().trim().max(200).optional(),
  startDate: date.optional(),
  endDate: date.optional(),
  current: z.boolean().optional(),
  highlights: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
}).strict();

export const educationSchema = z.object({
  id: z.string().uuid(),
  institution: short,
  credential: short,
  fieldOfStudy: short.optional(),
  startDate: date.optional(),
  endDate: date.optional(),
  highlights: z.array(z.string().trim().min(1).max(400)).max(15).default([]),
}).strict();

export const projectSchema = z.object({
  id: z.string().uuid(),
  name: short,
  description: z.string().trim().max(2000),
  skills: z.array(short).max(30).default([]),
}).strict();

export const careerProfileSchema = z.object({
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
  sourceCvId: z.string().regex(/^[A-Za-z0-9_-]{10,64}$/).nullable().optional(),
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
