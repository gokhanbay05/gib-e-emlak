import type {
  HeatingType,
  ListingType,
  PropertyCounts,
  PropertyInfoSheetData,
  PropertyRecord,
  PropertyStatus,
  PropertyType,
  SearchRequestRecord,
} from '../types';
import { apiRequest } from './client';

export interface FetchPropertiesParams {
  agency_id?: number;
  listing_type?: string;
  property_type?: string;
  status?: string;
  owner_customer_id?: number;
  city?: string;
  district?: string;
  neighborhood?: string;
  min_price?: number;
  max_price?: number;
  min_sqm?: number;
  max_sqm?: number;
  room_count?: string;
  floor_number?: number;
  building_floors?: number;
  heating_type?: string;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
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

export interface CreateSearchRequestPayload {
  agency_id: number;
  customer_id: number;
  listing_type: string;
  property_type?: string;
  min_sqm?: number | null;
  max_sqm?: number | null;
  room_count?: string;
  floor_preference?: number | null;
  heating_type?: string;
  min_price?: number | null;
  max_price?: number | null;
  city?: string;
  district?: string;
  natural_language_prompt?: string;
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
  if (params?.city && params.city.trim()) {
    qs.set('city', params.city.trim());
  }
  if (params?.district && params.district.trim()) {
    qs.set('district', params.district.trim());
  }
  if (params?.neighborhood && params.neighborhood.trim()) {
    qs.set('neighborhood', params.neighborhood.trim());
  }
  if (params?.min_price !== undefined) {
    qs.set('min_price', String(params.min_price));
  }
  if (params?.max_price !== undefined) {
    qs.set('max_price', String(params.max_price));
  }
  if (params?.min_sqm !== undefined) {
    qs.set('min_sqm', String(params.min_sqm));
  }
  if (params?.max_sqm !== undefined) {
    qs.set('max_sqm', String(params.max_sqm));
  }
  if (params?.room_count && params.room_count !== 'ALL') {
    qs.set('room_count', params.room_count);
  }
  if (params?.floor_number !== undefined) {
    qs.set('floor_number', String(params.floor_number));
  }
  if (params?.building_floors !== undefined) {
    qs.set('building_floors', String(params.building_floors));
  }
  if (params?.heating_type && params.heating_type !== 'ALL') {
    qs.set('heating_type', params.heating_type);
  }
  if (params?.search && params.search.trim()) {
    qs.set('search', params.search.trim());
  }
  if (params?.sort_by) {
    qs.set('sort_by', params.sort_by);
  }
  if (params?.sort_dir) {
    qs.set('sort_dir', params.sort_dir);
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

export function fetchSearchRequests(params?: {
  agency_id?: number;
  customer_id?: number;
}): Promise<{ search_requests: SearchRequestRecord[] }> {
  const qs = new URLSearchParams();
  if (params?.agency_id !== undefined) {
    qs.set('agency_id', String(params.agency_id));
  }
  if (params?.customer_id !== undefined) {
    qs.set('customer_id', String(params.customer_id));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<{ search_requests: SearchRequestRecord[] }>(
    `/api/properties/search-requests${suffix}`,
  );
}

export function createSearchRequest(
  payload: CreateSearchRequestPayload,
): Promise<{ message: string; search_request: SearchRequestRecord }> {
  return apiRequest<{ message: string; search_request: SearchRequestRecord }>(
    '/api/properties/search-requests',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
}

export function fetchPropertyInfoSheet(
  propertyId: number,
  customerId?: number | null,
): Promise<PropertyInfoSheetData> {
  const suffix =
    customerId !== undefined && customerId !== null
      ? `?customer_id=${customerId}`
      : '';
  return apiRequest<PropertyInfoSheetData>(
    `/api/properties/${propertyId}/info-sheet${suffix}`,
  );
}

export function buildPropertyPrintSheetUrl(
  propertyId: number,
  customerId?: number | null,
  autoPrint = true,
): string {
  const qs = new URLSearchParams();
  if (customerId !== undefined && customerId !== null) {
    qs.set('customer_id', String(customerId));
  }
  qs.set('auto_print', autoPrint ? '1' : '0');
  return `/api/properties/${propertyId}/print-sheet?${qs.toString()}`;
}

export interface AiRecommendationItem {
  property: PropertyRecord;
  score: number;
  explanation: string;
  highlights: string[];
}

export function fetchAiPropertyRecommendations(prompt: string): Promise<{
  engine: string;
  recommendations: AiRecommendationItem[];
}> {
  return apiRequest<{
    engine: string;
    recommendations: AiRecommendationItem[];
  }>('/api/properties/ai-recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
}
