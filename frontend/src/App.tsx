import React, { useEffect, useState } from 'react';
import { fetchPendingCancellationNotice } from './api/appointments';
import { fetchPendingReview } from './api/engagement';
import { AppNavbar } from './components/layout';
import AiSearchModal from './components/modals/AiSearchModal';
import CancellationNoticeModal from './components/modals/CancellationNoticeModal';
import RatingModal from './components/modals/RatingModal';
import {
  isCorporateOnlyPage,
  parseRouteFromLocation,
  pushRouteToHistory,
  type AuthTabKey,
  type ListingDisplayMode,
  type ProfileTabKey,
  type RouteState,
} from './lib/router';
import AgenciesDirectoryPage from './pages/AgenciesDirectoryPage';
import AgencyProfilePage from './pages/AgencyProfilePage';
import AgencyStorefrontPage from './pages/AgencyStorefrontPage';
import AuthPage from './pages/AuthPage';
import CalendarPage from './pages/CalendarPage';
import CustomersPage from './pages/CustomersPage';
import MarketplacePage from './pages/MarketplacePage';
import ProfilePage from './pages/ProfilePage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import ReportsPage from './pages/ReportsPage';
import SellRequestPage from './pages/SellRequestPage';
import {
  VISITOR_SESSION,
  type CalendarAppointmentRecord,
  type NavDestination,
  type PendingReviewItem,
  type PropertyRecord,
  type UserSession,
} from './types';

const SESSION_STORAGE_KEY = 'gib_emlak_session_v3';
const THEME_STORAGE_KEY = 'gib_emlak_theme_v3';

