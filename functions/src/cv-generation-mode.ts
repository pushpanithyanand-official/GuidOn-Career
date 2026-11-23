import { z } from 'zod';
import { careerProfileSchema } from './contracts';
import { verifiedEvidenceIds } from './cv-matching';

// Users opt into this before Make CV. Creativity changes how genuine facts
// are framed, NOT what jobs, employers, grades, dates, qualifications or
// numerical achievements the candidate actually had.
export const cvGenerationModeSchema = z.enum(['evidence_first', 'think_creatively']);
export type CvGenerationMode = z.infer<typeof cvGenerationModeSchema>;

export const modeSelectionInputSchema = z.object({
  workspaceId: z.string().uuid(),
  modeChangeId: z.string().uuid(),
  expectedStageVersion: z.number().int().nonnegative(),
  generationMode: cvGenerationModeSchema,
  acknowledgeFactPreservation: z.literal(true),
}).strict();

export const creativeSuggestionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('achievement_reframe'),
    employmentId: z.string().uuid(),
    evidenceIds: z.array(z.string().uuid()).min(1).max(20),
    oldText: z.string().trim().max(1000),
    proposedText: z.string().trim().min(10).max(1000),
    reason: z.string().trim().min(5).max(500),
    // Not a new verified career-profile fact until user confirms it.
    userApproved: z.boolean().default(false),
  }).strict(),
  z.object({
    kind: z.literal('functional_department_label'),
    employmentId: z.string().uuid(),
    evidenceIds: z.array(z.string().uuid()).min(1).max(20),
    proposedLabel: z.string().trim().min(3).max(100),
    // Descriptive label, never a replacement for the actual official department.
    isOfficialDepartment: z.literal(false),
    reason: z.string().trim().min(5).max(500),
    userApproved: z.boolean().default(false),
  }).strict(),
  z.object({
    kind: z.literal('summary_or_skills_reframe'),
    employmentId: z.string().uuid(),
    evidenceIds: z.array(z.string().uuid()).min(1).max(20),
    proposedText: z.string().trim().min(10).max(1000),
    reason: z.string().trim().min(5).max(500),
    userApproved: z.boolean().default(false),
  }).strict(),
]);

export type CreativeSuggestion = z.infer<typeof creativeSuggestionSchema>;

/**
 * Validate suggestions against *confirmed* user-owned source evidence.
 * A model cannot change official identity fields using this contract: title,
 * employer, dates and qualifications are not mutable proposal properties.
 */
export function checkCreativeSuggestions(profileInput: unknown, raw: readonly CreativeSuggestion[]) {
  const profile = careerProfileSchema.parse(profileInput);
  const allowed = verifiedEvidenceIds(profile);
  const jobs = new Map(profile.experience.map(entry => [entry.id, entry]));
  const accepted: CreativeSuggestion[] = [];
  const rejected: { index: number; reason: string }[] = [];
  raw.forEach((candidate, index) => {
    const proposal = creativeSuggestionSchema.safeParse(candidate);
    if (!proposal.success) {
      rejected.push({ index, reason: 'Invalid or disallowed creative edit fields' });
      return;
    }
    const edit = proposal.data;
    if (!jobs.has(edit.employmentId)) {
      rejected.push({ index, reason: 'Employer record does not belong to this profile' });
      return;
    }
    if (edit.evidenceIds.some(id => !allowed.has(id))) {
      rejected.push({ index, reason: 'Edit cites missing or unconfirmed evidence' });
      return;
    }
    if (!edit.evidenceIds.includes(edit.employmentId) &&
        !edit.evidenceIds.some(id => jobs.get(edit.employmentId)?.keyNumbers.some(n => n.id === id) ||
          jobs.get(edit.employmentId)?.starStories.some(s => s.id === id))) {
      rejected.push({ index, reason: 'Edit evidence must belong to the specified role' });
      return;
    }
    accepted.push(edit);
  });
  return { accepted, rejected, valid: rejected.length === 0 };
}

export function generationModePolicy(mode: CvGenerationMode) {
  if (mode === 'think_creatively') {
    return [
      'Use creative, natural rephrasing to foreground directly relevant duties, leadership, impact and transferable skills, while keeping every statement accurate.',
      'You may suggest clearer FUNCTIONAL AREA descriptions or department focus labels, explicitly marked descriptive rather than official.',
      'Do not replace the real employer, official designation, formally named department, employment dates, qualifications, eligibility, outcomes or numbers.',
      'Do not imply the candidate held a more senior position, different regulated credential, or additional business responsibility than the confirmed evidence supports.',
      'Return a diff list of meaningful wording/functional-label changes with source evidence IDs, and request user approval before applying them.',
      'The exact same one-page, ATS, no-tables, verified STAR, score provenance and render checks apply as evidence-first mode.',
    ].join('\n');
  }
  return [
    'Prefer literal, concise summaries of verified responsibilities, STAR achievements and confirmed metrics.',
    'Keep the user-confirmed official job titles, employers, dates and departments unchanged.',
    'Do not invent experience or elevate duties beyond evidenced responsibility.',
  ].join('\n');
}
