import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { cvQualityInputSchema, validateCvQuality } from './cv-workflow';
import { sha256Bytes } from './cv-audit';
import { writeCvAuditArtifact } from './cv-workspace-api';
import { verifiedEvidenceIds } from './cv-matching';

const id = z.string().uuid();
const MAX_FINAL_CV_BYTES = 2_500_000; // Conservative Greenhouse parsing compatibility target.

const versionMetadata = z.object({
  cvVersionId: id,
  profileRevisionId: z.string().regex(/^[A-Za-z0-9_-]{10,64}$/),
  parentVersionId: id.nullable().optional(),
  template: z.object({
    source: z.enum(['uploaded_base_cv', 'guidon_template']),
    baseCvId: z.string().regex(/^[A-Za-z0-9_-]{10,64}$/).optional(),
    templateId: z.string().trim().max(200).optional(),
    formatFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
  // Visible claims are source-linked to user-confirmed facts, not just hidden profile keywords.
  visibleEvidenceClaims: z.array(z.object({
    claimId: id,
    exactVisibleText: z.string().trim().min(10).max(700),
    evidenceIds: z.array(id).min(1).max(12),
  }).strict()).min(1).max(100),
  // This report must be produced by a trusted render/inspection worker.
  quality: cvQualityInputSchema,
}).strict();

export function validateRenderedCvMedia(docx: Buffer, pdf: Buffer, plainText: string) {
  const failures: string[] = [];
  if (docx.length < 100 || docx.length > MAX_FINAL_CV_BYTES ||
      docx.subarray(0, 2).toString('utf8') !== 'PK') failures.push('invalid_or_oversized_docx');
  if (pdf.length < 100 || pdf.length > MAX_FINAL_CV_BYTES ||
      pdf.subarray(0, 5).toString('ascii') !== '%PDF-') failures.push('invalid_or_oversized_pdf');
  if (plainText.trim().length < 150 || Buffer.byteLength(plainText, 'utf8') > 100_000) {
    failures.push('cv_text_unreadable');
  }
  return { valid: failures.length === 0, failures };
}


function normalizedPhrase(text: string) {
  return text.normalize('NFKC').toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

/**
 * A recruiter-visible claim is eligible as evidence only when the exact
 * substantive wording is present in the exported CV and the profile contains
 * each cited verified evidence item.
 */
export function validateVisibleEvidenceClaims(
  extractedText: string,
  claims: readonly { claimId: string; exactVisibleText: string; evidenceIds: string[] }[],
  eligibleIds: ReadonlySet<string>,
) {
  const text = ` ${normalizedPhrase(extractedText)} `;
  const issues: string[] = [];
  const represented = new Set<string>();
  for (const claim of claims) {
    if (!text.includes(` ${normalizedPhrase(claim.exactVisibleText)} `)) {
      issues.push(`Claim ${claim.claimId} is not visible in the exported CV`);
      continue;
    }
    for (const id of claim.evidenceIds) {
      if (!eligibleIds.has(id)) {
        issues.push(`Claim ${claim.claimId} cites unverified or missing evidence ${id}`);
      } else {
        represented.add(id);
      }
    }
  }
  return { valid: issues.length === 0, issues, representedEvidenceIds: [...represented] };
}

/**
 * Internal worker-only immutable CV version registration.
 * Do not invoke until both DOCX and PDF were actually rendered and inspected.
 */
export async function registerRenderedCvVersion(uid: string, workspaceId: string,
  metadataInput: z.infer<typeof versionMetadata>,
  output: { docx: Buffer; pdf: Buffer; extractedText: string }) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new Error('Unsafe UID');
  id.parse(workspaceId);
  const metadata = versionMetadata.parse(metadataInput);
  const media = validateRenderedCvMedia(output.docx, output.pdf, output.extractedText);
  if (!media.valid) {
    throw new HttpsError('failed-precondition', 'Rendered CV files did not pass integrity and size checks.', media.failures);
  }
  const layout = validateCvQuality(metadata.quality);
  const db = getFirestore();
  const user = db.collection('users').doc(uid);
  const workspace = user.collection('jobCvWorkspaces').doc(workspaceId);
  const version = workspace.collection('cvVersions').doc(metadata.cvVersionId);
  const [workspaceDoc, profileRevision] = await Promise.all([
    workspace.get(), user.collection('profileRevisions').doc(metadata.profileRevisionId).get(),
  ]);
  if (!workspaceDoc.exists) throw new HttpsError('not-found', 'Application workspace not found.');
  if (!profileRevision.exists || profileRevision.data()?.state !== 'user_confirmed') {
    throw new HttpsError('failed-precondition', 'Only a user-confirmed career profile can generate a CV.');
  }
  const evidence = validateVisibleEvidenceClaims(
    output.extractedText, metadata.visibleEvidenceClaims,
    verifiedEvidenceIds(profileRevision.data()!.data),
  );
  if (!evidence.valid) {
    throw new HttpsError('failed-precondition',
      'CV evidence must appear in the rendered document and trace to the confirmed profile.',
      evidence.issues.slice(0, 20));
  }
  if (!['cv_draft', 'post_cv_review', 'revision_requested'].includes(workspaceDoc.data()?.stage)) {
    throw new HttpsError('failed-precondition', 'This application is not in the CV generation/review stage.');
  }
  if (metadata.template.source === 'uploaded_base_cv') {
    if (!metadata.template.baseCvId) throw new HttpsError('invalid-argument', 'Base CV reference is required.');
    const source = await user.collection('baseCvs').doc(metadata.template.baseCvId).get();
    if (!source.exists || source.data()?.status !== 'uploaded') {
      throw new HttpsError('failed-precondition', 'The selected base CV is not owned by this account.');
    }
  }
  if (metadata.parentVersionId) {
    const prior = await workspace.collection('cvVersions').doc(metadata.parentVersionId).get();
    if (!prior.exists) throw new HttpsError('failed-precondition', 'The parent CV revision does not exist.');
  }
  const textSha256 = sha256Bytes(output.extractedText);
  const saved = await version.get();
  if (saved.exists) {
    if (saved.data()?.textSha256 !== textSha256 ||
        saved.data()?.docxSha256 !== sha256Bytes(output.docx) ||
        saved.data()?.pdfSha256 !== sha256Bytes(output.pdf)) {
      throw new HttpsError('already-exists', 'A CV version ID already exists with different content.');
    }
    return { cvVersionId: metadata.cvVersionId, quality: saved.data()?.quality,
      status: saved.data()?.status };
  }
  // Write-once artifacts remain preserved even if render QA blocks final approval.
  const artifacts = await Promise.all([
    writeCvAuditArtifact(uid, workspaceId, {
      category: 'cv_docx',
      relativePath: `05-cv/cv-version-${metadata.cvVersionId}.docx`,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      content: output.docx,
      cvVersionId: metadata.cvVersionId,
    }),
    writeCvAuditArtifact(uid, workspaceId, {
      category: 'cv_pdf',
      relativePath: `05-cv/cv-version-${metadata.cvVersionId}.pdf`,
      contentType: 'application/pdf',
      content: output.pdf,
      cvVersionId: metadata.cvVersionId,
    }),
    writeCvAuditArtifact(uid, workspaceId, {
      category: 'cv_text',
      relativePath: `05-cv/cv-version-${metadata.cvVersionId}.txt`,
      contentType: 'text/plain',
      content: output.extractedText,
      cvVersionId: metadata.cvVersionId,
    }),
    writeCvAuditArtifact(uid, workspaceId, {
      category: 'render_qa',
      relativePath: `05-cv/rendered-qa-${metadata.cvVersionId}.json`,
      contentType: 'application/json',
      content: JSON.stringify({ ...metadata.quality, verdict: layout }),
      cvVersionId: metadata.cvVersionId,
    }),
  ]);
  const status = layout.passed ? 'rendered_qa_passed' : 'blocked_render_qa';
  const record = {
    ...metadata,
    textSha256, docxSha256: sha256Bytes(output.docx), pdfSha256: sha256Bytes(output.pdf),
    artifacts: artifacts.map(item => item.artifactId), status,
    visibleEvidenceIds: evidence.representedEvidenceIds,
    renderQualityPassed: layout.passed,
    createdAt: FieldValue.serverTimestamp(),
  };
  try {
    await version.create(record);
  } catch (error) {
    const code = (error as { code?: number | string }).code;
    if (code !== 6 && code !== 'already-exists') throw error;
    const existing = await version.get();
    if (existing.data()?.textSha256 !== textSha256) throw error;
  }
  // A newly generated version requires its own post-CV score; no inherited QA approval.
  await workspace.update({
    latestRenderedCvVersionId: metadata.cvVersionId,
    latestCvQualityPassed: false,
    latestScoredCvVersionId: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { cvVersionId: metadata.cvVersionId, status, quality: layout };
}
