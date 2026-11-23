import { useState, type ReactNode } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { Layout } from '@astryxdesign/core/Layout';
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
 * - Masaüstünde SideNav, mobilde MobileNav çekmecesi ile çalışır.
 * - Üst çubukta (TopNav) gereksiz rozet/badge yığılması yapılmaz.
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

  return (
    <AppShell
      contentPadding={3}
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
              heading="GİB e-Emlak"
              subheading={
                currentUser.agency
                  ? currentUser.agency.name
                  : 'Taşınmaz Yönetim Platformu'
              }
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
              heading="GİB e-Emlak"
              subheading={
                currentUser.agency
                  ? currentUser.agency.name
                  : 'Taşınmaz Yönetim Platformu'
              }
            />
          }
        >
          <NavContent selectedNav={selectedNav} onNavigate={handleNavigate} />
        </MobileNav>
      }
    >
      <Layout contentWidth={1040} padding={1}>
        {children}
      </Layout>
    </AppShell>
  );
}
