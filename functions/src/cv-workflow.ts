import { z } from 'zod';

/** Versioned contracts for a staged CV workflow, independent of any UI framework. */
export const cvWorkflowStages = [
  'jd_review',
  'profile_match',
  'gap_review',
  'awaiting_user_feedback',
  'cv_draft',
  'post_cv_review',
  'revision_requested',
  'ready_for_user_approval',
  'approved',
] as const;

export const cvWorkflowStageSchema = z.enum(cvWorkflowStages);

const transitions: Record<(typeof cvWorkflowStages)[number], readonly (typeof cvWorkflowStages)[number][]> = {
  jd_review: ['profile_match'],
  profile_match: ['gap_review'],
  gap_review: ['awaiting_user_feedback'],
  awaiting_user_feedback: ['cv_draft', 'gap_review'],
  cv_draft: ['post_cv_review'],
  post_cv_review: ['revision_requested', 'ready_for_user_approval'],
  revision_requested: ['cv_draft'],
  ready_for_user_approval: ['approved', 'revision_requested'],
  approved: ['revision_requested'],
};

export function canTransitionCvStage(from: string, to: string): boolean {
  return cvWorkflowStageSchema.safeParse(from).success &&
    cvWorkflowStageSchema.safeParse(to).success &&
    transitions[from as keyof typeof transitions].includes(to as (typeof cvWorkflowStages)[number]);
}

export const jobDescriptionSchema = z.object({
  sourceUrl: z.string().url().max(2000).optional(),
  originalText: z.string().trim().min(50).max(120_000),
  cleanedText: z.string().trim().min(50).max(120_000),
  cleanupNotes: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  confirmedByUser: z.boolean().default(false),
}).strict();

export const keywordSchema = z.object({
  phrase: z.string().trim().min(2).max(120),
  importance: z.enum(['required', 'preferred']).default('required'),
  jdQuote: z.string().trim().min(2).max(500),
}).strict();

export const compactGapSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['missing_profile_evidence', 'actual_skill_gap', 'eligibility_question', 'cv_visibility_gap']),
  // Strictly brief presentation; underlying details can live elsewhere.
  prompt: z.string().trim().min(3).max(180).refine(v => v.split(/\s+/).length <= 25, 'Gap prompt must be 25 words or fewer.'),
  evidenceIds: z.array(z.string().uuid()).max(10).default([]),
  resolution: z.enum(['unresolved', 'answered', 'not_applicable']).default('unresolved'),
}).strict();

export const gapFeedbackSchema = z.object({
  acknowledged: z.literal(true),
  comment: z.string().trim().max(3000).default(''),
  userRequestedChanges: z.boolean(),
  confirmedFactIds: z.array(z.string().uuid()).max(50).default([]),
}).strict().superRefine((v, ctx) => {
  if (v.userRequestedChanges && !v.comment) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['comment'], message: 'A comment is required when requesting changes.' });
  }
});

// Canonical Recruiter Fit weighting. A rubric, not an external hiring prediction.
export const recruiterCategories = [
  'relevant_experience', 'achievements', 'skills', 'seniority',
  'education_and_qualifications', 'work_eligibility',
] as const;
export const recruiterWeights: Record<(typeof recruiterCategories)[number], number> = {
  relevant_experience: 30,
  achievements: 20,
  skills: 20,
  seniority: 15,
  education_and_qualifications: 10,
  work_eligibility: 5,
};

export const recruiterCriterionSchema = z.object({
  category: z.enum(recruiterCategories),
  rating: z.number().int().min(0).max(4).nullable(),
  rationale: z.string().trim().max(500),
  evidenceIds: z.array(z.string().uuid()).max(30).default([]),
}).strict().superRefine((entry, ctx) => {
  if (entry.rating !== null && entry.rating > 0 && entry.evidenceIds.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['evidenceIds'],
      message: 'A positive recruiter-fit rating requires verified evidence references.' });
  }
});

export const recruiterAssessmentSchema = z.object({
  criteria: z.array(recruiterCriterionSchema).length(recruiterCategories.length),
  evidenceBasis: z.enum(['confirmed_profile', 'rendered_cv']),
  rubricVersion: z.literal('recruiter-v1').default('recruiter-v1'),
}).strict().superRefine((assessment, ctx) => {
  const unique = new Set(assessment.criteria.map(criterion => criterion.category));
  if (unique.size !== recruiterCategories.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['criteria'],
      message: 'All six recruiter categories must be assessed once, without duplicates.' });
  }
});

function tokens(text: string): string[] {
  return text.normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
}
function normalise(text: string) { return tokens(text).join(' '); }

