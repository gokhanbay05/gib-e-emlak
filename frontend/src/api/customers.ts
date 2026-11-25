import type {
  CustomerCategoryCounts,
  CustomerCreatePayload,
  CustomerDetailRecord,
  CustomerRecord,
  CustomerUpdatePayload,
} from '../types';
import { apiRequest } from './client';

export type { CustomerCreatePayload, CustomerUpdatePayload };

export interface FetchCustomersParams {
  agency_id?: number;
  customer_type?: string;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
}

export function fetchCustomers(
  params: FetchCustomersParams = {},
): Promise<{ customers: CustomerRecord[]; counts: CustomerCategoryCounts }> {
  const query = new URLSearchParams();
  if (params.agency_id !== undefined) {
    query.set('agency_id', String(params.agency_id));
  }
  if (params.customer_type && params.customer_type !== 'ALL') {
    query.set('customer_type', params.customer_type);
  }
  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.sort_by) {
    query.set('sort_by', params.sort_by);
  }
  if (params.sort_dir) {
    query.set('sort_dir', params.sort_dir);
  }
  const qs = query.toString();
  return apiRequest<{
    customers: CustomerRecord[];
    counts: CustomerCategoryCounts;
  }>(`/api/customers${qs ? `?${qs}` : ''}`);
}

export function fetchCustomerDetail(
  customerId: number,
): Promise<{ customer: CustomerDetailRecord }> {
  return apiRequest<{ customer: CustomerDetailRecord }>(
    `/api/customers/${customerId}`,
  );
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

export function updateCustomer(
  customerId: number,
  payload: CustomerUpdatePayload,
): Promise<{ message: string; customer: CustomerRecord }>{
  return apiRequest<{ message: string; customer: CustomerRecord }>(
    `/api/customers/${customerId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
}
