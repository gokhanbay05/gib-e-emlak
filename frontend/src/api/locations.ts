import type { LocationOption } from '../types';
import { apiRequest } from './client';

export function fetchProvinces(): Promise<{ provinces: LocationOption[] }> {
  return apiRequest<{ provinces: LocationOption[] }>('/api/locations/provinces');
}

export function fetchDistricts(
  provinceId: number,
): Promise<{ districts: LocationOption[] }> {
  return apiRequest<{ districts: LocationOption[] }>(
    `/api/locations/districts?province_id=${provinceId}`,
  );
}

export function fetchNeighborhoods(
  districtId: number,
): Promise<{ neighborhoods: LocationOption[] }> {
  return apiRequest<{ neighborhoods: LocationOption[] }>(
    `/api/locations/neighborhoods?district_id=${districtId}`,
  );
}

export function uploadLogoFile(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest<{ url: string; filename: string }>('/api/uploads/logo', {
    method: 'POST',
    body: formData,
  });
}
