import type { AgencyRecord, SystemOverview } from '../types';
import { apiRequest } from './client';

export interface AgencyUpdatePayload {
  name: string;
  authorized_person: string;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  phone: string;
  mobile_phone?: string;
  fax?: string;
  tax_office?: string;
  tax_number?: string;
  logo_url?: string;
  description?: string;
}

export function fetchAgencies(): Promise<{ agencies: AgencyRecord[] }> {
  return apiRequest<{ agencies: AgencyRecord[] }>('/api/agencies');
}

export function fetchAgencyById(
  agencyId: number,
): Promise<{ agency: AgencyRecord }> {
  return apiRequest<{ agency: AgencyRecord }>(`/api/agencies/${agencyId}`);
}

export function updateAgencyById(
  agencyId: number,
  payload: AgencyUpdatePayload,
): Promise<{ message: string; agency: AgencyRecord }> {
  return apiRequest<{ message: string; agency: AgencyRecord }>(
    `/api/agencies/${agencyId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
}

export function fetchSystemOverview(): Promise<SystemOverview> {
  return apiRequest<SystemOverview>('/api/system/overview');
}