export function App() {
  const [route, setRoute] = useState<RouteState>(() =>
    parseRouteFromLocation(),
  );
  const [session, setSession] = useState<UserSession>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as UserSession;
    } catch {
      // ignore
    }
    return VISITOR_SESSION;
  });

  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [selectedProperty, setSelectedProperty] =
    useState<PropertyRecord | null>(null);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(
    null,
  );
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReviewItem | null>(
    null,
  );
  const [reviewDeferredForSession, setReviewDeferredForSession] =
    useState(false);
  const [pendingCancellation, setPendingCancellation] =
    useState<CalendarAppointmentRecord | null>(null);
  const [cancelNoticeDeferred, setCancelNoticeDeferred] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3400);
  };

  // Madde 13: Rol Bazlı Route Guard (Müşteri veya Ziyaretçi kurumsal sayfalara URL'den erişemez)
  useEffect(() => {
    if (isCorporateOnlyPage(route.page) && session.role !== 'AGENT') {
      const safe = pushRouteToHistory(
        {
          page: 'marketplace',
          listingType: 'ALL',
          searchQuery: '',
        },
        true,
      );
      setRoute(safe);
      showToast(
        'Bu sayfaya yalnızca yetkili kurumsal emlak ofisi hesapları erişebilir.',
      );
    }
  }, [route.page, session.role]);

  // Tarayıcı Geri / İleri (popstate) senkronizasyonu
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseRouteFromLocation();
      if (isCorporateOnlyPage(parsed.page) && session.role !== 'AGENT') {
        const safe = pushRouteToHistory(
          { page: 'marketplace', listingType: 'ALL', searchQuery: '' },
          true,
        );
        setRoute(safe);
        return;
      }
      setRoute(parsed);
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [session.role]);

  // Açık / Koyu Tema sınıfı
  useEffect(() => {
    const root = document.documentElement;
    if (colorScheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, colorScheme);
  }, [colorScheme]);

  // Tamamlanan randevu değerlendirme pop-up'ı (Müşteri giriş yaptığında / açılışta)
  useEffect(() => {
    if (session.role !== 'CUSTOMER' || !session.customer?.id) {
      setPendingReview(null);
      return;
    }
    if (reviewDeferredForSession) return;
    let cancelled = false;
    void fetchPendingReview(session.customer.id)
      .then((res) => {
        if (!cancelled) {
          setPendingReview(res.pending);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session.role, session.customer?.id, reviewDeferredForSession]);

  // Danışman / Ofis giriş yaptığında müşteri tarafından iptal edilen randevu uyarısını göster
  useEffect(() => {
    if (session.role !== 'AGENT' || !session.agency?.id) {
      setPendingCancellation(null);
      return;
    }
    if (cancelNoticeDeferred) return;
    let cancelled = false;
    void fetchPendingCancellationNotice(session.agency.id)
      .then((res) => {
        if (!cancelled) {
          setPendingCancellation(res.pending);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session.role, session.agency?.id, cancelNoticeDeferred]);

  const navigateTo = (
    page: NavDestination,
    opts?: {
      propertyId?: number | null;
      agencyId?: number | null;
      advisorId?: number | null;
      profileTab?: ProfileTabKey;
      authTab?: AuthTabKey;
      listingType?: 'ALL' | 'SATILIK' | 'KIRALIK';
      city?: string;
      district?: string;
      neighborhood?: string;
      viewMode?: ListingDisplayMode;
      searchQuery?: string;
    },
  ) => {
    if (isCorporateOnlyPage(page) && session.role !== 'AGENT') {
      showToast(
        'Bu sayfaya yalnızca yetkili kurumsal emlak ofisi hesapları erişebilir.',
      );
      return;
    }
    const next = pushRouteToHistory({
      page,
      propertyId:
        opts?.propertyId !== undefined ? opts.propertyId : route.propertyId,
      agencyId: opts?.agencyId !== undefined ? opts.agencyId : route.agencyId,
      advisorId:
        opts?.advisorId !== undefined ? opts.advisorId : route.advisorId,
      profileTab: opts?.profileTab ?? route.profileTab,
      authTab: opts?.authTab ?? route.authTab,
      listingType: opts?.listingType ?? route.listingType,
      city: opts?.city !== undefined ? opts.city : route.city,
      district: opts?.district !== undefined ? opts.district : route.district,
      neighborhood:
        opts?.neighborhood !== undefined
          ? opts.neighborhood
          : route.neighborhood,
      viewMode:
        opts?.viewMode !== undefined ? opts.viewMode : route.viewMode,
      searchQuery:
        opts?.searchQuery !== undefined ? opts.searchQuery : route.searchQuery,
    });
    setRoute(next);
    window.scrollTo(0, 0);
  };

  const handleSelectProperty = (property: PropertyRecord) => {
    setSelectedProperty(property);
    navigateTo('property-detail', { propertyId: property.id });
  };

  const handleSelectAgency = (agencyId: number, advisorId?: number) => {
    navigateTo('agency-storefront', {
      agencyId,
      advisorId: advisorId ?? null,
    });
  };

  const handleRequireAuth = (reason: string) => {
    setAuthPromptMessage(reason);
    navigateTo('auth', { authTab: 'login' });
  };

  const handleLoginSuccess = (user: UserSession) => {
    setReviewDeferredForSession(false);
    setCancelNoticeDeferred(false);
    setSession(user);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    setAuthPromptMessage(null);
    showToast(`Hoş geldiniz, ${user.full_name}`);
    if (user.role === 'AGENT') {
      const next = pushRouteToHistory({ page: 'properties' });
      setRoute(next);
    } else {
      const next = pushRouteToHistory({
        page: 'marketplace',
        listingType: 'ALL',
        searchQuery: '',
      });
      setRoute(next);
    }
  };

  const handleLogout = () => {
    setSession(VISITOR_SESSION);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    showToast('Oturumunuz güvenli şekilde kapatıldı.');
    const next = pushRouteToHistory({
      page: 'marketplace',
      listingType: 'ALL',
      searchQuery: '',
    });
    setRoute(next);
  };

  // Madde 4: Ana Sayfa (Hero açık) vs Satılık/Kiralık/Arama/Konum Filtresi görünümü
  const isHomeHeroMode =
    route.page === 'marketplace' &&
    route.listingType === 'ALL' &&
    !route.searchQuery &&
    !route.city &&
    !route.district &&
    !route.neighborhood;

  const isAllowedCorporate = session.role === 'AGENT';

  const motionPageKey =
    route.page === 'marketplace'
      ? isHomeHeroMode
        ? 'marketplace-home'
        : `marketplace-${route.listingType}-list`
      : route.page === 'property-detail'
        ? `detail-${route.propertyId}`
        : route.page === 'agency-storefront'
          ? `storefront-${route.agencyId}`
          : route.page;

  return (
    <div>
      <AppNavbar
        activePage={route.page}
        listingType={route.listingType}
        isHomeHeroMode={isHomeHeroMode}
        session={session}
        colorScheme={colorScheme}
        searchQuery={route.searchQuery}
        onSearchSubmit={(submittedText) => {
          const cleaned = submittedText.trim();
          if (route.page === 'agencies-directory') {
            navigateTo('agencies-directory', { searchQuery: cleaned });
          } else {
            navigateTo('marketplace', {
              listingType: route.listingType,
              searchQuery: cleaned,
            });
          }
        }}
        onToggleColorScheme={() =>
          setColorScheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
        }
        onNavigate={(page, opts) =>
          navigateTo(page, {
            ...opts,
            ...(opts?.searchQuery === ''
              ? { city: '', district: '', neighborhood: '' }
              : {}),
          })
        }
        onLogout={handleLogout}
      />

      <div
        style={{
          position: 'relative',
          overflowX: 'clip',
          minHeight: 'calc(100vh - var(--navbar-height, 68px))',
        }}
      >
        <div key={motionPageKey} style={{ width: '100%' }}>
        {route.page === 'marketplace' && (
            <MarketplacePage
              session={session}
              committedSearchQuery={route.searchQuery}
              initialListingType={route.listingType}
              initialCity={route.city}
              initialDistrict={route.district}
              initialNeighborhood={route.neighborhood}
              displayMode={route.viewMode}
              onChangeDisplayMode={(m) =>
                navigateTo('marketplace', { viewMode: m })
              }
              isHomeHeroMode={isHomeHeroMode}
              onCommitSearch={(q) =>
                navigateTo('marketplace', {
                  listingType: route.listingType,
                  searchQuery: q.trim(),
                })
              }
              onChangeListingType={(tx) =>
                navigateTo('marketplace', {
                  listingType: tx,
                  searchQuery: tx === 'ALL' ? '' : route.searchQuery,
                  ...(tx === 'ALL'
                    ? { city: '', district: '', neighborhood: '' }
                    : {}),
                })
              }
              onSelectProperty={handleSelectProperty}
              onSelectAgency={handleSelectAgency}
              onRequireAuth={handleRequireAuth}
              onOpenAiSearch={() => setAiSearchOpen(true)}
              onNotify={showToast}
            />
          )}

          {route.page === 'property-detail' && (
            <PropertyDetailPage
              propertyId={route.propertyId}
              initialProperty={selectedProperty}
              session={session}
              onSelectProperty={handleSelectProperty}
              onSelectAgency={handleSelectAgency}
              onBackToMarketplace={(filters) =>
                navigateTo('marketplace', {
                  listingType: filters?.listingType ?? 'ALL',
                  city: filters?.city ?? '',
                  district: filters?.district ?? '',
                  neighborhood: filters?.neighborhood ?? '',
                  searchQuery: '',
                })
              }
              onOpenMessages={() =>
                navigateTo('profile', { profileTab: 'messages' })
              }
              onRequireAuth={handleRequireAuth}
              onNotify={showToast}
            />
          )}

          {route.page === 'agencies-directory' && (
            <AgenciesDirectoryPage
              committedSearchQuery={route.searchQuery}
              onSelectAgency={(agId) => handleSelectAgency(agId)}
              onBackToHome={() =>
                navigateTo('marketplace', { listingType: 'ALL', searchQuery: '' })
              }
            />
          )}

          {route.page === 'agency-storefront' && (
            <AgencyStorefrontPage
              agencyId={route.agencyId}
              initialAdvisorId={route.advisorId}
              session={session}
              onSelectProperty={handleSelectProperty}
              onBackToDirectory={() => navigateTo('agencies-directory')}
              onBackToMarketplace={() =>
                navigateTo('marketplace', {
                  listingType: 'ALL',
                  city: '',
                  district: '',
                  neighborhood: '',
                  searchQuery: '',
                })
              }
              onRequireAuth={handleRequireAuth}
              onNotify={showToast}
            />
          )}

          {route.page === 'auth' && (
            <AuthPage
              initialTab={route.authTab}
              authPromptMessage={authPromptMessage}
              onLoginSuccess={handleLoginSuccess}
            />
          )}

          {route.page === 'profile' && (
            <ProfilePage
              session={session}
              initialTab={route.profileTab}
              onTabChange={(tab) => navigateTo('profile', { profileTab: tab })}
              onSessionUpdate={(user) => {
                setSession(user);
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
              }}
              onSelectProperty={handleSelectProperty}
              onLogout={handleLogout}
              onNotify={showToast}
            />
          )}

          {route.page === 'sell-request' && (
            <SellRequestPage
              session={session}
              onInspectAgency={(agId) => handleSelectAgency(agId)}
              onSuccess={(msg) => {
                showToast(msg);
                if (session.role === 'CUSTOMER') {
                  navigateTo('profile', { profileTab: 'sell-requests' });
                } else {
                  navigateTo('marketplace', {
                    listingType: 'ALL',
                    searchQuery: '',
                  });
                }
              }}
            />
          )}

          {isAllowedCorporate && route.page === 'calendar' && (
            <CalendarPage session={session} onNotify={showToast} />
          )}

          {isAllowedCorporate && route.page === 'properties' && (
            <PropertiesPage
              session={session}
              globalSearchQuery={route.searchQuery}
              onSelectProperty={handleSelectProperty}
              onNotify={showToast}
            />
          )}

          {isAllowedCorporate && route.page === 'customers' && (
            <CustomersPage
              session={session}
              globalSearchQuery={route.searchQuery}
              onNotify={showToast}
            />
          )}

          {isAllowedCorporate && route.page === 'agency' && (
            <AgencyProfilePage
              session={session}
              onPreviewStorefront={(agId) => handleSelectAgency(agId)}
              onNotify={showToast}
            />
          )}

          {isAllowedCorporate && route.page === 'reports' && (
            <ReportsPage session={session} />
          )}
        </div>
      </div>

      <AiSearchModal
        isOpen={aiSearchOpen}
        onClose={() => setAiSearchOpen(false)}
        onSelectProperty={handleSelectProperty}
      />

      <RatingModal
        pending={pendingReview}
        session={session}
        onRemindLater={() => {
          setPendingReview(null);
          setReviewDeferredForSession(true);
        }}
        onCompleted={(msg) => {
          setPendingReview(null);
          showToast(msg);
        }}
      />

      <CancellationNoticeModal
        pending={pendingCancellation}
        onRemindLater={() => {
          setPendingCancellation(null);
          setCancelNoticeDeferred(true);
        }}
        onDismissed={(msg) => {
          setPendingCancellation(null);
          showToast(msg);
        }}
      />

      {toastMessage && <div className="app-toast">{toastMessage}</div>}
    </div>
  );
}

export default App;
