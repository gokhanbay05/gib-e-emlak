import { useState, type ReactNode } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { MobileNav, MobileNavToggle } from '@astryxdesign/core/MobileNav';
import { SideNav, SideNavHeading } from '@astryxdesign/core/SideNav';
import { Text } from '@astryxdesign/core/Text';
import { TopNav } from '@astryxdesign/core/TopNav';
import type { NavDestination, UserSession } from '../../types';
import { NavContent } from './NavContent';

interface AppLayoutProps {
  selectedNav: NavDestination;
  onNavigate: (dest: NavDestination) => void;
  currentUser: UserSession;
  onLogout: () => void;
  children: ReactNode;
}

/**
 * Kurumsal, sade ve tam mobil uyumlu ana uygulama çerçevesi.
 * contentPadding={0} ile iç boşluk sahipliği tek noktadan `PageFrame` bileşenine verilir.
 */
export function AppLayout({
  selectedNav,
  onNavigate,
  currentUser,
  onLogout,
  children,
}: AppLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleNavigate = (dest: NavDestination) => {
    onNavigate(dest);
    setIsMobileNavOpen(false);
  };

  const navHeadingTitle =
    currentUser.agency?.name ??
    (currentUser.role === 'CUSTOMER' ? currentUser.full_name : 'Ziyaretçi Modu');

  const navHeadingSubtitle =
    currentUser.role === 'AGENT'
      ? 'Emlak İşletmesi Paneli'
      : currentUser.role === 'CUSTOMER'
        ? 'Bireysel Üyelik'
        : 'Girişsiz Gezinme';

  return (
    <AppShell
      contentPadding={0}
      variant="surface"
      topNav={
        <TopNav
          heading={
            <HStack gap={1.5} vAlign="center">
              <MobileNavToggle label="Menüyü aç" />
              <Text weight="bold">GİB e-Emlak</Text>
            </HStack>
          }
          endContent={
            <HStack gap={1.5} vAlign="center">
              <Avatar
                name={currentUser.full_name}
                src={currentUser.agency?.logo_url ?? undefined}
                size="sm"
              />
              <Button
                label={currentUser.role === 'VISITOR' ? 'Giriş Yap' : 'Hesap'}
                variant="secondary"
                size="sm"
                onClick={() => handleNavigate('auth')}
              />
              {currentUser.role !== 'VISITOR' && (
                <Button
                  label="Çıkış"
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                />
              )}
            </HStack>
          }
        />
      }
      sideNav={
        <SideNav
          collapsible
          header={
            <SideNavHeading
              heading={navHeadingTitle}
              subheading={navHeadingSubtitle}
            />
          }
        >
          <NavContent selectedNav={selectedNav} onNavigate={handleNavigate} />
        </SideNav>
      }
      mobileNav={
        <MobileNav
          isOpen={isMobileNavOpen}
          onOpenChange={setIsMobileNavOpen}
          label="Ana menü"
          header={
            <SideNavHeading
              heading={navHeadingTitle}
              subheading={navHeadingSubtitle}
            />
          }
        >
          <NavContent selectedNav={selectedNav} onNavigate={handleNavigate} />
        </MobileNav>
      }
    >
      {children}
    </AppShell>
  );
}
