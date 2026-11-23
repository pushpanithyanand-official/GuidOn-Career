import { FieldPath, FieldValue, getFirestore, type CollectionReference, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { ZodError, z } from 'zod';
import {
  jobListingSchema, jobUserStateSchema, jobFilterSchema, jobListRequestSchema,
  filterJobListings, sortJobListings, getJobFilterFacets, summarizeJobStatuses,
  userJobStatusSchema, type JobWithState,
} from './job-discovery';
import { careerProfileSchema } from './contracts';

// This complete scan is deliberately a small-beta baseline. Do not silently
// apply filters to the visible page; at larger scale replace it with an index.
const MAX_CATALOG_SCAN = 5000;
const PAGE_CHUNK = 500;
const settings = { region: 'europe-west1' as const, maxInstances: 3, memory: '256MiB' as const };

function owner(request: CallableRequest<unknown>) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to manage private job choices.');
  return request.auth.uid;
}
function parse<T>(schema: { parse(value: unknown): T }, raw: unknown): T {
  try { return schema.parse(raw); }
  catch (reason) {
    if (reason instanceof ZodError) throw new HttpsError('invalid-argument', 'Invalid job request.',
      { fields: reason.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) });
    throw reason;
  }
}

async function scanComplete(collection: CollectionReference) {
  const docs: QueryDocumentSnapshot[] = [];
  let previous: QueryDocumentSnapshot | undefined;
  while (true) {
    let query = collection.orderBy(FieldPath.documentId()).limit(PAGE_CHUNK);
    if (previous) query = query.startAfter(previous);
    const page = await query.get();
    docs.push(...page.docs);
    if (docs.length > MAX_CATALOG_SCAN) {
      throw new HttpsError('resource-exhausted',
        'The job index has outgrown the initial complete-scan listing API. An indexed search backend is required.');
    }
    if (page.size < PAGE_CHUNK) break;
    previous = page.docs[page.docs.length - 1];
  }
  return docs;
}

const decisionSchema = z.object({
  jobId: z.string().uuid(),
  changeId: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  status: userJobStatusSchema.optional(),
  favorite: z.boolean().optional(),
  // For consequential states (Applied, Applied + Connected, Rejected),
  // positive confirmation is required; backend must never infer submission.
  userConfirmed: z.boolean().default(false),
  note: z.string().trim().max(1000).optional(),
}).strict().refine(item => item.status !== undefined || item.favorite !== undefined,
  'Specify a favourite or a status change.');

const timelineInput = z.object({
  jobId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(30),
}).strict();

export const getMyJobListings = onCall(settings, async request => {
  const uid = owner(request);
  const input = parse(jobListRequestSchema, request.data ?? {});
  const db = getFirestore();
  const user = db.collection('users').doc(uid);
  // Entire available candidate pool first, then filter/sort, then paginate.
  // A scan beyond beta limits fails visibly, rather than displaying incomplete matches.
  const [catalog, manuallyAdded, personal, profileDocument] = await Promise.all([
    scanComplete(db.collection('jobCatalog')),
    scanComplete(user.collection('manualJobs')),
    scanComplete(user.collection('savedJobs')),
    user.collection('profile').doc('current').get(),
  ]);
  if (catalog.length + manuallyAdded.length > MAX_CATALOG_SCAN) {
    throw new HttpsError('resource-exhausted', 'The combined job index requires scalable search before more results can be listed.');
  }
  const owned = new Map(personal.map(doc => [doc.id, doc.data()]));
  const rows: JobWithState[] = [...catalog, ...manuallyAdded].map(doc => {
    const raw = doc.data();
    const { originalJd: _originalJd, ownerUid: _ownerUid,
      userSource: _userSource, verifiedByEmployer: _verifiedByEmployer,
      createdAt: _createdAt, ...publicFields } = raw;
    const record = jobListingSchema.parse({ ...publicFields, id: doc.id });
    const candidate = owned.get(doc.id);
    const userState = jobUserStateSchema.parse({
      status: candidate?.status ?? 'discovered',
      favorite: candidate?.favorite ?? false,
      version: candidate?.version ?? 0,
    });
    return { ...record, userState,
      ...(candidate?.updatedAt?.toDate ? { stateUpdatedAt: candidate.updatedAt.toDate().toISOString() } : {}),
    };
  });
  const rawProfile = profileDocument.exists && profileDocument.data()?.state === 'user_confirmed'
    ? careerProfileSchema.safeParse(profileDocument.data()?.data) : null;
  const profile = rawProfile?.success ? rawProfile.data : null;
  const filtered = filterJobListings(rows, input.filters);
  const ordered = sortJobListings(filtered, input.sort, profile);
  const start = (input.page - 1) * input.pageSize;
  return {
    jobs: ordered.slice(start, start + input.pageSize),
    totalMatches: ordered.length,
    page: input.page, pageSize: input.pageSize,
    hasMore: start + input.pageSize < ordered.length,
    filtersAppliedBeforePagination: true,
    searchScope: 'complete_public_and_personal_catalog_up_to_5000',
    smartSortUsedConfirmedProfile: input.sort === 'smart_match' && profile !== null,
    sortFallback: input.sort === 'smart_match' && !profile ? 'newest' : null,
    facets: getJobFilterFacets(rows),
    statusCounts: summarizeJobStatuses(rows),
  };
});

