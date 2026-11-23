import { createHash } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { ZodError, z } from 'zod';
import {
  createApplicationSchema, applicationStatusUpdateSchema,
  listApplicationsInput, applicationHistoryInput,
} from './application-contracts';

const settings = { region: 'europe-west1' as const, maxInstances: 3, memory: '256MiB' as const };
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function owner(request: CallableRequest<unknown>) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to manage your applications.');
  return request.auth.uid;
}
function parse<T>(schema: { parse(v: unknown): T }, input: unknown): T {
  try { return schema.parse(input); }
  catch (cause) {
    if (cause instanceof ZodError) throw new HttpsError('invalid-argument', 'Invalid application details.',
      { fields: cause.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) });
    throw cause;
  }
}

export const createMyApplication = onCall(settings, async request => {
  const uid = owner(request);
  const input = parse(createApplicationSchema, request.data);
  const db = getFirestore();
  const root = db.collection('users').doc(uid);
  const application = root.collection('applications').doc(input.jobId);
  const event = application.collection('events').doc(input.eventId);
  const savedJob = root.collection('savedJobs').doc(input.jobId);
  const job = db.collection('jobCatalog').doc(input.jobId);
  const personalJob = root.collection('manualJobs').doc(input.jobId);
  const linkedWorkspace = input.cvWorkspaceId
    ? root.collection('jobCvWorkspaces').doc(input.cvWorkspaceId) : null;
  const linkedVersion = input.cvWorkspaceId && input.cvVersionId
    ? linkedWorkspace!.collection('cvVersions').doc(input.cvVersionId) : null;
  const hash = sha(input);

  return db.runTransaction(async tx => {
    const [existing, original, personal, previousJob, priorEvent, workspace, version] =
      await Promise.all([
        tx.get(application), tx.get(job), tx.get(personalJob), tx.get(savedJob), tx.get(event),
        linkedWorkspace ? tx.get(linkedWorkspace) : Promise.resolve(null),
        linkedVersion ? tx.get(linkedVersion) : Promise.resolve(null),
      ]);
    if (priorEvent.exists) {
      if (priorEvent.data()?.payloadSha256 !== hash) {
        throw new HttpsError('already-exists', 'This event ID belongs to another application action.');
      }
      return { applicationId: input.jobId, status: priorEvent.data()?.status, duplicate: true };
    }
    if (existing.exists) throw new HttpsError('already-exists', 'This job already has an application. Update its timeline instead.');
    if (!original.exists && !personal.exists) {
      throw new HttpsError('not-found', 'Job not found in your accessible vacancy collection.');
    }
    if (linkedWorkspace) {
      if (!workspace?.exists || workspace.data()?.jobId !== input.jobId) {
        throw new HttpsError('failed-precondition', 'CV workspace must be linked to this exact job.');
      }
    }
    if (linkedVersion) {
      if (!version?.exists || workspace?.data()?.approvedCvVersionId !== input.cvVersionId) {
        throw new HttpsError('failed-precondition', 'Only a user-approved CV for this job can be attached.');
      }
    }
    const selected = (personal.exists ? personal : original).data()!;
    const status = input.status;
    const record = {
      applicationId: input.jobId,
      jobId: input.jobId,
      company: selected.company,
      designation: selected.designation,
      location: selected.location,
      sourceUrl: selected.source?.url ?? null,
      status,
      version: 1,
      submittedOn: status === 'submitted' ? input.submittedOn ?? new Date().toISOString().slice(0, 10) : null,
      cvWorkspaceId: input.cvWorkspaceId ?? null,
      cvVersionId: input.cvVersionId ?? null,
      employerApplicationId: input.employerApplicationId ?? null,
      note: input.note ?? null,
      origin: 'user',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    tx.create(application, record);
    tx.create(event, {
      eventId: input.eventId, source: 'user', status,
      payloadSha256: hash, previousStatus: null,
      note: input.note ?? null, confirmedByUser: true,
      cvVersionId: input.cvVersionId ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
    // Saved job status is synchronised without erasing the favourite.
    const previousStatus = previousJob.data()?.status ?? 'discovered';
    const nextJobStatus = status === 'submitted'
      ? (previousStatus === 'applied_connected' ? previousStatus : 'applied')
      : (previousStatus === 'discovered' ? 'interested' : previousStatus);
    tx.set(savedJob, {
      jobId: input.jobId, status: nextJobStatus,
      version: Number(previousJob.data()?.version ?? 0) + 1,
      favorite: previousJob.data()?.favorite ?? false,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.create(savedJob.collection('events').doc(input.eventId), {
      previous: { status: previousStatus, favorite: previousJob.data()?.favorite ?? false,
        version: Number(previousJob.data()?.version ?? 0) },
      result: { status: nextJobStatus, favorite: previousJob.data()?.favorite ?? false,
        version: Number(previousJob.data()?.version ?? 0) + 1 },
      candidateConfirmed: true, source: 'application',
      note: 'User recorded application ' + status,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { applicationId: input.jobId, status, version: 1, duplicate: false };
  });
});

/** Manual updates only. Email signals will later use a separate review queue. */
export const updateMyApplication = onCall(settings, async request => {
  const uid = owner(request);
  const input = parse(applicationStatusUpdateSchema, request.data);
  const db = getFirestore();
  const application = db.collection('users').doc(uid)
    .collection('applications').doc(input.applicationId);
  const event = application.collection('events').doc(input.eventId);
  const hash = sha(input);
  return db.runTransaction(async tx => {
    const [current, duplicate] = await Promise.all([tx.get(application), tx.get(event)]);
    if (!current.exists) throw new HttpsError('not-found', 'This application does not belong to your account.');
    if (duplicate.exists) {
      if (duplicate.data()?.payloadSha256 !== hash) {
        throw new HttpsError('already-exists', 'Event ID already used for another update.');
      }
      return { applicationId: input.applicationId, status: duplicate.data()?.status, duplicate: true };
    }
    if (current.data()?.version !== input.expectedVersion) {
      throw new HttpsError('failed-precondition', 'Application changed on another device. Refresh before saving.');
    }
    tx.create(event, {
      eventId: input.eventId, payloadSha256: hash, status: input.status,
      previousStatus: current.data()?.status ?? null, source: 'user',
      confirmedByUser: true, note: input.note ?? null,
      interview: input.interview ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(application, {
      status: input.status, version: FieldValue.increment(1),
      latestNote: input.note ?? null,
      ...(input.interview ? { nextInterview: input.interview } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { applicationId: input.applicationId, status: input.status,
      version: input.expectedVersion + 1, duplicate: false };
  });
});

export const listMyApplications = onCall(settings, async request => {
  const uid = owner(request);
  const { limit } = parse(listApplicationsInput, request.data ?? {});
  const snap = await getFirestore().collection('users').doc(uid)
    .collection('applications').orderBy('updatedAt', 'desc').limit(limit).get();
  return {
    applications: snap.docs.map(doc => ({
      applicationId: doc.id,
      jobId: doc.data().jobId,
      company: doc.data().company,
      designation: doc.data().designation,
      location: doc.data().location,
      sourceUrl: doc.data().sourceUrl ?? null,
      status: doc.data().status,
      version: doc.data().version,
      submittedOn: doc.data().submittedOn ?? null,
      cvVersionId: doc.data().cvVersionId ?? null,
      cvWorkspaceId: doc.data().cvWorkspaceId ?? null,
      latestNote: doc.data().latestNote ?? doc.data().note ?? null,
      nextInterview: doc.data().nextInterview ?? null,
      updatedAt: doc.data().updatedAt?.toDate?.().toISOString?.() ?? null,
    })),
  };
});

export const getMyApplicationTimeline = onCall(settings, async request => {
  const uid = owner(request);
  const { applicationId, limit } = parse(applicationHistoryInput, request.data);
  const ref = getFirestore().collection('users').doc(uid).collection('applications').doc(applicationId);
  const parent = await ref.get();
  if (!parent.exists) throw new HttpsError('not-found', 'Application not found for this account.');
  const history = await ref.collection('events').orderBy('createdAt', 'desc').limit(limit).get();
  return {
    applicationId, currentStatus: parent.data()?.status,
    events: history.docs.map(doc => ({
      eventId: doc.id, status: doc.data().status,
      previousStatus: doc.data().previousStatus ?? null,
      source: doc.data().source, confirmedByUser: doc.data().confirmedByUser === true,
      note: doc.data().note ?? null, interview: doc.data().interview ?? null,
      at: doc.data().createdAt?.toDate?.().toISOString?.() ?? null,
    })),
  };
});
