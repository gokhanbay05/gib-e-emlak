import type { CustomerRecord, CustomerType } from '../types';
import { apiRequest } from './client';

export interface FetchCustomersParams {
  agency_id?: number;
  customer_type?: string;
  search?: string;
}

export interface CustomerCreatePayload {
  agency_id: number;
  first_name: string;
  last_name: string;
  mobile_phone: string;
  home_phone?: string;
  email?: string;
  tc_identity_no?: string;
  customer_type: CustomerType;
  notes?: string;
}

export function fetchCustomers(
  params?: FetchCustomersParams,
): Promise<{ customers: CustomerRecord[]; counts: Record<string, number> }> {
  const qs = new URLSearchParams();
  if (params?.agency_id !== undefined) {
    qs.set('agency_id', String(params.agency_id));
  }
  if (params?.customer_type && params.customer_type !== 'ALL') {
    qs.set('customer_type', params.customer_type);
  }
  if (params?.search && params.search.trim()) {
    qs.set('search', params.search.trim());
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<{
    customers: CustomerRecord[];
    counts: Record<string, number>;
  }>(`/api/customers${suffix}`);
}

export function createCustomer(
  payload: CustomerCreatePayload,
): Promise<{ message: string; customer: CustomerRecord }> {
  return apiRequest<{ message: string; customer: CustomerRecord }>(
    '/api/customers',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
}
