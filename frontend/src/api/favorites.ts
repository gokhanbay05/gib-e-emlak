import type { FavoriteItemRecord } from '../types';
import { apiRequest } from './client';

export function fetchFavorites(userId: number): Promise<{
  favorites: FavoriteItemRecord[];
  favorite_property_ids: number[];
}> {
  return apiRequest<{
    favorites: FavoriteItemRecord[];
    favorite_property_ids: number[];
  }>(`/api/favorites?user_id=${userId}`);
}

export function addFavorite(
  userId: number,
  propertyId: number,
): Promise<{ message: string; is_favorited: boolean; property_id: number }> {
  return apiRequest<{
    message: string;
    is_favorited: boolean;
    property_id: number;
  }>('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, property_id: propertyId }),
  });
}

export function removeFavorite(
  userId: number,
  propertyId: number,
): Promise<{ message: string; is_favorited: boolean; property_id: number }> {
  return apiRequest<{
    message: string;
    is_favorited: boolean;
    property_id: number;
  }>(`/api/favorites/${propertyId}?user_id=${userId}`, {
    method: 'DELETE',
  });
}
