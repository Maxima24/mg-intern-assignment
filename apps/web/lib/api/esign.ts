import type { components } from '@mango/shared/api';
import { api, apiUrl } from './client';

/** Wire types come straight from the backend's OpenAPI spec — no hand-written DTOs. */
export type SignatureRecord = components['schemas']['SignatureRecordDto'];
export type SignatureDetails = components['schemas']['SignatureDetailsDto'];

export const esignApi = {
  upload: (form: FormData): Promise<SignatureRecord> =>
    api.upload<SignatureRecord>('upload-contract', form),

  status: (id: string): Promise<SignatureRecord> =>
    api.get<SignatureRecord>(`signature-status/${encodeURIComponent(id)}`),

  recent: (limit = 20): Promise<SignatureRecord[]> =>
    api.get<SignatureRecord[]>(`signatures?limit=${limit}`),

  /** Direct URL to stream the signed PDF through our backend. */
  downloadHref: (id: string): string => apiUrl(`download/${encodeURIComponent(id)}`),
};
