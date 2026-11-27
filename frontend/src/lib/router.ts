import type { NavDestination } from '../types';

export type ProfileTabKey =
  | 'favorites'
  | 'appointments'
  | 'messages'
  | 'sell-requests'
  | 'security'
  | 'office';
export type AuthTabKey = 'login' | 'register-customer' | 'register-agent';
export type ListingDisplayMode = 'grid' | 'horizontal' | 'map';

export interface RouteState {
  page: NavDestination;
  propertyId: number | null;
  agencyId: number | null;
  advisorId: number | null;
  profileTab: ProfileTabKey;
  authTab: AuthTabKey;
  listingType: 'ALL' | 'SATILIK' | 'KIRALIK';
  city: string;
  district: string;
  neighborhood: string;
  searchQuery: string;
  viewMode: ListingDisplayMode;
}

const VALID_PAGES: Set<NavDestination> = new Set([
  'marketplace',
  'property-detail',
  'agencies-directory',
  'agency-storefront',
  'sell-request',
  'profile',
  'auth',
  'agency',
  'customers',
  'properties',
  'search',
  'calendar',
  'ai-match',
  'reports',
  'system',
]);

export const CORPORATE_ONLY_PAGES: Set<NavDestination> = new Set([
  'properties',
  'customers',
  'calendar',
  'agency',
  'reports',
  'search',
  'ai-match',
]);

export function isCorporateOnlyPage(page: NavDestination): boolean {
  return CORPORATE_ONLY_PAGES.has(page);
}

/**
 * Tarayıcı URL parametrelerinden (window.location.search) aktif rota durumunu okur.
 */
export function parseRouteFromLocation(): RouteState {
  const params = new URLSearchParams(window.location.search);
  const rawPage = params.get('page') as NavDestination | null;
  const page: NavDestination =
    rawPage && VALID_PAGES.has(rawPage) ? rawPage : 'marketplace';

  const propIdNum = Number(params.get('id'));
  const propertyId =
    Number.isFinite(propIdNum) && propIdNum > 0 ? propIdNum : null;

  const agencyIdNum = Number(params.get('agency'));
  const agencyId =
    Number.isFinite(agencyIdNum) && agencyIdNum > 0 ? agencyIdNum : null;

  const advisorIdNum = Number(params.get('advisor'));
  const advisorId =
    Number.isFinite(advisorIdNum) && advisorIdNum > 0 ? advisorIdNum : null;

  const rawProfileTab = params.get('tab') as ProfileTabKey | null;
  const profileTab: ProfileTabKey =
    rawProfileTab &&
    [
      'favorites',
      'appointments',
      'messages',
      'sell-requests',
      'security',
      'office',
    ].includes(rawProfileTab)
      ? rawProfileTab
      : 'favorites';

  const rawAuthTab = params.get('auth') as AuthTabKey | null;
  const authTab: AuthTabKey =
    rawAuthTab &&
    ['login', 'register-customer', 'register-agent'].includes(rawAuthTab)
      ? rawAuthTab
      : 'login';

  const rawTx = params.get('tx');
  const listingType: 'ALL' | 'SATILIK' | 'KIRALIK' =
    rawTx === 'SATILIK' || rawTx === 'KIRALIK' ? rawTx : 'ALL';

  const rawView = params.get('view') as ListingDisplayMode | null;
  const viewMode: ListingDisplayMode =
    rawView === 'horizontal' || rawView === 'map' || rawView === 'grid'
      ? rawView
      : 'grid';

  const searchQuery = (params.get('q') || '').trim();
  const city = (params.get('city') || '').trim();
  const district = (params.get('district') || '').trim();
  const neighborhood = (params.get('neighborhood') || '').trim();

  return {
    page,
    propertyId,
    agencyId,
    advisorId,
    profileTab,
    authTab,
    listingType,
    city,
    district,
    neighborhood,
    searchQuery,
    viewMode,
  };
}

/**
 * Yeni rota durumunu tarayıcı geçmişine (window.history.pushState) yazar.
 */
export function pushRouteToHistory(
  next: Partial<RouteState>,
  replace = false,
): RouteState {
  const current = parseRouteFromLocation();
  const merged: RouteState = {
    ...current,
    ...next,
  };

  const params = new URLSearchParams();
  if (merged.page !== 'marketplace') {
    params.set('page', merged.page);
  }
  if (merged.page === 'marketplace' && merged.listingType !== 'ALL') {
    params.set('tx', merged.listingType);
  }
  if (merged.page === 'marketplace' && merged.searchQuery) {
    params.set('q', merged.searchQuery);
  }
  if (merged.page === 'marketplace' && merged.city) {
    params.set('city', merged.city);
  }
  if (merged.page === 'marketplace' && merged.district) {
    params.set('district', merged.district);
  }
  if (merged.page === 'marketplace' && merged.neighborhood) {
    params.set('neighborhood', merged.neighborhood);
  }
  if (merged.page === 'marketplace' && merged.viewMode !== 'grid') {
    params.set('view', merged.viewMode);
  }
  if (merged.page === 'property-detail' && merged.propertyId) {
    params.set('id', String(merged.propertyId));
  }
  if (merged.page === 'agency-storefront' && merged.agencyId) {
    params.set('agency', String(merged.agencyId));
    if (merged.advisorId) {
      params.set('advisor', String(merged.advisorId));
    }
  }
  if (merged.page === 'profile' && merged.profileTab) {
    params.set('tab', merged.profileTab);
  }
  if (merged.page === 'auth' && merged.authTab !== 'login') {
    params.set('auth', merged.authTab);
  }

  const qs = params.toString();
  const nextUrl = qs
    ? `${window.location.pathname}?${qs}`
    : window.location.pathname;

  if (replace) {
    window.history.replaceState(merged, '', nextUrl);
  } else if (window.location.search !== (qs ? `?${qs}` : '')) {
    window.history.pushState(merged, '', nextUrl);
  }

  return merged;
}
