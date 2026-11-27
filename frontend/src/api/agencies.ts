import type {
  AgencyRecord,
  AgencySellRequestPayload,
  AgencySellRequestSummary,
  SystemOverview,
} from '../types';
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

export function createAgencySellRequest(
  agencyId: number,
  payload: AgencySellRequestPayload,
): Promise<{ message: string; sell_request: AgencySellRequestSummary }> {
  return apiRequest<{ message: string; sell_request: AgencySellRequestSummary }>(
    `/api/agencies/${agencyId}/sell-requests`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
}

export function fetchAgencySellRequests(
  agencyId: number,
  customerId?: number,
): Promise<{ sell_requests: AgencySellRequestSummary[] }> {
  const qs = customerId ? `?customer_id=${customerId}` : '';
  return apiRequest<{ sell_requests: AgencySellRequestSummary[] }>(
    `/api/agencies/${agencyId}/sell-requests${qs}`,
  );
}

export function createAgencyAdvisorAccount(
  agencyId: number,
  payload: {
    full_name: string;
    phone: string;
    email: string;
    password: string;
  },
): Promise<{ message: string; user: { id: number; full_name: string; email: string } }> {
  return apiRequest(`/api/agencies/${agencyId}/advisors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateAgencyWorkingHours(
  agencyId: number,
  payload: {
    start_hour: number;
    end_hour: number;
    working_days: string[];
  },
): Promise<{
  message: string;
  working_hours: {
    start_hour: number;
    end_hour: number;
    working_days: string[];
  };
}> {
  return apiRequest(`/api/agencies/${agencyId}/working-hours`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
