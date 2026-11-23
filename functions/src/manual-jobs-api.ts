import { createHash } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { z, ZodError } from 'zod';
import { jobListingSchema } from './job-discovery';

const settings = { region: 'europe-west1' as const, maxInstances: 3, memory: '256MiB' as const };
const ident = z.string().uuid();
export const suppliedJobSchema = z.object({
  clientRequestId: ident,
  company: z.string().trim().min(2).max(200),
  designation: z.string().trim().min(2).max(200),
  location: z.string().trim().min(2).max(250),
  originalJd: z.string().trim().min(50).max(120_000).optional(),
  sourceUrl: z.string().url().max(2000).optional(),
  department: z.string().trim().min(2).max(130).optional(),
  skills: z.array(z.string().trim().min(1).max(100)).max(60).default([]),
}).strict();

function owner(request: CallableRequest<unknown>): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in before saving a job.');
  return request.auth.uid;
}
function parse<T>(schema: { parse(raw: unknown): T }, raw: unknown): T {
  try { return schema.parse(raw); }
  catch (e) {
    if (e instanceof ZodError) throw new HttpsError('invalid-argument', 'Invalid job input.',
      { fields: e.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) });
    throw e;
  }
}
function normalize(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
}
function cleanSourceUrl(raw: string | undefined) {
  if (!raw) return undefined;
  let url: URL;
  try { url = new URL(raw); }
  catch { throw new HttpsError('invalid-argument', 'Provide a valid employer application link.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
    throw new HttpsError('invalid-argument', 'Employer job links must be public HTTP(S) URLs.');
  }
  url.hash = '';
  return url.toString();
}
function stableUuid(identity: string) {
  const bytes = Buffer.from(createHash('sha256').update(identity).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // Derive a UUID-shaped stable identity.
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}
export async function saveUserProvidedJob(
  uid: string, raw: unknown,
  origin: 'manual_entry' | 'chrome_extension' | 'android_preparation_browser' | 'web_share' = 'manual_entry',
) {
  const input = parse(suppliedJobSchema, raw);
  const sourceUrl = cleanSourceUrl(input.sourceUrl);
  const dedupeKey = sourceUrl
    ? `url:${sourceUrl}`
    : `details:${normalize(input.company)}|${normalize(input.designation)}|${normalize(input.location)}`;
  // Private manual listing identity: same employer URL does not overwrite job data/status.
  const jobId = stableUuid(`${uid}|${dedupeKey}`);
  const user = getFirestore().collection('users').doc(uid);
  const manual = user.collection('manualJobs').doc(jobId);
  const requestRef = user.collection('manualJobRequests').doc(input.clientRequestId);
  const now = new Date().toISOString();
  const payloadSha256 = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const listing = jobListingSchema.parse({
    id: jobId, company: input.company, designation: input.designation,
    location: input.location,
    source: {
      category: origin === 'manual_entry' ? 'Manual' : 'Assistant Capture',
      name: origin === 'manual_entry' ? 'User-supplied vacancy' : 'User-reviewed assistant capture',
      ...(sourceUrl ? { url: sourceUrl } : {}),
    },
    discoveredAt: now, summary: input.originalJd?.slice(0, 3000),
    skills: input.skills,
    ...(input.department ? { department: { name: input.department,
      provenance: 'inferred_from_title' as const } } : {}),
  });
  return getFirestore().runTransaction(async tx => {
    const [existingRequest, existingJob] = await Promise.all([
      tx.get(requestRef), tx.get(manual),
    ]);
    if (existingRequest.exists) {
      if (existingRequest.data()?.payloadSha256 !== payloadSha256) {
        throw new HttpsError('already-exists', 'Request ID was reused for a different manual job.');
      }
      return { jobId: existingRequest.data()?.jobId as string,
        created: existingRequest.data()?.created === true, deduplicated: true };
    }
    if (existingJob.exists) {
      tx.create(requestRef, { jobId, payloadSha256, created: false,
        createdAt: FieldValue.serverTimestamp() });
      return { jobId, created: false, deduplicated: true };
    }
    tx.create(manual, {
      ...listing, originalJd: input.originalJd ?? null,
      verifiedByEmployer: false, ownerUid: uid,
      userSource: origin, createdAt: FieldValue.serverTimestamp(),
    });
    tx.create(requestRef, { jobId, payloadSha256, created: true,
      createdAt: FieldValue.serverTimestamp() });
    return { jobId, created: true, deduplicated: false };
  });
}

export const addMyManualJob = onCall(settings, async request =>
  saveUserProvidedJob(owner(request), request.data, 'manual_entry'));

export const getMyManualJobDetails = onCall(settings, async request => {
  const uid = owner(request);
  const input = parse(z.object({ jobId: ident }).strict(), request.data);
  const job = await getFirestore().collection('users').doc(uid)
    .collection('manualJobs').doc(input.jobId).get();
  if (!job.exists) throw new HttpsError('not-found', 'Manual job not found in your workspace.');
  const data = job.data()!;
  const { originalJd, ownerUid: _ownerUid, userSource: _userSource,
    verifiedByEmployer, createdAt: _createdAt, ...listing } = data;
  return { job: jobListingSchema.parse(listing), originalJd: originalJd ?? null,
    verifiedByEmployer: verifiedByEmployer === true };
});
