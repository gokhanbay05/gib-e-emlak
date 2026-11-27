import React, { useEffect, useState } from 'react';
import { AppNavbar } from './components/layout';
import AiSearchModal from './components/modals/AiSearchModal';
import {
  parseRouteFromLocation,
  pushRouteToHistory,
  type AuthTabKey,
  type ProfileTabKey,
  type RouteState,
} from './lib/router';
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
  type NavDestination,
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

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] =
    useState<PropertyRecord | null>(null);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(
    null,
  );
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tarayıcı Geri / İleri (popstate) senkronizasyonu
  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseRouteFromLocation());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3400);
  };

  const navigateTo = (
    page: NavDestination,
    opts?: {
      propertyId?: number | null;
      agencyId?: number | null;
      advisorId?: number | null;
      profileTab?: ProfileTabKey;
      authTab?: AuthTabKey;
      listingType?: 'ALL' | 'SATILIK' | 'KIRALIK';
    },
  ) => {
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
    });
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setSession(user);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    setAuthPromptMessage(null);
    showToast(`Hoş geldiniz, ${user.full_name}`);
    if (user.role === 'AGENT') {
      navigateTo('properties');
    } else {
      navigateTo('marketplace');
    }
  };

  const handleLogout = () => {
    setSession(VISITOR_SESSION);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    showToast('Oturumunuz güvenli şekilde kapatıldı.');
    navigateTo('marketplace', { listingType: 'ALL' });
  };

  return (
    <div>
      <AppNavbar
        activePage={route.page}
        listingType={route.listingType}
        session={session}
        colorScheme={colorScheme}
        searchQuery={globalSearchQuery}
        onSearchQueryChange={setGlobalSearchQuery}
        onSearchSubmit={() => {
          if (
            route.page !== 'marketplace' &&
            route.page !== 'properties' &&
            route.page !== 'customers'
          ) {
            navigateTo('marketplace');
          }
        }}
        onToggleColorScheme={() =>
          setColorScheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
        }
        onNavigate={(page, opts) => navigateTo(page, opts)}
        onLogout={handleLogout}
      />

      {route.page === 'marketplace' && (
        <MarketplacePage
          session={session}
          globalSearchQuery={globalSearchQuery}
          initialListingType={route.listingType}
          onGlobalSearchChange={setGlobalSearchQuery}
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
          onBackToMarketplace={() =>
            navigateTo('marketplace', { listingType: 'ALL' })
          }
          onRequireAuth={handleRequireAuth}
          onNotify={showToast}
        />
      )}

      {route.page === 'agency-storefront' && (
        <AgencyStorefrontPage
          agencyId={route.agencyId}
          initialAdvisorId={route.advisorId}
          session={session}
          onSelectProperty={handleSelectProperty}
          onSelectAgency={handleSelectAgency}
          onBackToMarketplace={() =>
            navigateTo('marketplace', { listingType: 'ALL' })
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
          onSuccess={(msg) => {
            showToast(msg);
            if (session.role === 'CUSTOMER') {
              navigateTo('profile', { profileTab: 'sell-requests' });
            } else {
              navigateTo('marketplace');
            }
          }}
        />
      )}

      {route.page === 'calendar' && (
        <CalendarPage session={session} onNotify={showToast} />
      )}

      {route.page === 'properties' && (
        <PropertiesPage
          session={session}
          globalSearchQuery={globalSearchQuery}
          onSelectProperty={handleSelectProperty}
          onNotify={showToast}
        />
      )}

      {route.page === 'customers' && (
        <CustomersPage
          session={session}
          globalSearchQuery={globalSearchQuery}
          onNotify={showToast}
        />
      )}

      {route.page === 'agency' && (
        <AgencyProfilePage
          session={session}
          onPreviewStorefront={(agId) => handleSelectAgency(agId)}
          onNotify={showToast}
        />
      )}

      {route.page === 'reports' && <ReportsPage session={session} />}

      <AiSearchModal
        isOpen={aiSearchOpen}
        onClose={() => setAiSearchOpen(false)}
        onSelectProperty={handleSelectProperty}
      />

      {toastMessage && <div className="app-toast">{toastMessage}</div>}
    </div>
  );
}

export default App;
