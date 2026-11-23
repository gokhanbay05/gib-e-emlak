import { SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import type { NavDestination } from '../../types';

interface NavContentProps {
  selectedNav: NavDestination;
  onNavigate: (dest: NavDestination) => void;
}

/**
 * Masaüstü SideNav ve mobil MobileNav çekmecesi tarafından paylaşılan sade menü.
 */
export function NavContent({ selectedNav, onNavigate }: NavContentProps) {
  return (
    <>
      <SideNavSection title="İşletme Yönetimi">
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

      <SideNavSection title="Müşteri Vitrini">
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
      </SideNavSection>

      <SideNavSection title="Hesap">
        <SideNavItem
          label="Giriş / Kayıt"
          isSelected={selectedNav === 'auth'}
          onClick={() => onNavigate('auth')}
        />
        <SideNavItem
          label="Sistem Özeti"
          isSelected={selectedNav === 'system'}
          onClick={() => onNavigate('system')}
        />
      </SideNavSection>
    </>
  );
}