export function scoreRawAtsKeywords(keywords: readonly z.infer<typeof keywordSchema>[], documentText: string) {
  const distinct = new Map<string, z.infer<typeof keywordSchema>>();
  for (const raw of keywords) {
    const keyword = keywordSchema.parse(raw);
    const key = normalise(keyword.phrase);
    if (key && !distinct.has(key)) distinct.set(key, keyword);
  }
  const haystack = ` ${normalise(documentText)} `;
  const matched: string[] = [];
  const missing: string[] = [];
  for (const [normalised, keyword] of distinct) {
    const found = haystack.includes(` ${normalised} `);
    (found ? matched : missing).push(keyword.phrase);
  }
  const total = distinct.size;
  return {
    method: 'raw-ats-distinct-keywords-v1' as const,
    score: total === 0 ? null : Math.round((matched.length / total) * 10000) / 100,
    matchedCount: matched.length,
    totalCount: total,
    matched,
    missing,
    status: total === 0 ? 'insufficient_data' as const : 'scored' as const,
  };
}

export function scoreRecruiterFit(input: z.infer<typeof recruiterAssessmentSchema>) {
  const assessment = recruiterAssessmentSchema.parse(input);
  const unresolved = assessment.criteria.filter(item => item.rating === null).map(item => item.category);
  if (unresolved.length) {
    return { method: 'recruiter-v1' as const, score: null, status: 'needs_review' as const, unresolved };
  }
  const weighted = assessment.criteria.reduce((sum, criterion) =>
    sum + (criterion.rating! / 4) * recruiterWeights[criterion.category], 0);
  return {
    method: 'recruiter-v1' as const,
    score: Math.round(weighted * 100) / 100,
    status: 'scored' as const,
    unresolved: [] as string[],
    evidenceBasis: assessment.evidenceBasis,
    breakdown: assessment.criteria.map(criterion => ({
      category: criterion.category,
      rating: criterion.rating,
      weight: recruiterWeights[criterion.category],
      evidenceIds: criterion.evidenceIds,
      rationale: criterion.rationale,
    })),
  };
}

export const scoreSnapshotSchema = z.object({
  timing: z.enum(['pre_cv', 'post_cv']),
  profileRevisionId: z.string().min(10).max(64),
  cvVersionId: z.string().min(10).max(64).optional(),
  rawAts: z.object({
    score: z.number().min(0).max(100).nullable(),
    matchedCount: z.number().int().nonnegative(),
    totalCount: z.number().int().nonnegative(),
  }).strict(),
  recruiterFit: z.object({
    score: z.number().min(0).max(100).nullable(),
    rubricVersion: z.literal('recruiter-v1'),
  }).strict(),
}).strict().superRefine((snapshot, ctx) => {
  if (snapshot.timing === 'post_cv' && !snapshot.cvVersionId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cvVersionId'],
      message: 'Post-CV scores must be tied to the actual saved CV version.' });
  }
});

export const cvQualityInputSchema = z.object({
  // Measurements must come from a server-side actual document render/inspection, not AI prose.
  pageCount: z.number().int().nonnegative(),
  leftEdgeMaxDriftPt: z.number().finite().nonnegative(),
  rightEdgeMaxDriftPt: z.number().finite().nonnegative(),
  minimumBodyFontPt: z.number().finite().nonnegative(),
  starBulletsComplete: z.boolean(),
  starBulletsWithinTwoLines: z.boolean(),
  baseFormatReviewed: z.boolean(),
  bodyText: z.string().max(30_000),
  inspectedFromRenderedOutput: z.literal(true),
  // Independently inspected from the generated DOCX OpenXML, not guessed from PDF.
  inspectedDocxStructure: z.literal(true),
  tableCount: z.number().int().nonnegative(),
  textBoxCount: z.number().int().nonnegative(),
  graphicsCount: z.number().int().nonnegative(),
  headerFooterTextCount: z.number().int().nonnegative(),
  columnCount: z.number().int().min(1),
}).strict();

export function validateCvQuality(raw: z.infer<typeof cvQualityInputSchema>) {
  const report = cvQualityInputSchema.parse(raw);
  const issues: string[] = [];
  if (report.pageCount !== 1) issues.push('one_page_required');
  if (report.tableCount !== 0) issues.push('tables_prohibited');
  if (report.columnCount !== 1) issues.push('single_column_required');
  if (report.textBoxCount !== 0) issues.push('text_boxes_prohibited');
  if (report.graphicsCount !== 0) issues.push('graphics_prohibited');
  if (report.headerFooterTextCount !== 0) issues.push('contact_and_content_in_main_body_only');
  if (report.leftEdgeMaxDriftPt > 1 || report.rightEdgeMaxDriftPt > 1) issues.push('unaligned_page_edges');
  if (report.minimumBodyFontPt < 10) issues.push('font_too_small');
  if (!report.starBulletsComplete) issues.push('star_evidence_incomplete');
  if (!report.starBulletsWithinTwoLines) issues.push('star_bullet_too_long');
  if (!report.baseFormatReviewed) issues.push('base_cv_format_not_reviewed');
  // Narrative paragraphs: prefer commas, colons, semicolons; avoid dash punctuation.
  if (/[-\u2013\u2014]/u.test(report.bodyText)) issues.push('dash_punctuation_in_body');
  return { passed: issues.length === 0, issues };
}
