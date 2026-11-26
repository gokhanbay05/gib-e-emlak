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
  onOpenAuth: () => void;
  onLogout: () => void;
  children: ReactNode;
}

/**
 * Rol bazlı ana uygulama çerçevesi.
 * - Emlakçı, Müşteri ve Ziyaretçi yalnızca kendi yetkili menülerini görür.
 * - Mobilde MobileNav çekmecesi ile tam uyumludur.
 */
export function AppLayout({
  selectedNav,
  onNavigate,
  currentUser,
  onOpenAuth,
  onLogout,
  children,
}: AppLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleNavigate = (dest: NavDestination) => {
    onNavigate(dest);
    setIsMobileNavOpen(false);
  };

  const navHeadingTitle =
    currentUser.role === 'AGENT'
      ? (currentUser.agency?.name ?? 'Emlak İşletmesi')
      : currentUser.role === 'CUSTOMER'
        ? currentUser.full_name
        : 'Ziyaretçi Modu';

  const navHeadingSubtitle =
    currentUser.role === 'AGENT'
      ? 'Emlak İşletmesi Paneli'
      : currentUser.role === 'CUSTOMER'
        ? 'Kayıtlı Müşteri'
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
            currentUser.role === 'VISITOR' ? (
              <HStack gap={1.5} vAlign="center">
                <Button
                  label="Giriş Yap / Kayıt Ol"
                  variant="primary"
                  size="sm"
                  onClick={onOpenAuth}
                />
              </HStack>
            ) : (
              <HStack gap={1.5} vAlign="center">
                <Avatar
                  name={currentUser.full_name}
                  src={currentUser.agency?.logo_url ?? undefined}
                  size="sm"
                />
                <Text size="sm" weight="medium">
                  {currentUser.full_name}
                </Text>
                <Button
                  label="Çıkış Yap"
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                />
              </HStack>
            )
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
          <NavContent
            role={currentUser.role}
            selectedNav={selectedNav}
            onNavigate={handleNavigate}
          />
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
          <NavContent
            role={currentUser.role}
            selectedNav={selectedNav}
            onNavigate={handleNavigate}
          />
        </MobileNav>
      }
    >
      {children}
    </AppShell>
  );
}
