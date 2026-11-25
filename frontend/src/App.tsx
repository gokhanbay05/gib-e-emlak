import { useEffect, useState } from 'react';
import { fetchSystemOverview } from './api/agencies';
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
import { SystemPage } from './pages/SystemPage';
import {
  DEFAULT_AGENT_SESSION,
  type NavDestination,
  type SessionAgency,
  type SystemOverview,
  type UserSession,
  VISITOR_SESSION,
} from './types';

const PLACEHOLDER_META: Record<
  Exclude<
    NavDestination,
    | 'agency'
    | 'customers'
    | 'properties'
    | 'search'
    | 'calendar'
    | 'marketplace'
    | 'sell-request'
    | 'auth'
    | 'system'
  >,
  { title: string; description: string }
> = {
  'ai-match': {
    title: 'Akıllı Eşleştirme',
    description: 'Doğal dil tasviri ile yapay zeka destekli ilan eşleştirme (P10).',
  },
  reports: {
    title: 'Performans Raporları',
    description: 'Satış, kiralama ve randevu saat dağılımı istatistikleri (P11).',
  },
};

export default function App() {
  const [selectedNav, setSelectedNav] = useState<NavDestination>('agency');
  const [marketplaceAgencyId, setMarketplaceAgencyId] = useState<number | null>(
    null,
  );
  const [currentUser, setCurrentUser] = useState<UserSession>(
    DEFAULT_AGENT_SESSION,
  );
  const [overview, setOverview] = useState<SystemOverview | null>(null);

  const loadOverview = async () => {
    try {
      const data = await fetchSystemOverview();
      setOverview(data);
    } catch {
      // ignore offline
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const handleAgencyUpdated = (updatedAgency: SessionAgency) => {
    setCurrentUser((prev) => ({ ...prev, agency: updatedAgency }));
  };

  const renderPage = () => {
    if (selectedNav === 'agency') {
      return (
        <AgencyProfilePage
          currentUser={currentUser}
          onAgencyUpdated={handleAgencyUpdated}
          onNavigateAuth={() => setSelectedNav('auth')}
        />
      );
    }

    if (selectedNav === 'customers') {
      return (
        <CustomersPage
          currentUser={currentUser}
          onNavigateAuth={() => setSelectedNav('auth')}
          onDataChanged={() => void loadOverview()}
        />
      );
    }

    if (selectedNav === 'properties') {
      return (
        <PropertiesPage
          currentUser={currentUser}
          onNavigateAuth={() => setSelectedNav('auth')}
          onDataChanged={() => void loadOverview()}
        />
      );
    }

    if (selectedNav === 'search') {
      return (
        <PropertySearchPage
          currentUser={currentUser}
          onNavigateAuth={() => setSelectedNav('auth')}
          onDataChanged={() => void loadOverview()}
        />
      );
    }

    if (selectedNav === 'calendar') {
      return (
        <CalendarPage
          currentUser={currentUser}
          onNavigateAuth={() => setSelectedNav('auth')}
          onDataChanged={() => void loadOverview()}
        />
      );
    }

    if (selectedNav === 'marketplace') {
      return (
        <MarketplacePage
          currentUser={currentUser}
          onNavigate={setSelectedNav}
          onNavigateAuth={() => setSelectedNav('auth')}
          initialAgencyId={marketplaceAgencyId}
        />
      );
    }

    if (selectedNav === 'sell-request') {
      return (
        <SellRequestPage
          currentUser={currentUser}
          onNavigate={setSelectedNav}
          onNavigateAuth={() => setSelectedNav('auth')}
          onDataChanged={() => void loadOverview()}
          onViewAgencyListings={(agencyId) => {
            setMarketplaceAgencyId(agencyId);
            setSelectedNav('marketplace');
          }}
        />
      );
    }

    if (selectedNav === 'auth') {
      return (
        <AuthPage
          currentUser={currentUser}
          onSelectSession={setCurrentUser}
          onDataChanged={() => void loadOverview()}
        />
      );
    }

    if (selectedNav === 'system') {
      return <SystemPage overview={overview} />;
    }

    const meta = PLACEHOLDER_META[selectedNav];
    return (
      <PlaceholderPage
        title={meta.title}
        description={meta.description}
        onNavigate={setSelectedNav}
      />
    );
  };

  return (
    <AppLayout
      selectedNav={selectedNav}
      onNavigate={(dest) => {
        if (dest === 'marketplace') {
          setMarketplaceAgencyId(null);
        }
        setSelectedNav(dest);
      }}
      currentUser={currentUser}
      onLogout={() => setCurrentUser(VISITOR_SESSION)}
    >
      {renderPage()}
    </AppLayout>
  );
}
