import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import {
  BarChart3,
  Building2,
  Calendar,
  FileText,
  Heart,
  Home,
  KeyRound,
  LogOut,
  MessageCircle,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  User,
  Users,
  X,
} from 'lucide-react';
import type { NavDestination, UserSession } from '../../types';
import type { AuthTabKey, ProfileTabKey } from '../../lib/router';
import { cn } from '../../lib/utils';
import { Avatar, Button } from '../core';
import '../../css/layout/AppNavbar.css';

export interface AppNavbarProps {
  activePage: NavDestination;
  listingType: 'ALL' | 'SATILIK' | 'KIRALIK';
  isHomeHeroMode: boolean;
  session: UserSession;
  colorScheme: 'light' | 'dark';
  searchQuery: string;
  onSearchSubmit: (submittedText: string) => void;
  onToggleColorScheme: () => void;
  onNavigate: (
    page: NavDestination,
    opts?: {
      profileTab?: ProfileTabKey;
      authTab?: AuthTabKey;
      listingType?: 'ALL' | 'SATILIK' | 'KIRALIK';
      agencyId?: number | null;
      searchQuery?: string;
    },
  ) => void;
  onLogout: () => void;
}

interface NavLinkDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

export function AppNavbar({
  activePage,
  listingType,
  isHomeHeroMode,
  session,
  colorScheme,
  searchQuery,
  onSearchSubmit,
  onToggleColorScheme,
  onNavigate,
  onLogout,
}: AppNavbarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState(searchQuery);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isVisitor = session.role === 'VISITOR';
  const isAgent = session.role === 'AGENT';

  useEffect(() => {
    setDraftSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setMobileSearchOpen(false);
  }, [activePage, listingType]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showTopSearchBar =
    !isHomeHeroMode &&
    (activePage === 'marketplace' ||
      activePage === 'property-detail');

  const navItems: NavLinkDef[] = isAgent
    ? [
        {
          id: 'agent-vitrin',
          label: 'Vitrin',
          icon: <Home size={16} />,
          active: activePage === 'marketplace',
          onClick: () =>
            onNavigate('marketplace', {
              listingType: 'ALL',
              searchQuery: '',
            }),
        },
        {
          id: 'agent-props',
          label: 'Portföy Yönetimi',
          icon: <Building2 size={16} />,
          active: activePage === 'properties',
          onClick: () => onNavigate('properties', { searchQuery: '' }),
        },
        {
          id: 'agent-cal',
          label: 'Randevu Takvimi',
          icon: <Calendar size={16} />,
          active: activePage === 'calendar',
          onClick: () => onNavigate('calendar', { searchQuery: '' }),
        },
        {
          id: 'agent-cust',
          label: 'Müşteriler',
          icon: <Users size={16} />,
          active: activePage === 'customers',
          onClick: () => onNavigate('customers', { searchQuery: '' }),
        },
        {
          id: 'agent-reports',
          label: 'Analitik',
          icon: <BarChart3 size={16} />,
          active: activePage === 'reports',
          onClick: () => onNavigate('reports', { searchQuery: '' }),
        },
      ]
    : [
        {
          id: 'pub-home',
          label: 'Ana Sayfa',
          icon: <Home size={16} />,
          active:
            activePage === 'marketplace' &&
            listingType === 'ALL' &&
            !searchQuery,
          onClick: () =>
            onNavigate('marketplace', {
              listingType: 'ALL',
              searchQuery: '',
            }),
        },
        {
          id: 'pub-sale',
          label: 'Satılık',
          icon: <Building2 size={16} />,
          active: activePage === 'marketplace' && listingType === 'SATILIK',
          onClick: () =>
            onNavigate('marketplace', {
              listingType: 'SATILIK',
              searchQuery: '',
            }),
        },
        {
          id: 'pub-rent',
          label: 'Kiralık',
          icon: <KeyRound size={16} />,
          active: activePage === 'marketplace' && listingType === 'KIRALIK',
          onClick: () =>
            onNavigate('marketplace', {
              listingType: 'KIRALIK',
              searchQuery: '',
            }),
        },
        {
          id: 'pub-agencies',
          label: 'Emlak Ofisleri',
          icon: <Store size={16} />,
          active:
            activePage === 'agencies-directory' ||
            activePage === 'agency-storefront',
          onClick: () => onNavigate('agencies-directory', { searchQuery: '' }),
        },
      ];

  return (
    <>
      <header className="app-navbar">
        <div className="app-navbar-inner">
          {/* Sol Küme: Çizimdeki Mimari GİB [e-emlak] Logosu + İkon/Yazı Menüleri */}
          <div className="navbar-left-cluster">
            <button
              type="button"
              className="brand-logo-link"
              onClick={() =>
                onNavigate('marketplace', {
                  listingType: 'ALL',
                  searchQuery: '',
                })
              }
            >
              <span className="brand-gib-text">GİB</span>
              <span className="brand-eemlak-box">e-emlak</span>
            </button>

            <LayoutGroup id="navbar-active-tabs">
              <nav className="navbar-links" aria-label="Ana menü">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      'navbar-link-item',
                      item.active && 'is-active',
                    )}
                    onClick={item.onClick}
                    title={item.label}
                    aria-label={item.label}
                  >
                    {item.active && (
                      <motion.span
                        layoutId="navbar-active-pill"
                        className="navbar-active-pill-bg"
                        transition={{
                          type: 'spring',
                          stiffness: 340,
                          damping: 28,
                          mass: 0.85,
                        }}
                      />
                    )}
                    <span className="navbar-link-content">
                      {item.icon}
                      <span className="navbar-link-label">{item.label}</span>
                    </span>
                  </button>
                ))}
              </nav>
            </LayoutGroup>
          </div>

          {/* Orta Sabit Slot (Masaüstü Arama Çubuğu) */}
          <div className="navbar-center-slot">
            <AnimatePresence initial={false}>
              {showTopSearchBar && (
                <motion.div
                  key="navbar-search"
                  initial={{ opacity: 0, maxWidth: 0, scale: 0.88, y: -4 }}
                  animate={{ opacity: 1, maxWidth: 400, scale: 1, y: 0 }}
                  exit={{ opacity: 0, maxWidth: 0, scale: 0.88, y: -4 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="navbar-search-wrap"
                  style={{ overflow: 'hidden', originX: 0.5 }}
                >
                  <form
                    className="navbar-search-box"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onSearchSubmit(draftSearch);
                    }}
                  >
                    <span className="navbar-search-sparkle">
                      <Sparkles size={15} />
                    </span>
                    <input
                      type="text"
                      className="navbar-search-input"
                      placeholder="Kelime veya konum yazıp Ara'ya basın..."
                      value={draftSearch}
                      onChange={(e) => setDraftSearch(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="navbar-search-btn"
                      aria-label="Ara"
                      title="Ara"
                    >
                      <Search size={16} />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sağ Aksiyonlar: [Mobil Arama İkonu] + [Sat/İlan Ekle] + [En Sağda PP Avatar & Tema Menüsü] */}
          <div className="navbar-actions">
            {showTopSearchBar && (
              <button
                type="button"
                className={cn(
                  'mobile-search-toggle-btn',
                  mobileSearchOpen && 'is-open',
                )}
                onClick={() => setMobileSearchOpen((v) => !v)}
                aria-label="Arama Çubuğunu Aç"
                title="Ara"
              >
                {mobileSearchOpen ? <X size={17} /> : <Search size={17} />}
              </button>
            )}

            {!isAgent && (
              <Button
                variant="primary"
                size="sm"
                className="navbar-cta-btn"
                leftIcon={<Plus size={16} />}
                onClick={() => onNavigate('sell-request')}
                title="Evini Sat / Kiraya Ver"
              >
                <span className="nav-cta-text">Evini Sat / Kiraya Ver</span>
              </Button>
            )}

            {/* En Sağda PP / Hesap Tetikleyici (Popover menüsü sağa hizalı olduğu için ekran dışına taşmaz) */}
            <div className="user-popover-anchor" ref={popoverRef}>
              <button
                type="button"
                className="user-trigger-pill"
                onClick={() => setPopoverOpen((v) => !v)}
                title={isVisitor ? 'Giriş Yap & Tema' : session.full_name}
              >
                {isVisitor ? (
                  <User size={17} />
                ) : (
                  <Avatar
                    src={session.avatar_url}
                    name={session.full_name}
                    size="sm"
                  />
                )}
                <span
                  className="user-trigger-label"
                  style={{ fontWeight: 700, fontSize: '13px' }}
                >
                  {isVisitor ? 'Giriş / Üye Ol' : 'Profilim'}
                </span>
              </button>

              {popoverOpen && (
                <div className="user-popover-card">
                  {!isAgent && (
                    <button
                      type="button"
                      className="user-popover-cta-btn"
                      onClick={() => {
                        setPopoverOpen(false);
                        onNavigate('sell-request');
                      }}
                    >
                      <Plus size={15} />
                      <span>Evini Sat / Kiraya Ver</span>
                    </button>
                  )}
                  {isVisitor ? (
                    <div className="user-popover-list">
                      <button
                        type="button"
                        className="user-popover-item"
                        onClick={() => {
                          setPopoverOpen(false);
                          onNavigate('auth', { authTab: 'login' });
                        }}
                      >
                        <User size={15} />
                        <span>Üye Girişi Yap</span>
                      </button>
                      <button
                        type="button"
                        className="user-popover-item"
                        onClick={() => {
                          setPopoverOpen(false);
                          onNavigate('auth', { authTab: 'register-customer' });
                        }}
                      >
                        <Plus size={15} />
                        <span>Yeni Hesap Oluştur</span>
                      </button>
                      <div className="user-popover-divider" />
                      <button
                        type="button"
                        className="user-popover-item"
                        onClick={onToggleColorScheme}
                      >
                        {colorScheme === 'dark' ? (
                          <Sun size={15} />
                        ) : (
                          <Moon size={15} />
                        )}
                        <span>
                          Tema:{' '}
                          {colorScheme === 'dark'
                            ? 'Açık Görünüme Geç'
                            : 'Koyu Görünüme Geç'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="user-popover-header">
                        <div className="user-popover-name">
                          {session.full_name}
                        </div>
                        <div className="user-popover-role">
                          {isAgent
                            ? session.agency?.name ?? 'Kurumsal Emlak Ofisi'
                            : 'Bireysel Üye'}
                        </div>
                      </div>

                      {isAgent ? (
                        <div className="user-popover-list">
                          <button
                            type="button"
                            className="user-popover-item"
                            onClick={() => {
                              setPopoverOpen(false);
                              onNavigate('profile', { profileTab: 'messages' });
                            }}
                          >
                            <MessageCircle size={15} />
                            <span>Müşteri Mesajları</span>
                          </button>
                          <button
                            type="button"
                            className="user-popover-item"
                            onClick={() => {
                              setPopoverOpen(false);
                              onNavigate('profile', { profileTab: 'security' });
                            }}
                          >
                            <ShieldCheck size={15} />
                            <span>Hesap & Güvenlik Ayarları</span>
                          </button>
                          <button
                            type="button"
                            className="user-popover-item"
                            onClick={() => {
                              setPopoverOpen(false);
                              onNavigate('agency');
                            }}
                          >
                            <Store size={15} />
                            <span>Ofis & Danışman Yönetimi</span>
                          </button>
                          <button
                            type="button"
                            className="user-popover-item"
                            onClick={() => {
                              setPopoverOpen(false);
                              onNavigate('agency-storefront', {
                                agencyId: session.agency?.id ?? 1,
                              });
                            }}
                          >
                            <Building2 size={15} />
                            <span>Kurumsal Mağaza Vitrinim</span>
                          </button>
                          <div className="user-popover-divider" />
                          <button
                            type="button"
                            className="user-popover-item"
                            onClick={onToggleColorScheme}
                          >
                            {colorScheme === 'dark' ? (
                              <Sun size={15} />
                            ) : (
                              <Moon size={15} />
                            )}
                            <span>
                              Tema:{' '}
                              {colorScheme === 'dark'
                                ? 'Açık Görünüme Geç'
                                : 'Koyu Görünüme Geç'}
                            </span>
                          </button>
                          <div className="user-popover-divider" />
                          <button
                            type="button"
                            className="user-popover-item is-danger"
                            onClick={() => {
                              setPopoverOpen(false);
                              onLogout();
                            }}
                          >
                            <LogOut size={15} />
                            <span>Çıkış Yap</span>
                          </button>
                        </div>
                      ) : (
                        <div className="user-popover-list">
                          <button
                            type="button"
                            className="user-popover-item"
                            onClick={() => {
                              setPopoverOpen(false);
                              onNavigate('profile', {
                                profileTab: 'favorites',
                              });
                            }}
                          >
                            <Heart size={15} />
                            <span>Favori İlanlarım</span>
                          </button>
                          <button
                            type="button"
                            className="user-popover-item"
                            onClick={() => {
                              setPopoverOpen(false);
                              onNavigate('profile', {
                                profileTab: 'appointments',
                              });
                            }}
                          >
                            <Calendar size={15} />
                            <span>Randevularım</span>
                          </button>
                          <button
                            type="button"
                            className="user-popover-item"
                            onClick={() => {
                              setPopoverOpen(false);
                              onNavigate('profile', { profileTab: 'messages' });
                            }}
                          >
                            <MessageCircle size={15} />
                            <span>Mesajlarım</span>
                          </button>
                          <button
                            type="button"
                            className="user-popover-item"
                            onClick={() => {
                              setPopoverOpen(false);
                              onNavigate('profile', {
                                profileTab: 'sell-requests',
                              });
                            }}
                          >
                            <FileText size={15} />
                            <span>Satış / Kiralama Başvurularım</span>
                          </button>
                          <button
                            type="button"
                            className="user-popover-item"
                            onClick={() => {
                              setPopoverOpen(false);
                              onNavigate('profile', { profileTab: 'security' });
                            }}
                          >
                            <User size={15} />
                            <span>Hesap Bilgilerim & Güvenlik</span>
                          </button>
                          <div className="user-popover-divider" />
                          <button
                            type="button"
                            className="user-popover-item"
                            onClick={onToggleColorScheme}
                          >
                            {colorScheme === 'dark' ? (
                              <Sun size={15} />
                            ) : (
                              <Moon size={15} />
                            )}
                            <span>
                              Tema:{' '}
                              {colorScheme === 'dark'
                                ? 'Açık Görünüme Geç'
                                : 'Koyu Görünüme Geç'}
                            </span>
                          </button>
                          <div className="user-popover-divider" />
                          <button
                            type="button"
                            className="user-popover-item is-danger"
                            onClick={() => {
                              setPopoverOpen(false);
                              onLogout();
                            }}
                          >
                            <LogOut size={15} />
                            <span>Çıkış Yap</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobilde Büyüteç İkonuna Tıklanınca Açılan Arama Barı */}
      <AnimatePresence>
        {showTopSearchBar && mobileSearchOpen && (
          <motion.div
            key="mobile-search-dropbar"
            className="mobile-search-dropbar"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <form
              className="navbar-search-box"
              onSubmit={(e) => {
                e.preventDefault();
                setMobileSearchOpen(false);
                onSearchSubmit(draftSearch);
              }}
            >
              <span className="navbar-search-sparkle">
                <Sparkles size={15} />
              </span>
              <input
                type="text"
                className="navbar-search-input"
                placeholder="Konum veya kelime yazıp Ara'ya basın..."
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="mobile-search-submit-btn"
                aria-label="Ara"
              >
                Ara
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AppNavbar;
