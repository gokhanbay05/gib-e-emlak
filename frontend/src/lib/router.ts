import type { NavDestination } from '../types';

export type ProfileTabKey = 'favorites' | 'appointments' | 'sell-requests' | 'security';
export type AuthTabKey = 'login' | 'register-customer' | 'register-agent';

export interface RouteState {
  page: NavDestination;
  propertyId: number | null;
  agencyId: number | null;
  advisorId: number | null;
  profileTab: ProfileTabKey;
  authTab: AuthTabKey;
  listingType: 'ALL' | 'SATILIK' | 'KIRALIK';
}

const VALID_PAGES: Set<NavDestination> = new Set([
  'marketplace',
  'property-detail',
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
    ['favorites', 'appointments', 'sell-requests', 'security'].includes(rawProfileTab)
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

  return {
    page,
    propertyId,
    agencyId,
    advisorId,
    profileTab,
    authTab,
    listingType,
  };
}

/**
 * Yeni rota durumunu tarayıcı geçmişine (window.history.pushState) yazar.
 * Böylece sayfa içi geri butonuna gerek kalmadan tarayıcının Geri/İleri tuşları kusursuz çalışır.
 */
export function pushRouteToHistory(next: Partial<RouteState>, replace = false): RouteState {
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
  const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;

  if (replace) {
    window.history.replaceState(merged, '', nextUrl);
  } else if (window.location.search !== (qs ? `?${qs}` : '')) {
    window.history.pushState(merged, '', nextUrl);
  }

  return merged;
}
