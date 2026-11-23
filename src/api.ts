import { httpsCallable } from 'firebase/functions';
import { firebaseFunctions } from './firebase';

export async function callGuidon<T>(name: string, data: unknown = {}): Promise<T> {
  if (!firebaseFunctions) {
    throw new Error('GuidOn backend is not configured for this deployment.');
  }
  const result = await httpsCallable<unknown, T>(firebaseFunctions, name)(data);
  return result.data;
}

export function safeError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Unable to complete the request.';
  const code = 'code' in error ? String(error.code) : '';
  if (code.includes('unauthenticated')) return 'Your session has expired. Sign in again.';
  if (code.includes('failed-precondition')) return 'The record has changed or is not ready. Refresh and try again.';
  if (code.includes('permission-denied')) return 'You do not have access to this record.';
  if (code.includes('invalid-argument')) return 'Some fields need correction before saving.';
  const message = 'message' in error ? String(error.message) : '';
  return message.slice(0, 250) || 'Unable to complete the request.';
}

export interface WorkspaceOverview {
  uid: string;
  capabilities: { cvUploadsEnabled: boolean; aiProfileExtractionEnabled: boolean };
  account: { onboardingStep: string; schemaVersion: number };
  profile: { data: unknown; state: string } | null;
  baseCvs: Array<{ id: string; fileName: string; mimeType: string; status: string }>;
}
