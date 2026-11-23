import { z } from 'zod';

/** Application history is a distinct entity from job-list favorites and CV preparation. */
export const applicationStatusSchema = z.enum([
  'preparing', 'submitted', 'in_review', 'assessment_requested',
  'interview_invited', 'interview_scheduled', 'interview_completed',
  'offer_received', 'rejected', 'withdrawn',
]);

export const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  eventId: z.string().uuid(),
  status: z.enum(['preparing', 'submitted']),
  userConfirmed: z.literal(true),
  submittedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cvWorkspaceId: z.string().uuid().optional(),
  cvVersionId: z.string().uuid().optional(),
  employerApplicationId: z.string().trim().max(150).optional(),
  note: z.string().trim().max(2000).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.cvVersionId && !value.cvWorkspaceId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cvWorkspaceId'],
      message: 'A selected CV version must have a matching CV workspace.' });
  }
  if (value.status === 'preparing' && value.submittedOn) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['submittedOn'],
      message: 'Do not invent a submission date for an application still in preparation.' });
  }
});

export const applicationStatusUpdateSchema = z.object({
  applicationId: z.string().uuid(),
  eventId: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  status: applicationStatusSchema,
  userConfirmed: z.literal(true),
  note: z.string().trim().max(2000).optional(),
  // Do not guess date, timezone or meeting URL from email; this API is manual only.
  interview: z.object({
    startsAt: z.string().datetime({ offset: true }),
    timezone: z.string().trim().min(3).max(100),
    meetingUrl: z.string().url().max(2000).optional(),
    round: z.string().trim().max(120).optional(),
  }).strict().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.interview && value.status !== 'interview_scheduled') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['interview'],
      message: 'Interview appointment details may only accompany an interview-scheduled event.' });
  }
});

export const listApplicationsInput = z.object({
  limit: z.number().int().min(1).max(100).default(50),
}).strict();

export const applicationHistoryInput = z.object({
  applicationId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
}).strict();

export const statusLabels: Record<z.infer<typeof applicationStatusSchema>, string> = {
  preparing: 'Preparing',
  submitted: 'Submitted',
  in_review: 'In Review',
  assessment_requested: 'Assessment Requested',
  interview_invited: 'Interview Invited',
  interview_scheduled: 'Interview Scheduled',
  interview_completed: 'Interview Completed',
  offer_received: 'Offer Received',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};
