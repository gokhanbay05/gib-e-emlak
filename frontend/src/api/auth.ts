import type { TTBSVerifyResult, UserSession } from '../types';
import { apiRequest } from './client';

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  role: 'AGENT' | 'CUSTOMER';
  ttbs_document_no?: string | null;
  office_phone?: string | null;
  agency_name?: string | null;
  logo_url?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  address_detail?: string | null;
}

export function verifyTtbsDocument(
  ttbsDocumentNo: string,
  agencyName?: string,
): Promise<TTBSVerifyResult> {
  return apiRequest<TTBSVerifyResult>('/api/verify/ttbs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ttbs_document_no: ttbsDocumentNo,
      agency_name: agencyName || undefined,
      check_duplicate: true,
    }),
  });
}

export function registerAccount(
  payload: RegisterPayload,
): Promise<{ message: string; user: UserSession }> {
  return apiRequest<{ message: string; user: UserSession }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function loginAccount(
  email: string,
  password: string,
): Promise<{ message: string; user: UserSession }> {
  return apiRequest<{ message: string; user: UserSession }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function fetchRegisteredUsers(): Promise<{ users: UserSession[] }> {
  return apiRequest<{ users: UserSession[] }>('/api/auth/users');
}
