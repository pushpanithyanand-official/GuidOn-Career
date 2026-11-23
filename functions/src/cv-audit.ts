import { createHash } from 'node:crypto';
import { z } from 'zod';

const part = z.string().trim().min(1).max(180);
const internalId = z.string().uuid();

export const cvWorkspaceInputSchema = z.object({
  clientRequestId: internalId,
  jobId: internalId.optional(),
  company: part,
  designation: part,
  location: part,
  sourceUrl: z.string().url().max(2000).optional(),
  originalJd: z.string().trim().min(50).max(120_000),
  baseCvId: z.string().regex(/^[A-Za-z0-9_-]{10,64}$/).optional(),
}).strict();

function safeComponent(source: string): string {
  const cleaned = source.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  return (cleaned.slice(0, 64).trim() || 'Unknown');
}

/** Human-readable per-application folder, with UUID to avoid overwriting a repeated role. */
export function cvWorkspaceFolder(company: string, designation: string, location: string, jobId: string): string {
  internalId.parse(jobId);
  return [
    safeComponent(company), safeComponent(designation), safeComponent(location),
  ].join(' - ') + '__' + jobId;
}

export function cvWorkspaceStorageRoot(uid: string, folder: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new Error('Unsafe user identity');
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,230}__[0-9a-fA-F-]{36}$/.test(folder)) {
    throw new Error('Unsafe workspace folder name');
  }
  return `users/${uid}/job-cv-workspaces/${folder}`;
}

export const auditDocumentNames = {
  originalJd: '01-jd/original.json',
  cleanedJd: '01-jd/cleaned.json',
  preCvMatching: '02-match/pre-cv-matching.json',
  gaps: '03-gaps/gaps.json',
  preCvScores: '03-gaps/pre-cv-scores.json',
  postCvScores: '05-cv/post-cv-scores.json',
} as const;

const stage = z.enum(['jd_review', 'profile_match', 'gap_review',
  'awaiting_user_feedback', 'cv_draft', 'post_cv_review',
  'revision_requested', 'ready_for_user_approval', 'approved']);

export const tokenUsageSchema = z.object({
  provider: z.enum(['openai', 'google', 'other']),
  model: z.string().trim().min(1).max(160),
  stage,
  cvVersionId: internalId.optional(),
  attemptId: internalId.optional(),
  outcome: z.enum(['succeeded', 'failed', 'cancelled']).default('succeeded'),
  requestId: z.string().trim().min(1).max(200),
  measurement: z.literal('provider_reported'),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative().optional(),
  reasoningOutputTokens: z.number().int().nonnegative().optional(),
  currency: z.literal('USD').default('USD'),
  // Model prices change; include a dated price snapshot, never assume an evergreen rate.
  priceSnapshot: z.object({
    inputUsdPerMillion: z.number().finite().nonnegative(),
    outputUsdPerMillion: z.number().finite().nonnegative(),
    cachedInputUsdPerMillion: z.number().finite().nonnegative().optional(),
    sourceUrl: z.string().url().max(1200),
    asOf: z.string().datetime({ offset: true }),
  }).strict().optional(),
}).strict().superRefine((usage, ctx) => {
  if (usage.cachedInputTokens && usage.cachedInputTokens > usage.inputTokens) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      path: ['cachedInputTokens'], message: 'Cached input tokens cannot exceed total input tokens.' });
  }
  if (usage.reasoningOutputTokens && usage.reasoningOutputTokens > usage.outputTokens) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      path: ['reasoningOutputTokens'], message: 'Reasoning tokens cannot exceed output tokens.' });
  }
  if (usage.totalTokens < usage.inputTokens + usage.outputTokens) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      path: ['totalTokens'], message: 'Total tokens cannot be less than input plus output.' });
  }
});

export type TokenUsage = z.infer<typeof tokenUsageSchema>;

export function tokenCost(usage: TokenUsage): number | null {
  const input = tokenUsageSchema.parse(usage);
  const prices = input.priceSnapshot;
  if (!prices) return null;
  if (input.cachedInputTokens && prices.cachedInputUsdPerMillion === undefined) return null;
  const cached = input.cachedInputTokens ?? 0;
  const uncached = input.inputTokens - cached;
  const cost = (uncached * prices.inputUsdPerMillion
    + cached * (prices.cachedInputUsdPerMillion ?? prices.inputUsdPerMillion)
    + input.outputTokens * prices.outputUsdPerMillion) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function summarizeTokenUsage(usage: readonly TokenUsage[]) {
  const tokens = { requests: usage.length, inputTokens: 0, outputTokens: 0,
    totalTokens: 0, cachedInputTokens: 0, reasoningOutputTokens: 0,
    estimatedUsd: 0, unpricedRequests: 0 };
  for (const value of usage) {
    const parsed = tokenUsageSchema.parse(value);
    tokens.inputTokens += parsed.inputTokens;
    tokens.outputTokens += parsed.outputTokens;
    tokens.totalTokens += parsed.totalTokens;
    tokens.cachedInputTokens += parsed.cachedInputTokens ?? 0;
    tokens.reasoningOutputTokens += parsed.reasoningOutputTokens ?? 0;
    const cost = tokenCost(parsed);
    if (cost === null) tokens.unpricedRequests += 1;
    else tokens.estimatedUsd += cost;
  }
  tokens.estimatedUsd = Math.round(tokens.estimatedUsd * 1_000_000) / 1_000_000;
  return { ...tokens, completeCostAvailable: tokens.unpricedRequests === 0 };
}

export function sha256Bytes(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export const auditArtifactSchema = z.object({
  id: internalId,
  category: z.enum(['jd_input', 'jd_cleaning', 'profile_snapshot', 'match',
    'gap_report', 'user_feedback', 'score_pre_cv', 'generation_input',
    'generation_output', 'cv_docx', 'cv_pdf', 'cv_text', 'render_qa',
    'score_post_cv', 'revision_request', 'user_approval', 'token_usage', 'cover_letter']),
  path: z.string().max(500).regex(/^[0-9]{2}-[a-z-]+\/[a-zA-Z0-9_.-]+$/),
  contentType: z.enum(['application/json', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf', 'text/plain']),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  byteLength: z.number().int().nonnegative().max(20_000_000),
  cvVersionId: internalId.optional(),
}).strict();

export function auditFileName(folder: string, versionId: string) {
  internalId.parse(versionId);
  return `${folder} - CV v${versionId.slice(0, 8)}.docx`;
}
