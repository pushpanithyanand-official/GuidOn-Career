import { z } from 'zod';
import { suppliedJobSchema } from './manual-jobs-api';

/**
 * Unified device handoff contract: desktop Chrome extension now, native
 * Android Preparation Browser later. A PWA alone cannot run this DOM adapter
 * inside third-party sites.
 */
export const assistantSurfaceSchema = z.enum([
  'chrome_extension', 'android_preparation_browser', 'web_share',
]);

export const assistantJobCaptureSchema = z.object({
  sourceSurface: assistantSurfaceSchema,
  captureMethod: z.enum(['visible_dom', 'user_paste', 'share_sheet']),
  userReviewed: z.literal(true),
  consentToStore: z.literal(true),
  job: suppliedJobSchema,
}).strict().superRefine((input, ctx) => {
  if (input.sourceSurface === 'web_share' && input.captureMethod === 'visible_dom') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['captureMethod'],
      message: 'A PWA share sheet does not have access to another website DOM.' });
  }
  if (!input.job.sourceUrl && !input.job.originalJd) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['job'],
      message: 'Capture requires a source URL or sufficient visible JD text.' });
  }
});

export const assistedAnswerSchema = z.object({
  fieldKey: z.string().trim().min(1).max(150).regex(/^[A-Za-z0-9_.:-]+$/),
  fieldLabel: z.string().trim().min(1).max(300),
  fieldType: z.enum(['text', 'email', 'tel', 'textarea', 'number', 'select', 'radio', 'checkbox']),
  sourceEvidenceIds: z.array(z.string().uuid()).max(20).default([]),
  confidence: z.enum(['verified_answer', 'contextual_suggestion', 'unknown', 'sensitive']),
  value: z.union([z.string().max(2500), z.boolean(), z.number().finite()]).nullable(),
  reviewedByUser: z.boolean().default(false),
  approvedForFill: z.boolean().default(false),
}).strict().superRefine((answer, ctx) => {
  if (answer.confidence !== 'verified_answer' && answer.approvedForFill) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['approvedForFill'],
      message: 'Unverified, inferred or sensitive answers cannot be auto-filled.' });
  }
  if (answer.approvedForFill && (!answer.reviewedByUser || answer.value === null ||
       answer.sourceEvidenceIds.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['approvedForFill'],
      message: 'Only reviewed, evidenced, non-null answers may be filled.' });
  }
});

export const currentPageAutofillPlanSchema = z.object({
  planId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  jobId: z.string().uuid(),
  sourceSurface: z.enum(['chrome_extension', 'android_preparation_browser']),
  // Exact page identity. Client must compare it with current tab URL and a
  // fresh DOM fingerprint; a plan cannot be re-used on the next page.
  currentPageUrl: z.string().url().max(2000),
  documentFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  action: z.literal('fill_current_page_only'),
  userConfirmedCurrentPage: z.literal(true),
  answers: z.array(assistedAnswerSchema).max(100),
}).strict();

export function approvedCurrentPageFields(raw: unknown) {
  const input = currentPageAutofillPlanSchema.parse(raw);
  return {
    action: 'fill_current_page_only' as const,
    currentPageUrl: input.currentPageUrl,
    documentFingerprint: input.documentFingerprint,
    fillable: input.answers
      .filter(answer => answer.approvedForFill && answer.confidence === 'verified_answer')
      .map(({ fieldKey, fieldType, value }) => ({ fieldKey, fieldType, value })),
    unresolved: input.answers.filter(answer => !answer.approvedForFill)
      .map(answer => ({ fieldKey: answer.fieldKey, label: answer.fieldLabel,
        confidence: answer.confidence })),
    mustNotNavigateOrSubmit: true as const,
  };
}

export const assistantEventSchema = z.object({
  eventId: z.string().uuid(),
  jobId: z.string().uuid(),
  kind: z.enum(['capture_reviewed', 'cv_requested', 'cv_selected',
    'autofill_plan_reviewed', 'current_page_filled', 'candidate_marked_applied']),
  sourceSurface: assistantSurfaceSchema,
  occurredAt: z.string().datetime({ offset: true }),
}).strict();

export function isNavigationOrSubmissionAction(action: string) {
  return ['next', 'continue', 'submit', 'auto_submit', 'navigate', 'advance_step'].includes(action);
}