export const setMyJobDecision = onCall(settings, async request => {
  const uid = owner(request);
  const input = parse(decisionSchema, request.data);
  if ((input.status === 'applied' || input.status === 'applied_connected' || input.status === 'rejected')
      && !input.userConfirmed) {
    throw new HttpsError('failed-precondition',
      'Explicit candidate confirmation is required for applications, connections and rejections.');
  }
  const db = getFirestore();
  const job = db.collection('jobCatalog').doc(input.jobId);
  const manualJob = db.collection('users').doc(uid).collection('manualJobs').doc(input.jobId);
  const doc = db.collection('users').doc(uid).collection('savedJobs').doc(input.jobId);
  const event = doc.collection('events').doc(input.changeId);
  return db.runTransaction(async tx => {
    const [source, privateSource, previous, change] = await Promise.all([
      tx.get(job), tx.get(manualJob), tx.get(doc), tx.get(event),
    ]);
    if (!source.exists && !privateSource.exists) {
      throw new HttpsError('not-found', 'Job not found in your accessible catalog.');
    }
    if (change.exists) {
      if (change.data()?.payloadHash !== JSON.stringify(input)) {
        throw new HttpsError('already-exists', 'Change ID belongs to a different action.');
      }
      return { jobId: input.jobId, ...change.data()?.result };
    }
    const state = jobUserStateSchema.parse({
      status: previous.data()?.status ?? 'discovered',
      favorite: previous.data()?.favorite ?? false,
      version: previous.data()?.version ?? 0,
    });
    if (state.version !== input.expectedVersion) {
      throw new HttpsError('failed-precondition', 'Job state changed on another device. Refresh and retry.');
    }
    const result = {
      status: input.status ?? state.status,
      favorite: input.favorite ?? state.favorite,
      version: state.version + 1,
    };
    tx.set(doc, { ...result, jobId: input.jobId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.create(event, {
      payloadHash: JSON.stringify(input),
      previous: state,
      result,
      note: input.note ?? null,
      candidateConfirmed: input.userConfirmed,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { jobId: input.jobId, ...result };
  });
});

export const getMyJobTimeline = onCall(settings, async request => {
  const uid = owner(request);
  const input = parse(timelineInput, request.data);
  const root = getFirestore().collection('users').doc(uid).collection('savedJobs').doc(input.jobId);
  const snapshot = await root.collection('events').orderBy('createdAt', 'desc').limit(input.limit).get();
  return { jobId: input.jobId, changes: snapshot.docs.map(doc => ({
    changeId: doc.id, previous: doc.data().previous,
    result: doc.data().result, note: doc.data().note ?? null,
    candidateConfirmed: doc.data().candidateConfirmed,
    at: doc.data().createdAt?.toDate?.().toISOString?.() ?? null,
  })) };
});

export const saveMyJobFilters = onCall(settings, async request => {
  const uid = owner(request);
  const input = parse(jobFilterSchema, request.data);
  const ref = getFirestore().collection('users').doc(uid).collection('preferences').doc('jobFilters');
  await ref.set({ filters: input, updatedAt: FieldValue.serverTimestamp() });
  return { filters: input, saved: true };
});
export const getMyJobFilters = onCall(settings, async request => {
  const uid = owner(request);
  const doc = await getFirestore().collection('users').doc(uid)
    .collection('preferences').doc('jobFilters').get();
  return { filters: jobFilterSchema.parse(doc.data()?.filters ?? {}) };
});

/** Detail lookup supports private captured jobs and accessible shared listings, without exposing another user's JD. */
export const getMyJobDetails = onCall(settings, async request => {
  const uid = owner(request);
  const payload = parse(z.object({ jobId: z.string().uuid() }).strict(), request.data);
  const db = getFirestore();
  const [privateJob, publicJob, state] = await Promise.all([
    db.collection('users').doc(uid).collection('manualJobs').doc(payload.jobId).get(),
    db.collection('jobCatalog').doc(payload.jobId).get(),
    db.collection('users').doc(uid).collection('savedJobs').doc(payload.jobId).get(),
  ]);
  const source = privateJob.exists ? privateJob : publicJob;
  if (!source.exists) throw new HttpsError('not-found', 'Job not found or not accessible for this account.');
  const { originalJd, ownerUid: _uid, userSource: _source, verifiedByEmployer: _verified,
    createdAt: _created, ...safeJob } = source.data()!;
  return {
    job: jobListingSchema.parse({ ...safeJob, id: payload.jobId }),
    originalJd: privateJob.exists ? originalJd ?? null : null,
    userState: jobUserStateSchema.parse({
      status: state.data()?.status ?? 'discovered',
      favorite: state.data()?.favorite ?? false,
      version: state.data()?.version ?? 0,
    }),
    isUserAdded: privateJob.exists,
  };
});
