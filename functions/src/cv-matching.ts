import { z } from 'zod';
import { careerProfileSchema } from './contracts';
import { keywordSchema, recruiterAssessmentSchema } from './cv-workflow';

export const jdRequirementSchema = z.object({
  id: z.string().uuid(),
  text: z.string().trim().min(2).max(300),
  directJdQuote: z.string().trim().min(2).max(500),
  priority: z.enum(['required', 'preferred', 'other']),
  keyword: z.string().trim().min(2).max(120).optional(),
  validation: z.enum(['unconfirmed_extraction', 'user_confirmed']),
}).strict();

function norm(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

/** Flag extracted claims without an identifiable quote in the original clean JD. */
export function validateJdRequirements(cleanJd: string, requirements: readonly z.infer<typeof jdRequirementSchema>[]) {
  const normalised = ` ${norm(cleanJd)} `;
  const verified = [] as z.infer<typeof jdRequirementSchema>[];
  const ungrounded = [] as z.infer<typeof jdRequirementSchema>[];
  for (const raw of requirements) {
    const req = jdRequirementSchema.parse(raw);
    const quote = norm(req.directJdQuote);
    (quote && normalised.includes(` ${quote} `) ? verified : ungrounded).push(req);
  }
  return { grounded: verified, ungrounded };
}

export function validateAtsKeywordsAgainstJd(cleanJd: string, keywords: readonly z.infer<typeof keywordSchema>[]) {
  const normalised = ` ${norm(cleanJd)} `;
  const problems: string[] = [];
  for (const keyword of keywords) {
    const parsed = keywordSchema.parse(keyword);
    const quote = norm(parsed.jdQuote);
    const phrase = norm(parsed.phrase);
    if (!quote || !normalised.includes(` ${quote} `)) problems.push(parsed.phrase);
    // Semantically equivalent acronyms may require a reviewed synonym mapping;
    // do not claim that a completely unrelated phrase was actually in the JD.
    else if (!quote.includes(phrase)) problems.push(parsed.phrase);
  }
  return { grounded: problems.length === 0, ungroundedKeywords: problems };
}

/** Verified evidence identifiers can be referenced by a recruiter rubric. */
export function verifiedEvidenceIds(rawProfile: unknown) {
  const profile = careerProfileSchema.parse(rawProfile);
  const ids = new Set<string>();
  for (const job of profile.experience) {
    ids.add(job.id);
    for (const item of job.keyNumbers) if (item.verification === 'user_confirmed') ids.add(item.id);
    for (const story of job.starStories) if (story.verification === 'user_confirmed') ids.add(story.id);
  }
  for (const education of profile.education) {
    ids.add(education.id);
    for (const item of education.keyNumbers) if (item.verification === 'user_confirmed') ids.add(item.id);
    for (const story of education.starStories) if (story.verification === 'user_confirmed') ids.add(story.id);
  }
  for (const credential of profile.certifications) ids.add(credential.id);
  for (const project of profile.projects) ids.add(project.id);
  for (const achievement of profile.achievements) ids.add(achievement.id);
  for (const right of profile.workEligibility) if (right.id) ids.add(right.id);
  return ids;
}

export function validateRecruiterEvidence(rawProfile: unknown,
  rawAssessment: z.infer<typeof recruiterAssessmentSchema>) {
  const ids = verifiedEvidenceIds(rawProfile);
  const assessment = recruiterAssessmentSchema.parse(rawAssessment);
  const unsupported: { category: string; evidenceId: string }[] = [];
  for (const criterion of assessment.criteria) {
    for (const id of criterion.evidenceIds) {
      if (!ids.has(id)) unsupported.push({ category: criterion.category, evidenceId: id });
    }
  }
  return { supported: unsupported.length === 0, unsupported };
}

/** Extraction/cleaning is intentionally conservative to preserve JD meaning. */
export function cleanJobDescription(input: string) {
  const original = input.normalize('NFKC');
  if (original.trim().length < 50 || original.length > 120_000) {
    throw new Error('Job description must contain between 50 and 120,000 characters.');
  }
  let clean = original.replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
  const cleanupNotes: string[] = [];
  if (clean !== original.trim()) cleanupNotes.push('Normalised line breaks and whitespace; retained requirements.');
  return { originalText: input, cleanedText: clean, cleanupNotes, confirmedByUser: false };
}

/** Post-CV recruiter ratings may cite only evidence visibly represented in the exported CV. */
export function validateVisibleRecruiterEvidence(
  rawAssessment: z.infer<typeof recruiterAssessmentSchema>,
  visibleEvidenceIds: readonly string[],
) {
  const assessment = recruiterAssessmentSchema.parse(rawAssessment);
  const visible = new Set(visibleEvidenceIds);
  const missing: { category: string; evidenceId: string }[] = [];
  for (const category of assessment.criteria) {
    for (const evidenceId of category.evidenceIds) {
      if (!visible.has(evidenceId)) missing.push({ category: category.category, evidenceId });
    }
  }
  return { supported: missing.length === 0, missing };
}

/**
 * Stable text representation for PRE-CV keyword scoring.
 * Only user-confirmed career evidence is included; contact details, private
 * eligibility specifics and unconfirmed numbers/stories are deliberately absent.
 * The model is never allowed to choose or modify this scored text.
 */
export function confirmedProfileEvidenceText(rawProfile: unknown): string {
  const profile = careerProfileSchema.parse(rawProfile);
  const fragments: string[] = [];
  const append = (...values: (string | undefined)[]) => {
    for (const value of values) if (value?.trim()) fragments.push(value.trim());
  };
  append(profile.headline, profile.professionalSummary);
  append(...profile.skills, ...profile.targetRoles);
  for (const job of profile.experience) {
    append(job.title, job.employer, ...job.highlights);
    for (const metric of job.keyNumbers) {
      if (metric.verification === 'user_confirmed') {
        append(metric.label, String(metric.value), metric.unit, metric.context);
      }
    }
    for (const story of job.starStories) {
      if (story.verification === 'user_confirmed') {
        append(story.situation, story.task, story.action, story.result);
      }
    }
  }
  for (const education of profile.education) {
    append(education.institution, education.credential, education.fieldOfStudy,
      ...education.highlights);
    for (const metric of education.keyNumbers) {
      if (metric.verification === 'user_confirmed') {
        append(metric.label, String(metric.value), metric.unit, metric.context);
      }
    }
    for (const story of education.starStories) {
      if (story.verification === 'user_confirmed') {
        append(story.situation, story.task, story.action, story.result);
      }
    }
  }
  for (const credential of profile.certifications) append(credential.name, credential.issuer);
  for (const project of profile.projects) append(project.name, project.description, ...project.skills);
  for (const achievement of profile.achievements) append(achievement.statement);
  return fragments.join('\n').slice(0, 100_000);
}
