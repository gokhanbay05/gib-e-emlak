import { useEffect, useState } from 'react';
import { fetchSystemOverview } from './api/agencies';
import { AppLayout } from './components/layout/AppLayout';
import { AgencyProfilePage } from './pages/AgencyProfilePage';
import { AuthPage } from './pages/AuthPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { PropertiesPage } from './pages/PropertiesPage';
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
  Exclude<NavDestination, 'agency' | 'properties' | 'auth' | 'system'>,
  { title: string; description: string }
> = {
  customers: {
    title: 'Müşteri Yönetimi',
    description: 'Alıcı, satıcı, kiralık mülk sahibi ve kiracı müşteri kayıtları (P4).',
  },
  search: {
    title: 'İlan Arama ve Yazıcı Çıktısı',
    description: 'Çoklu filtreleme, talep eşleştirme ve PDF bilgi fişi çıktısı (P6).',
  },
  marketplace: {
    title: 'Ortak İlan Vitrini',
    description: 'Girişsiz ilan gezme, filtreleme ve favoriler (P7).',
  },
  'sell-request': {
    title: 'Evimi Sat / Emlakçı Seç',
    description: 'Yetki belgeli emlak ofislerini listeleme ve satış başvurusu (P7).',
  },
  calendar: {
    title: 'Randevu Takvimi',
    description: 'Saat dilimli takvim, manuel saat kapatma ve 6 saat iptal kuralı (P8–P9).',
  },
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

    if (selectedNav === 'properties') {
      return (
        <PropertiesPage
          currentUser={currentUser}
          onNavigateAuth={() => setSelectedNav('auth')}
          onDataChanged={() => void loadOverview()}
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
      onNavigate={setSelectedNav}
      currentUser={currentUser}
      onLogout={() => setCurrentUser(VISITOR_SESSION)}
    >
      {renderPage()}
    </AppLayout>
  );
}
