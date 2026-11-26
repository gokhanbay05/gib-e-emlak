import { SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import type { NavDestination, UserSession } from '../../types';

interface NavContentProps {
  role: UserSession['role'];
  selectedNav: NavDestination;
  onNavigate: (dest: NavDestination) => void;
}

/**
 * Kullanıcının rolüne (AGENT / CUSTOMER / VISITOR) göre tamamen ayrışmış yan menü.
 * Her rol yalnızca kendi yetkili olduğu ekranları görür.
 */
export function NavContent({ role, selectedNav, onNavigate }: NavContentProps) {
  if (role === 'AGENT') {
    return (
      <SideNavSection title="Emlak İşletmesi">
        <SideNavItem
          label="İşyeri Tanımı"
          isSelected={selectedNav === 'agency'}
          onClick={() => onNavigate('agency')}
        />
        <SideNavItem
          label="Müşteri Yönetimi"
          isSelected={selectedNav === 'customers'}
          onClick={() => onNavigate('customers')}
        />
        <SideNavItem
          label="Portföy Yönetimi"
          isSelected={selectedNav === 'properties'}
          onClick={() => onNavigate('properties')}
        />
        <SideNavItem
          label="İlan Arama ve Çıktı"
          isSelected={selectedNav === 'search'}
          onClick={() => onNavigate('search')}
        />
        <SideNavItem
          label="Randevu Takvimi"
          isSelected={selectedNav === 'calendar'}
          onClick={() => onNavigate('calendar')}
        />
        <SideNavItem
          label="Akıllı Eşleştirme"
          isSelected={selectedNav === 'ai-match'}
          onClick={() => onNavigate('ai-match')}
        />
        <SideNavItem
          label="Raporlar"
          isSelected={selectedNav === 'reports'}
          onClick={() => onNavigate('reports')}
        />
      </SideNavSection>
    );
  }

  if (role === 'CUSTOMER') {
    return (
      <SideNavSection title="Müşteri Portalı">
        <SideNavItem
          label="İlan Vitrini"
          isSelected={selectedNav === 'marketplace'}
          onClick={() => onNavigate('marketplace')}
        />
        <SideNavItem
          label="Evimi Sat / Emlakçı Seç"
          isSelected={selectedNav === 'sell-request'}
          onClick={() => onNavigate('sell-request')}
        />
        <SideNavItem
          label="Randevularım"
          isSelected={selectedNav === 'calendar'}
          onClick={() => onNavigate('calendar')}
        />
        <SideNavItem
          label="AI Akıllı Arama"
          isSelected={selectedNav === 'ai-match'}
          onClick={() => onNavigate('ai-match')}
        />
      </SideNavSection>
    );
  }

  // VISITOR (Girişsiz mod — BR-08)
  return (
    <SideNavSection title="Keşfet">
      <SideNavItem
        label="İlan Vitrini"
        isSelected={selectedNav === 'marketplace'}
        onClick={() => onNavigate('marketplace')}
      />
      <SideNavItem
        label="Emlak Ofisleri"
        isSelected={selectedNav === 'sell-request'}
        onClick={() => onNavigate('sell-request')}
      />
    </SideNavSection>
  );
}
