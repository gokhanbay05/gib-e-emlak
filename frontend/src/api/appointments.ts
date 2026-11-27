import type {
  AppointmentPurpose,
  AppointmentType,
  BlockedSlotCreatePayload,
  BlockedSlotRecord,
  CalendarAppointmentRecord,
  CalendarOverviewResponse,
} from '../types';
import { apiRequest } from './client';

export interface AppointmentCreatePayload {
  agency_id: number;
  property_id?: number | null;
  user_id?: number | null;
  advisor_name?: string;
  customer_name: string;
  customer_phone: string;
  tc_identity_no: string;
  appointment_type: AppointmentType;
  purpose: AppointmentPurpose;
  start_time: string;
  end_time: string;
  meeting_notes?: string;
}

export function fetchCalendarOverview(params: {
  agency_id: number;
  customer_id?: number;
  advisor_name?: string;
  start_date?: string;
  end_date?: string;
}): Promise<CalendarOverviewResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('agency_id', String(params.agency_id));
  if (params.customer_id !== undefined) {
    searchParams.set('customer_id', String(params.customer_id));
  }
  if (params.advisor_name && params.advisor_name !== 'ALL') {
    searchParams.set('advisor_name', params.advisor_name);
  }
  if (params.start_date) {
    searchParams.set('start_date', params.start_date);
  }
  if (params.end_date) {
    searchParams.set('end_date', params.end_date);
  }
  return apiRequest<CalendarOverviewResponse>(
    `/api/appointments/calendar?${searchParams.toString()}`,
  );
}

export function createAppointment(payload: AppointmentCreatePayload): Promise<{
  message: string;
  appointment: CalendarAppointmentRecord;
}> {
  return apiRequest<{
    message: string;
    appointment: CalendarAppointmentRecord;
  }>('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function cancelAppointment(
  appointmentId: number,
  reason?: string,
): Promise<{
  message: string;
  appointment: CalendarAppointmentRecord;
}> {
  return apiRequest<{
    message: string;
    appointment: CalendarAppointmentRecord;
  }>(`/api/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason || '' }),
  });
}

export function fetchPendingCancellationNotice(agencyId: number): Promise<{
  pending: CalendarAppointmentRecord | null;
}> {
  return apiRequest<{ pending: CalendarAppointmentRecord | null }>(
    `/api/appointments/cancelled-pending?agency_id=${encodeURIComponent(agencyId)}`,
  );
}

export function dismissCancellationNotice(
  appointmentId: number,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/api/appointments/${appointmentId}/dismiss-cancel-notice`,
    { method: 'POST' },
  );
}

export function checkPropertyChatAccess(
  propertyId: number,
  customerId: number,
): Promise<{ has_access: boolean }> {
  return apiRequest<{ has_access: boolean }>(
    `/api/appointments/property-access?property_id=${encodeURIComponent(propertyId)}&customer_id=${encodeURIComponent(customerId)}`,
  );
}

export function updateAppointmentDetails(
  appointmentId: number,
  payload: { status?: string; meeting_notes?: string },
): Promise<{
  message: string;
  appointment: CalendarAppointmentRecord;
}> {
  return apiRequest<{
    message: string;
    appointment: CalendarAppointmentRecord;
  }>(`/api/appointments/${appointmentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function fetchBlockedSlots(
  agencyId?: number,
): Promise<{ blocked_slots: BlockedSlotRecord[] }> {
  const query =
    agencyId !== undefined ? `?agency_id=${encodeURIComponent(agencyId)}` : '';
  return apiRequest<{ blocked_slots: BlockedSlotRecord[] }>(
    `/api/appointments/blocked-slots${query}`,
  );
}

export function createBlockedSlot(
  payload: BlockedSlotCreatePayload,
): Promise<{ message: string; blocked_slot: BlockedSlotRecord }> {
  return apiRequest<{ message: string; blocked_slot: BlockedSlotRecord }>(
    '/api/appointments/blocked-slots',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
}

export function deleteBlockedSlot(
  slotId: number,
): Promise<{ message: string; deleted_id: number }> {
  return apiRequest<{ message: string; deleted_id: number }>(
    `/api/appointments/blocked-slots/${slotId}`,
    {
      method: 'DELETE',
    },
  );
}
