import type {
  HeatingType,
  ListingType,
  PropertyCounts,
  PropertyRecord,
  PropertyStatus,
  PropertyType,
} from '../types';
import { apiRequest } from './client';

export interface FetchPropertiesParams {
  agency_id?: number;
  listing_type?: string;
  property_type?: string;
  status?: string;
  owner_customer_id?: number;
  search?: string;
}

export interface PropertyUpsertPayload {
  agency_id: number;
  owner_customer_id: number;
  owner_tc_identity_no?: string;
  title: string;
  listing_type: ListingType;
  property_type: PropertyType;
  gross_sqm: number;
  net_sqm: number;
  room_count: string;
  floor_number: number;
  building_floors: number;
  heating_type: HeatingType;
  price: number;
  city: string;
  district: string;
  neighborhood: string;
  address_detail: string;
  agent_description: string;
  status: PropertyStatus;
  image_url?: string | null;
}

export function fetchProperties(
  params?: FetchPropertiesParams,
): Promise<{ properties: PropertyRecord[]; counts: PropertyCounts }> {
  const qs = new URLSearchParams();
  if (params?.agency_id !== undefined) {
    qs.set('agency_id', String(params.agency_id));
  }
  if (params?.listing_type && params.listing_type !== 'ALL') {
    qs.set('listing_type', params.listing_type);
  }
  if (params?.property_type && params.property_type !== 'ALL') {
    qs.set('property_type', params.property_type);
  }
  if (params?.status && params.status !== 'ALL') {
    qs.set('status', params.status);
  }
  if (params?.owner_customer_id !== undefined) {
    qs.set('owner_customer_id', String(params.owner_customer_id));
  }
  if (params?.search && params.search.trim()) {
    qs.set('search', params.search.trim());
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<{ properties: PropertyRecord[]; counts: PropertyCounts }>(
    `/api/properties${suffix}`,
  );
}

export function fetchPropertyById(
  propertyId: number,
): Promise<{ property: PropertyRecord }> {
  return apiRequest<{ property: PropertyRecord }>(
    `/api/properties/${propertyId}`,
  );
}

export function createProperty(
  payload: PropertyUpsertPayload,
): Promise<{ message: string; property: PropertyRecord }> {
  return apiRequest<{ message: string; property: PropertyRecord }>(
    '/api/properties',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
}

export function updatePropertyById(
  propertyId: number,
  payload: PropertyUpsertPayload,
): Promise<{ message: string; property: PropertyRecord }> {
  return apiRequest<{ message: string; property: PropertyRecord }>(
    `/api/properties/${propertyId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
}

export function updatePropertyStatus(
  propertyId: number,
  status: PropertyStatus,
): Promise<{ message: string; property: PropertyRecord }> {
  return apiRequest<{ message: string; property: PropertyRecord }>(
    `/api/properties/${propertyId}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  );
}

export function uploadPropertyImageFile(file: File): Promise<{
  url: string;
  filename: string;
  size_bytes: number;
  content_type: string;
  message: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest<{
    url: string;
    filename: string;
    size_bytes: number;
    content_type: string;
    message: string;
  }>('/api/uploads/property-image', {
    method: 'POST',
    body: formData,
  });
}
