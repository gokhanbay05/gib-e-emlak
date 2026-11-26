import { useEffect, useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { AgencyProfilePage } from './pages/AgencyProfilePage';
import { AuthPage } from './pages/AuthPage';
import { CalendarPage } from './pages/CalendarPage';
import { CustomersPage } from './pages/CustomersPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { PropertiesPage } from './pages/PropertiesPage';
import { PropertySearchPage } from './pages/PropertySearchPage';
import { SellRequestPage } from './pages/SellRequestPage';
import {
  type NavDestination,
  type SessionAgency,
  type UserSession,
  VISITOR_SESSION,
} from './types';

const SESSION_STORAGE_KEY = 'gib_emlak_active_session_v1';

const ROLE_DEFAULT_NAV: Record<UserSession['role'], NavDestination> = {
  AGENT: 'agency',
  CUSTOMER: 'marketplace',
  VISITOR: 'marketplace',
};

const ROLE_ALLOWED_NAVS: Record<UserSession['role'], NavDestination[]> = {
  AGENT: [
    'agency',
    'customers',
    'properties',
    'search',
    'calendar',
    'ai-match',
    'reports',
  ],
  CUSTOMER: ['marketplace', 'sell-request', 'calendar', 'ai-match'],
  VISITOR: ['marketplace', 'sell-request'],
};

const PLACEHOLDER_META: Record<
  'ai-match' | 'reports',
  { title: string; description: string }
> = {
  'ai-match': {
    title: 'Akıllı Eşleştirme',
    description:
      'Doğal dil tasviri ile yapay zeka destekli ilan eşleştirme (P10).',
  },
  reports: {
    title: 'Performans Raporları',
    description:
      'Satış, kiralama ve randevu saat dağılımı istatistikleri (P11).',
  },
};

function loadSavedSession(): UserSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSession;
    if (parsed && typeof parsed.role === 'string') {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() =>
    loadSavedSession(),
  );
  const [selectedNav, setSelectedNav] = useState<NavDestination>(() => {
    const saved = loadSavedSession();
    return saved ? ROLE_DEFAULT_NAV[saved.role] : 'agency';
  });
  const [marketplaceAgencyId, setMarketplaceAgencyId] = useState<number | null>(
    null,
  );

  // Oturumu tarayıcıda sakla
  useEffect(() => {
    try {
      if (currentUser) {
        window.localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify(currentUser),
        );
      } else {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [currentUser]);

  const handleAuthenticated = (session: UserSession) => {
    setCurrentUser(session);
    setSelectedNav(ROLE_DEFAULT_NAV[session.role]);
    setMarketplaceAgencyId(null);
  };

  const handleContinueAsVisitor = () => {
    setCurrentUser(VISITOR_SESSION);
    setSelectedNav('marketplace');
    setMarketplaceAgencyId(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setMarketplaceAgencyId(null);
  };

  const handleAgencyUpdated = (updatedAgency: SessionAgency) => {
    setCurrentUser((prev) =>
      prev ? { ...prev, agency: updatedAgency } : null,
    );
  };

  const handleNavigate = (dest: NavDestination) => {
    if (!currentUser) return;
    if (dest === 'auth') {
      handleLogout();
      return;
    }
    const allowed = ROLE_ALLOWED_NAVS[currentUser.role];
    const target = allowed.includes(dest)
      ? dest
      : ROLE_DEFAULT_NAV[currentUser.role];

    if (target === 'marketplace') {
      setMarketplaceAgencyId(null);
    }
    setSelectedNav(target);
  };

  // Oturum yoksa doğrudan tam ekran Giriş / Kayıt ekranını göster
  if (!currentUser) {
    return (
      <AuthPage
        onAuthenticated={handleAuthenticated}
        onContinueAsVisitor={handleContinueAsVisitor}
      />
    );
  }

  // Rol koruması: aktif sayfa bu role ait değilse varsayılan sayfaya çek
  const allowedNavs = ROLE_ALLOWED_NAVS[currentUser.role];
  const safeNav = allowedNavs.includes(selectedNav)
    ? selectedNav
    : ROLE_DEFAULT_NAV[currentUser.role];

  const noop = () => {};

  const renderPage = () => {
    if (safeNav === 'agency') {
      return (
        <AgencyProfilePage
          currentUser={currentUser}
          onAgencyUpdated={handleAgencyUpdated}
          onNavigateAuth={handleLogout}
        />
      );
    }

    if (safeNav === 'customers') {
      return (
        <CustomersPage
          currentUser={currentUser}
          onNavigateAuth={handleLogout}
          onDataChanged={noop}
        />
      );
    }

    if (safeNav === 'properties') {
      return (
        <PropertiesPage
          currentUser={currentUser}
          onNavigateAuth={handleLogout}
          onDataChanged={noop}
        />
      );
    }

    if (safeNav === 'search') {
      return (
        <PropertySearchPage
          currentUser={currentUser}
          onNavigateAuth={handleLogout}
          onDataChanged={noop}
        />
      );
    }

    if (safeNav === 'calendar') {
      return (
        <CalendarPage
          currentUser={currentUser}
          onNavigateAuth={handleLogout}
          onDataChanged={noop}
        />
      );
    }

    if (safeNav === 'marketplace') {
      return (
        <MarketplacePage
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onNavigateAuth={handleLogout}
          initialAgencyId={marketplaceAgencyId}
        />
      );
    }

    if (safeNav === 'sell-request') {
      return (
        <SellRequestPage
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onNavigateAuth={handleLogout}
          onDataChanged={noop}
          onViewAgencyListings={(agencyId) => {
            setMarketplaceAgencyId(agencyId);
            setSelectedNav('marketplace');
          }}
        />
      );
    }

    const meta = PLACEHOLDER_META[safeNav as 'ai-match' | 'reports'];
    return (
      <PlaceholderPage
        title={meta.title}
        description={meta.description}
        onNavigate={handleNavigate}
      />
    );
  };

  return (
    <AppLayout
      selectedNav={safeNav}
      onNavigate={handleNavigate}
      currentUser={currentUser}
      onOpenAuth={handleLogout}
      onLogout={handleLogout}
    >
      {renderPage()}
    </AppLayout>
  );
}
