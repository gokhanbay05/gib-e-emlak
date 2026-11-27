import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Building2,
  Calendar,
  FileText,
  Heart,
  Home,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  User,
  Users,
} from 'lucide-react';
import type { NavDestination, UserSession } from '../../types';
import type { AuthTabKey, ProfileTabKey } from '../../lib/router';
import { cn } from '../../lib/utils';
import { Avatar, Button, Modal } from '../core';
import '../../css/layout/AppNavbar.css';

export interface AppNavbarProps {
  activePage: NavDestination;
  listingType: 'ALL' | 'SATILIK' | 'KIRALIK';
  session: UserSession;
  colorScheme: 'light' | 'dark';
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSearchSubmit: () => void;
  onToggleColorScheme: () => void;
  onNavigate: (
    page: NavDestination,
    opts?: {
      listingType?: 'ALL' | 'SATILIK' | 'KIRALIK';
      profileTab?: ProfileTabKey;
      authTab?: AuthTabKey;
      agencyId?: number;
    },
  ) => void;
  onLogout: () => void;
}

export function AppNavbar({
  activePage,
  listingType,
  session,
  colorScheme,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onToggleColorScheme,
  onNavigate,
  onLogout,
}: AppNavbarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isVisitor = session.role === 'VISITOR';
  const isAgent = session.role === 'AGENT';

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
    activePage === 'marketplace' ||
    activePage === 'property-detail' ||
    activePage === 'agency-storefront' ||
    activePage === 'properties' ||
    activePage === 'customers' ||
    activePage === 'search';

  return (
    <>
      <header className="app-navbar">
        <div className="app-navbar-inner">
          {/* Sol: Hepsiemlak Tarzı Marka Linki */}
          <button
            type="button"
            className="brand-logo-link"
            onClick={() =>
              onNavigate('marketplace', { listingType: 'ALL' })
            }
          >
            <span className="brand-roof-mark">
              <Home size={18} strokeWidth={2.4} />
            </span>
            <span className="brand-logo-text">
              GİB <span>e-Emlak</span>
            </span>
            <span className="brand-logo-badge">RESMİ</span>
          </button>

          {/* Orta-Sol: Rol Bazlı Navigasyon Linkleri */}
          <nav className="navbar-links" aria-label="Ana menü">
            {isAgent ? (
              <>
                <button
                  type="button"
                  className={cn(
                    'navbar-link-item',
                    activePage === 'marketplace' && 'is-active',
                  )}
                  onClick={() =>
                    onNavigate('marketplace', { listingType: 'ALL' })
                  }
                >
                  <Home size={15} />
                  <span>Vitrin</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    'navbar-link-item',
                    activePage === 'properties' && 'is-active',
                  )}
                  onClick={() => onNavigate('properties')}
                >
                  <Building2 size={15} />
                  <span>Portföy Yönetimi</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    'navbar-link-item',
                    activePage === 'calendar' && 'is-active',
                  )}
                  onClick={() => onNavigate('calendar')}
                >
                  <Calendar size={15} />
                  <span>Randevu Takvimi</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    'navbar-link-item',
                    activePage === 'customers' && 'is-active',
                  )}
                  onClick={() => onNavigate('customers')}
                >
                  <Users size={15} />
                  <span>Müşteriler</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    'navbar-link-item',
                    activePage === 'agency' && 'is-active',
                  )}
                  onClick={() => onNavigate('agency')}
                >
                  <Store size={15} />
                  <span>Ofis & Danışmanlar</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    'navbar-link-item',
                    activePage === 'reports' && 'is-active',
                  )}
                  onClick={() => onNavigate('reports')}
                >
                  <BarChart3 size={15} />
                  <span>Analitik</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={cn(
                    'navbar-link-item',
                    activePage === 'marketplace' &&
                      listingType === 'SATILIK' &&
                      'is-active',
                  )}
                  onClick={() =>
                    onNavigate('marketplace', { listingType: 'SATILIK' })
                  }
                >
                  <Home size={15} />
                  <span>Satılık</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    'navbar-link-item',
                    activePage === 'marketplace' &&
                      listingType === 'KIRALIK' &&
                      'is-active',
                  )}
                  onClick={() =>
                    onNavigate('marketplace', { listingType: 'KIRALIK' })
                  }
                >
                  <KeyRound size={15} />
                  <span>Kiralık</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    'navbar-link-item',
                    activePage === 'agency-storefront' && 'is-active',
                  )}
                  onClick={() =>
                    onNavigate('agency-storefront', { agencyId: 1 })
                  }
                >
                  <Users size={15} />
                  <span>Danışmanlar & Ofisler</span>
                </button>
              </>
            )}
          </nav>

          {/* Orta: Hepsiemlak Yuvarlak Arama Çubuğu */}
          {showTopSearchBar && (
            <div className="navbar-search-wrap">
              <form
                className="navbar-search-box"
                onSubmit={(e) => {
                  e.preventDefault();
                  onSearchSubmit();
                }}
              >
                <span className="navbar-search-sparkle">
                  <Sparkles size={15} />
                </span>
                <input
                  type="text"
                  className="navbar-search-input"
                  placeholder={
                    activePage === 'customers'
                      ? 'Müşteri adı, telefon veya T.C. ile arayın...'
                      : 'Konum, ilan no ya da emlak ofisi adıyla arayın...'
                  }
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                />
                <button
                  type="submit"
                  className="navbar-search-btn"
                  aria-label="Ara"
                >
                  <Search size={16} />
                </button>
              </form>
            </div>
          )}

          {/* Sağ: Tema İkonu + Screenshot #5 Kullanıcı Popover + Ana CTA */}
          <div className="navbar-actions">
            <Button
              variant="ghost"
              size="icon"
              pill
              onClick={onToggleColorScheme}
              aria-label={
                colorScheme === 'dark' ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'
              }
              title={
                colorScheme === 'dark' ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'
              }
            >
              {colorScheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>

            {/* Kullanıcı / Giriş Yap Popover Menüsü (Screenshot #5) */}
            <div className="user-popover-anchor" ref={popoverRef}>
              {isVisitor ? (
                <button
                  type="button"
                  className="user-trigger-pill"
                  onClick={() => setPopoverOpen((v) => !v)}
                >
                  <div className="user-trigger-text">
                    <span className="user-trigger-top">Giriş Yap</span>
                    <span className="user-trigger-bottom">veya Üye Ol</span>
                  </div>
                  <User size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  className="user-trigger-pill"
                  onClick={() => setPopoverOpen((v) => !v)}
                  title={session.full_name}
                >
                  <Avatar name={session.full_name} size="sm" />
                  <div className="user-trigger-text">
                    <span className="user-trigger-top">
                      {isAgent ? 'Kurumsal' : 'Profilim'}
                    </span>
                    <span
                      className="user-trigger-bottom"
                      style={{ color: 'var(--color-text-dark)' }}
                    >
                      {session.full_name.split(' ')[0]}
                    </span>
                  </div>
                </button>
              )}

              {popoverOpen && (
                <div className="user-popover-card">
                  {isVisitor ? (
                    <>
                      <Button
                        variant="primary"
                        pill
                        fullWidth
                        onClick={() => {
                          setPopoverOpen(false);
                          onNavigate('auth', { authTab: 'login' });
                        }}
                      >
                        Üye Girişi
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setPopoverOpen(false);
                          onNavigate('auth', { authTab: 'register-customer' });
                        }}
                      >
                        GİB e-Emlak'a Üye Ol
                      </Button>
                      <div className="user-popover-divider" />
                      <div className="user-popover-list">
                        <button
                          type="button"
                          className="user-popover-item"
                          onClick={() => {
                            setPopoverOpen(false);
                            onNavigate('auth', { authTab: 'login' });
                          }}
                        >
                          <Heart size={15} />
                          <span>Favorilerim</span>
                        </button>
                        <button
                          type="button"
                          className="user-popover-item"
                          onClick={() => {
                            setPopoverOpen(false);
                            onNavigate('auth', { authTab: 'login' });
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
                            onNavigate('sell-request');
                          }}
                        >
                          <FileText size={15} />
                          <span>Ev Satış / Kiralama Başvurusu</span>
                        </button>
                        <div className="user-popover-divider" />
                        <button
                          type="button"
                          className="user-popover-item"
                          onClick={() => {
                            setPopoverOpen(false);
                            onNavigate('auth', { authTab: 'register-agent' });
                          }}
                        >
                          <Building2 size={15} />
                          <span>Kurumsal Ofis Üyeliği</span>
                        </button>
                      </div>
                    </>
                  ) : isAgent ? (
                    /* Emlakçı (AGENT) Menüsü: Navbar menülerini tekrar etmez, müşteri favori/randevusu içermez */
                    <>
                      <div className="user-popover-header">
                        <div className="user-popover-name">
                          {session.full_name}
                        </div>
                        <div className="user-popover-role">
                          {session.agency?.name ?? 'Kurumsal Emlak Ofisi'}
                        </div>
                      </div>
                      <div className="user-popover-list">
                        <button
                          type="button"
                          className="user-popover-item"
                          onClick={() => {
                            setPopoverOpen(false);
                            onNavigate('profile', { profileTab: 'security' });
                          }}
                        >
                          <ShieldCheck size={15} />
                          <span>Profilim & Hesap Ayarları</span>
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
                          <Store size={15} />
                          <span>Kurumsal Mağaza Vitrinim</span>
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
                    </>
                  ) : (
                    /* Bireysel Müşteri (CUSTOMER) Menüsü: Doğrudan ilgili sekmeye yönlendirir */
                    <>
                      <div className="user-popover-header">
                        <div className="user-popover-name">
                          {session.full_name}
                        </div>
                        <div className="user-popover-role">Bireysel Üye</div>
                      </div>
                      <div className="user-popover-list">
                        <button
                          type="button"
                          className="user-popover-item"
                          onClick={() => {
                            setPopoverOpen(false);
                            onNavigate('profile', { profileTab: 'favorites' });
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
                          <span>Profilim & Güvenlik</span>
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
                    </>
                  )}
                </div>
              )}
            </div>

            {/* En Sağ Ana Aksiyon Hap Butonu */}
            {isAgent ? (
              <Button
                variant="primary"
                pill
                leftIcon={<Plus size={16} />}
                onClick={() => onNavigate('properties')}
              >
                Yeni İlan Ekle
              </Button>
            ) : (
              <Button
                variant="primary"
                pill
                onClick={() => onNavigate('sell-request')}
              >
                Evini Sat / Kiraya Ver
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              pill
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menü"
            >
              <Menu size={20} />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobil Hamburger Menüsü */}
      <Modal
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="GİB e-Emlak Menü"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isAgent ? (
            <>
              <Button
                variant={activePage === 'marketplace' ? 'primary' : 'outline'}
                fullWidth
                leftIcon={<Home size={16} />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('marketplace', { listingType: 'ALL' });
                }}
              >
                İlan Vitrini
              </Button>
              <Button
                variant={activePage === 'properties' ? 'primary' : 'outline'}
                fullWidth
                leftIcon={<Building2 size={16} />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('properties');
                }}
              >
                Portföy Yönetimi
              </Button>
              <Button
                variant={activePage === 'calendar' ? 'primary' : 'outline'}
                fullWidth
                leftIcon={<Calendar size={16} />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('calendar');
                }}
              >
                Randevu Takvimi
              </Button>
              <Button
                variant={activePage === 'customers' ? 'primary' : 'outline'}
                fullWidth
                leftIcon={<Users size={16} />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('customers');
                }}
              >
                Müşteriler
              </Button>
              <Button
                variant={activePage === 'agency' ? 'primary' : 'outline'}
                fullWidth
                leftIcon={<Store size={16} />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('agency');
                }}
              >
                Ofis & Danışmanlar
              </Button>
              <Button
                variant={activePage === 'reports' ? 'primary' : 'outline'}
                fullWidth
                leftIcon={<BarChart3 size={16} />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('reports');
                }}
              >
                Analitik
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                fullWidth
                leftIcon={<Home size={16} />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('marketplace', { listingType: 'SATILIK' });
                }}
              >
                Satılık İlanlar
              </Button>
              <Button
                variant="outline"
                fullWidth
                leftIcon={<KeyRound size={16} />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('marketplace', { listingType: 'KIRALIK' });
                }}
              >
                Kiralık İlanlar
              </Button>
              <Button
                variant="outline"
                fullWidth
                leftIcon={<Users size={16} />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('agency-storefront', { agencyId: 1 });
                }}
              >
                Danışmanlar & Emlak Ofisleri
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('sell-request');
                }}
              >
                Evini Sat / Kiraya Ver
              </Button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

export default AppNavbar;
