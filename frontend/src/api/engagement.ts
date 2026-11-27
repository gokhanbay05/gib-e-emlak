import type {
  AgencyReviewRecord,
  ChatMessageRecord,
  ChatThreadRecord,
  PendingReviewItem,
} from '../types';
import { apiRequest } from './client';

export function fetchAgencyReviews(agencyId: number): Promise<{
  reviews: AgencyReviewRecord[];
  average: number;
  count: number;
}> {
  return apiRequest(`/api/agencies/${agencyId}/reviews`);
}

export function fetchPendingReview(customerId: number): Promise<{
  pending: PendingReviewItem | null;
}> {
  return apiRequest(`/api/reviews/pending?customer_id=${customerId}`);
}

export function submitAgencyReview(payload: {
  appointment_id: number;
  rating: number;
  comment: string;
  user_id?: number;
}): Promise<{ message: string; review: AgencyReviewRecord }> {
  return apiRequest('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function dismissPendingReview(appointmentId: number): Promise<{
  message: string;
}> {
  return apiRequest('/api/reviews/dismiss', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointment_id: appointmentId }),
  });
}

export function fetchChatThreads(params: {
  role: 'AGENT' | 'CUSTOMER';
  agency_id?: number;
  customer_id?: number;
}): Promise<{ threads: ChatThreadRecord[] }> {
  const qs = new URLSearchParams();
  qs.set('role', params.role);
  if (params.agency_id !== undefined) {
    qs.set('agency_id', String(params.agency_id));
  }
  if (params.customer_id !== undefined) {
    qs.set('customer_id', String(params.customer_id));
  }
  return apiRequest(`/api/chat/threads?${qs.toString()}`);
}

export function ensureChatThread(payload: {
  agency_id: number;
  customer_id: number;
  property_id?: number | null;
  advisor_name?: string;
}): Promise<{ thread: ChatThreadRecord }> {
  return apiRequest('/api/chat/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function fetchChatMessages(threadId: number): Promise<{
  messages: ChatMessageRecord[];
}> {
  return apiRequest(`/api/chat/threads/${threadId}/messages`);
}

export function sendChatMessage(
  threadId: number,
  payload: {
    sender_role: 'AGENT' | 'CUSTOMER';
    sender_name: string;
    sender_avatar?: string;
    content: string;
  },
): Promise<{ message_item: ChatMessageRecord }> {
  return apiRequest(`/api/chat/threads/${threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function uploadAvatarFile(file: File): Promise<{
  url: string;
  filename: string;
  message: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest('/api/uploads/avatar', {
    method: 'POST',
    body: formData,
  });
}

export function verifyTcIdentity(tcIdentityNo: string): Promise<{
  is_valid: boolean;
  tc_identity_no: string;
  message: string;
}> {
  return apiRequest('/api/verify/tc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tc_identity_no: tcIdentityNo }),
  });
}
