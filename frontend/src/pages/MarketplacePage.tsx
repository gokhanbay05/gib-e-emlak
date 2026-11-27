import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Home,
  KeyRound,
  LayoutGrid,
  List,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from '../api/favorites';
import {
  fetchDistricts,
  fetchNeighborhoods,
  fetchProvinces,
} from '../api/locations';
import { fetchProperties } from '../api/properties';
import {
  Breadcrumb,
  Button,
  Card,
  Input,
  PropertySkeletonList,
  Select,
} from '../components/core';
import {
  PageContainer,
  SidebarFilterLayout,
} from '../components/layout';
import PropertyMapView from '../components/map/PropertyMapView';
import PropertyGridCard from '../components/property/PropertyGridCard';
import PropertyHorizontalCard from '../components/property/PropertyHorizontalCard';
import type { LocationOption, PropertyRecord, UserSession } from '../types';
import { formatPriceTL } from '../lib/utils';
import {
  formatDigitsOnly,
  formatListingTypeLabel,
  normalizeTurkish,
} from '../utils/formatters';
import '../css/pages/MarketplacePage.css';

import type { ListingDisplayMode } from '../lib/router';

export interface MarketplacePageProps {
  session: UserSession;
  committedSearchQuery: string;
  initialListingType?: 'ALL' | 'SATILIK' | 'KIRALIK';
  initialCity?: string;
  initialDistrict?: string;
  initialNeighborhood?: string;
  displayMode: ListingDisplayMode;
  isHomeHeroMode: boolean;
  onCommitSearch: (q: string) => void;
  onChangeListingType: (tx: 'ALL' | 'SATILIK' | 'KIRALIK') => void;
  onChangeDisplayMode: (mode: ListingDisplayMode) => void;
  onSelectProperty: (property: PropertyRecord) => void;
  onSelectAgency: (agencyId: number, advisorId?: number) => void;
  onRequireAuth: (reason: string) => void;
  onOpenAiSearch: () => void;
  onNotify: (msg: string) => void;
}

const ROOM_OPTIONS = ['ALL', '1+0', '1+1', '2+1', '3+1', '4+1', '5+1'];
const PAGE_SIZE = 20;

const CITY_CENTERS: Array<{ city: string; lat: number; lng: number }> = [
  { city: 'İstanbul', lat: 41.0082, lng: 28.9784 },
  { city: 'Ankara', lat: 39.9208, lng: 32.8541 },
  { city: 'İzmir', lat: 38.4237, lng: 27.1428 },
  { city: 'Antalya', lat: 36.8841, lng: 30.7056 },
];

function findNearestCity(lat: number, lng: number): string {
  let best = 'İstanbul';
  let minDist = Number.POSITIVE_INFINITY;
  for (const c of CITY_CENTERS) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < minDist) {
      minDist = d;
      best = c.city;
    }
  }
  return best;
}

function truncateSearchChip(text: string, maxLen = 22): string {
  const cleaned = text.trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen)}...`;
}

export function MarketplacePage({
  session,
  committedSearchQuery,
  initialListingType = 'ALL',
  initialCity = '',
  initialDistrict = '',
  initialNeighborhood = '',
  displayMode,
  isHomeHeroMode,
  onCommitSearch,
  onChangeListingType,
  onChangeDisplayMode,
  onSelectProperty,
  onSelectAgency,
  onRequireAuth,
  onOpenAiSearch,
  onNotify,
}: MarketplacePageProps) {
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [detectedCity, setDetectedCity] = useState<string>('İstanbul');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Madde 5: Canlı arama yerine yalnızca Ara butonuna veya Enter'a basınca filtrelenen taslak metin
  const [heroDraftQuery, setHeroDraftQuery] = useState(committedSearchQuery);

  // Filtre Durumları
  const [listingType, setListingType] = useState<string>(initialListingType);
  const [propertyType, setPropertyType] = useState<string>('ALL');
  const [roomCount, setRoomCount] = useState<string>('ALL');
  const [city, setCity] = useState<string>(initialCity);
  const [district, setDistrict] = useState<string>(initialDistrict);
  const [neighborhood, setNeighborhood] = useState<string>(initialNeighborhood);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minSqm, setMinSqm] = useState<string>('');
  const [maxSqm, setMaxSqm] = useState<string>('');
  const [sortKey, setSortKey] = useState<string>('created_at:desc');

  // Lokasyon Seçenekleri
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);

  const isAgent = session.role === 'AGENT';

  useEffect(() => {
    setListingType(initialListingType);
  }, [initialListingType]);

  useEffect(() => {
    setCity(initialCity);
    setDistrict(initialDistrict);
    setNeighborhood(initialNeighborhood);
  }, [initialCity, initialDistrict, initialNeighborhood]);

  useEffect(() => {
    setHeroDraftQuery(committedSearchQuery);
  }, [committedSearchQuery]);

  useEffect(() => {
    void fetchProvinces()
      .then((res) => setProvinces(res.provinces))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!city) {
      setDistricts([]);
      setDistrict('');
      setNeighborhoods([]);
      setNeighborhood('');
      return;
    }
    const found = provinces.find((p) => p.name === city);
    if (!found) return;
    void fetchDistricts(found.id)
      .then((res) => setDistricts(res.districts))
      .catch(() => {});
  }, [city, provinces]);

  useEffect(() => {
    if (!district) {
      setNeighborhoods([]);
      setNeighborhood('');
      return;
    }
    const found = districts.find((d) => d.name === district);
    if (!found) return;
    void fetchNeighborhoods(found.id)
      .then((res) => setNeighborhoods(res.neighborhoods))
      .catch(() => {});
  }, [district, districts]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const [sortBy, sortDir] = sortKey.split(':');
      const res = await fetchProperties({
        status: 'AKTIF',
        listing_type: listingType !== 'ALL' ? listingType : undefined,
        property_type: propertyType !== 'ALL' ? propertyType : undefined,
        room_count: roomCount !== 'ALL' ? roomCount : undefined,
        city: city || undefined,
        district: district || undefined,
        neighborhood: neighborhood || undefined,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        min_sqm: minSqm ? Number(minSqm) : undefined,
        max_sqm: maxSqm ? Number(maxSqm) : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setProperties(res.properties);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProperties();
  }, [
    listingType,
    propertyType,
    roomCount,
    city,
    district,
    neighborhood,
    minPrice,
    maxPrice,
    minSqm,
    maxSqm,
    sortKey,
  ]);

  useEffect(() => {
    if (session.role === 'VISITOR' || !session.id) {
      setFavoriteIds(new Set());
      return;
    }
    void fetchFavorites(session.id)
      .then((res) => setFavoriteIds(new Set(res.favorite_property_ids)))
      .catch(() => {});
  }, [session]);

  // Madde 5: Yalnızca Ara'ya basıldığında onaylanan (committedSearchQuery) metin üzerinden filtreleme
  const filteredProperties = useMemo(() => {
    const q = normalizeTurkish(committedSearchQuery.trim());
    if (!q) return properties;
    return properties.filter((p) => {
      const haystack = normalizeTurkish(
        `${p.id} ${150000 + p.id} ${p.title} ${p.city} ${p.district} ${p.neighborhood} ${p.room_count} ${p.agency?.name ?? ''}`,
      );
      return haystack.includes(q);
    });
  }, [properties, committedSearchQuery]);

  // Kullanıcının konumunu alarak bölgesel şehir tespiti (izin yoksa veya alınamazsa İstanbul)
  useEffect(() => {
    if (!isHomeHeroMode || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectedCity(
          findNearestCity(pos.coords.latitude, pos.coords.longitude),
        );
      },
      () => {
        setDetectedCity('İstanbul');
      },
      { timeout: 3500, maximumAge: 600000 },
    );
  }, [isHomeHeroMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    listingType,
    propertyType,
    roomCount,
    city,
    district,
    neighborhood,
    minPrice,
    maxPrice,
    minSqm,
    maxSqm,
    sortKey,
    committedSearchQuery,
  ]);

  const homeShowcase = useMemo(() => {
    const cityMatches = properties.filter(
      (p) => normalizeTurkish(p.city) === normalizeTurkish(detectedCity),
    );
    const activeCity = cityMatches.length > 0 ? detectedCity : 'İstanbul';
    const basePool =
      cityMatches.length > 0
        ? cityMatches
        : properties.filter(
            (p) => normalizeTurkish(p.city) === normalizeTurkish('İstanbul'),
          );
    const recentFour = (basePool.length > 0 ? basePool : properties).slice(0, 4);

    const satilikPool = (basePool.length > 0 ? basePool : properties).filter(
      (p) => p.listing_type === 'SATILIK' && p.gross_sqm > 0,
    );
    const kiralikPool = (basePool.length > 0 ? basePool : properties).filter(
      (p) => p.listing_type === 'KIRALIK' && p.gross_sqm > 0,
    );

    const avgSqmPrice = (arr: PropertyRecord[]) =>
      arr.length > 0
        ? Math.round(
            arr.reduce((sum, x) => sum + x.price / x.gross_sqm, 0) / arr.length,
          )
        : 0;

    return {
      cityLabel: activeCity,
      recentListings: recentFour,
      satilikAvgSqm: avgSqmPrice(satilikPool),
      kiralikAvgSqm: avgSqmPrice(kiralikPool),
      totalSatilik: properties.filter((p) => p.listing_type === 'SATILIK').length,
      totalKiralik: properties.filter((p) => p.listing_type === 'KIRALIK').length,
      cityCount: basePool.length,
    };
  }, [properties, detectedCity]);

  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProperties = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProperties.slice(start, start + PAGE_SIZE);
  }, [filteredProperties, safePage]);

  const handleToggleFavorite = async (propertyId: number) => {
    if (session.role === 'VISITOR') {
      onRequireAuth(
        'İlanı favorilerinize eklemek için lütfen üye girişi yapınız.',
      );
      return;
    }
    if (isAgent) return;

    const currentlyFav = favoriteIds.has(propertyId);
    try {
      if (currentlyFav) {
        await removeFavorite(session.id, propertyId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(propertyId);
          return next;
        });
        onNotify('İlan favorilerinizden çıkarıldı.');
      } else {
        await addFavorite(session.id, propertyId);
        setFavoriteIds((prev) => new Set(prev).add(propertyId));
        onNotify('İlan favorilerinize eklendi.');
      }
    } catch {
      // ignore
    }
  };

  const resetFilters = () => {
    setListingType('ALL');
    onChangeListingType('ALL');
    setPropertyType('ALL');
    setRoomCount('ALL');
    setCity('');
    setDistrict('');
    setNeighborhood('');
    setMinPrice('');
    setMaxPrice('');
    setMinSqm('');
    setMaxSqm('');
    setHeroDraftQuery('');
    onCommitSearch('');
  };

  const filterContent = (
    <>
      {displayMode === 'map' && (
        <Button
          variant="outline"
          size="sm"
          pill
          fullWidth
          leftIcon={<ChevronLeft size={15} />}
          onClick={() => onChangeDisplayMode('grid')}
        >
          Listelemeye Dön
        </Button>
      )}

      {/* İlan Türü Radio Seçimi */}
      <div className="filter-group-block">
        <div className="filter-group-title">İlan Türü</div>
        <div className="filter-radio-list">
          {[
            { value: 'ALL', label: 'Tümü (Satılık & Kiralık)' },
            { value: 'SATILIK', label: 'Satılık' },
            { value: 'KIRALIK', label: 'Kiralık' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filter-radio-item ${listingType === opt.value ? 'is-checked' : ''}`}
              onClick={() => {
                setListingType(opt.value);
                onChangeListingType(opt.value as 'ALL' | 'SATILIK' | 'KIRALIK');
              }}
            >
              <span className="filter-radio-dot" />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Konum Seçicileri */}
      <div className="filter-group-block">
        <div className="filter-group-title">Konum</div>
        <Select
          value={city}
          onChange={(val) => {
            setCity(val);
            setDistrict('');
            setNeighborhood('');
          }}
          placeholder="İl Seçiniz"
          options={provinces.map((p) => ({ value: p.name, label: p.name }))}
        />
        <Select
          value={district}
          onChange={(val) => {
            setDistrict(val);
            setNeighborhood('');
          }}
          placeholder="İlçe Seçiniz"
          disabled={!city}
          options={districts.map((d) => ({ value: d.name, label: d.name }))}
        />
        <Select
          value={neighborhood}
          onChange={setNeighborhood}
          placeholder="Semt / Mahalle Seçiniz"
          disabled={!district}
          options={neighborhoods.map((n) => ({ value: n.name, label: n.name }))}
        />
      </div>

      {/* Kategori Seçimi */}
      <div className="filter-group-block">
        <div className="filter-group-title">Kategori</div>
        <div className="filter-two-col">
          {[
            { value: 'ALL', label: 'Tümü' },
            { value: 'DAIRE', label: 'Konut / Daire' },
            { value: 'VILLA', label: 'Villa' },
            { value: 'ISYERI', label: 'İşyeri' },
            { value: 'ARSA', label: 'Arsa' },
          ].map((cat) => (
            <button
              key={cat.value}
              type="button"
              className={`filter-radio-item ${propertyType === cat.value ? 'is-checked' : ''}`}
              onClick={() => setPropertyType(cat.value)}
            >
              <span className="filter-radio-dot" />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fiyat Aralığı */}
      <div className="filter-group-block">
        <div className="filter-group-title">Fiyat (TL)</div>
        <div className="filter-two-col">
          <Input
            inputSize="sm"
            placeholder="En Az TL"
            value={minPrice}
            onChange={(e) => setMinPrice(formatDigitsOnly(e.target.value, 11))}
          />
          <Input
            inputSize="sm"
            placeholder="En Çok TL"
            value={maxPrice}
            onChange={(e) => setMaxPrice(formatDigitsOnly(e.target.value, 11))}
          />
        </div>
      </div>

      {/* Metrekare (Brüt) */}
      <div className="filter-group-block">
        <div className="filter-group-title">m² (Brüt)</div>
        <div className="filter-two-col">
          <Input
            inputSize="sm"
            placeholder="En Az m²"
            value={minSqm}
            onChange={(e) => setMinSqm(formatDigitsOnly(e.target.value, 6))}
          />
          <Input
            inputSize="sm"
            placeholder="En Çok m²"
            value={maxSqm}
            onChange={(e) => setMaxSqm(formatDigitsOnly(e.target.value, 6))}
          />
        </div>
      </div>

      {/* Oda Sayısı */}
      <div className="filter-group-block">
        <div className="filter-group-title">Oda Sayısı</div>
        <Select
          value={roomCount}
          onChange={setRoomCount}
          options={ROOM_OPTIONS.map((r) => ({
            value: r,
            label: r === 'ALL' ? 'Tüm Oda Sayıları' : r,
          }))}
        />
      </div>
    </>
  );

  const filterFooter = (
    <>
      <Button
        variant="primary"
        pill
        fullWidth
        leftIcon={<Search size={15} />}
        onClick={() => {
          setMobileFilterOpen(false);
          void loadProperties();
        }}
      >
        Ara ({filteredProperties.length})
      </Button>
      <Button
        variant="outline"
        size="icon"
        pill
        onClick={resetFilters}
        title="Filtreleri Sıfırla"
      >
        <RotateCcw size={15} />
      </Button>
    </>
  );

  if (displayMode === 'map') {
    return (
      <SidebarFilterLayout
        isMapMode
        filterContent={filterContent}
        filterFooter={filterFooter}
        mobileFilterOpen={mobileFilterOpen}
        onCloseMobileFilter={() => setMobileFilterOpen(false)}
      >
        <PropertyMapView
          properties={filteredProperties}
          favoriteIds={favoriteIds}
          hideCustomerActions={isAgent}
          onSelectProperty={onSelectProperty}
          onToggleFavorite={(id) => void handleToggleFavorite(id)}
          onOpenMobileFilter={() => setMobileFilterOpen(true)}
          onExitMap={() => onChangeDisplayMode('grid')}
        />
      </SidebarFilterLayout>
    );
  }

  return (
    <PageContainer size="wide">
      {/* Özgün Hero Alanı (Statik radial vurgu — sıfır flicker) */}
      {isHomeHeroMode && (
        <section className="hepsi-hero-banner">
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-40%',
              right: '-10%',
              width: '420px',
              height: '420px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(124, 29, 52, 0.38) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div className="hepsi-hero-inner">
            <div>
              <h1 className="hepsi-hero-title">
                Doğru Ev,{' '}
                <span className="highlight-accent">Güvenilir Süreç.</span>
              </h1>
              <p className="hepsi-hero-subtitle">
                Yetkili emlak ofisleri ve doğrulanmış portföylerle taşınmazınızı güvenle keşfedin.
              </p>
            </div>

            <div className="hepsi-hero-search-card">
              <form
                className="hepsi-hero-search-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  onCommitSearch(heroDraftQuery);
                }}
              >
                <div className="hepsi-hero-input-box">
                  <Sparkles size={17} color="var(--color-ai-accent)" />
                  <input
                    type="text"
                    className="hepsi-hero-input"
                    placeholder="Konum, ilan no ya da emlak ofisi adıyla arayın (Örn. Çankaya, Kadıköy, 3+1)"
                    value={heroDraftQuery}
                    onChange={(e) => setHeroDraftQuery(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  pill
                  leftIcon={<Search size={16} />}
                >
                  Ara
                </Button>

                <Button
                  variant="ai"
                  size="lg"
                  pill
                  leftIcon={<Sparkles size={16} />}
                  onClick={onOpenAiSearch}
                >
                  GİB AI ile Ara
                </Button>
              </form>

              <div className="hepsi-hero-chips">
                <button
                  type="button"
                  className="hepsi-quick-chip"
                  onClick={() => {
                    setListingType('SATILIK');
                    setPropertyType('DAIRE');
                    onChangeListingType('SATILIK');
                  }}
                >
                  Fırsat Satılık Daireler
                </button>
                <button
                  type="button"
                  className="hepsi-quick-chip"
                  onClick={() => {
                    setListingType('KIRALIK');
                    setPropertyType('DAIRE');
                    onChangeListingType('KIRALIK');
                  }}
                >
                  Fırsat Kiralık Daireler
                </button>
                <button
                  type="button"
                  className="hepsi-quick-chip"
                  onClick={() => {
                    setListingType('SATILIK');
                    setPropertyType('VILLA');
                    onChangeListingType('SATILIK');
                  }}
                >
                  Müstakil Ev & Villalar
                </button>
                <button
                  type="button"
                  className="hepsi-quick-chip"
                  onClick={() => onCommitSearch('Ankara')}
                >
                  Ankara İlanları
                </button>
                <button
                  type="button"
                  className="hepsi-quick-chip"
                  onClick={() => onCommitSearch('İstanbul')}
                >
                  İstanbul İlanları
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* YENİ ANA SAYFA VİTRİN AKIŞI (Filtresiz: Bölgenizde Yeni Eklenen İlk 5 İlan -> Satılık/Kiralık Adaları -> Bölge m² Özeti) */}
      {isHomeHeroMode ? (
        <div style={{ paddingBottom: '72px' }}>
          <section className="home-section-block">
            <div className="home-section-header">
              <h2 className="home-section-title">
                <MapPin size={20} color="var(--color-primary)" />
                <span>{homeShowcase.cityLabel} Bölgenizde Yeni Eklenenler</span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                pill
                rightIcon={<ArrowRight size={14} />}
                onClick={() => onChangeListingType('SATILIK')}
              >
                Tüm İlanları İncele
              </Button>
            </div>

            {loading && properties.length === 0 ? (
              <PropertySkeletonList count={4} />
            ) : (
              <>
                <div className="property-cards-grid home-recent-desktop-grid">
                  {homeShowcase.recentListings.map((p) => (
                    <PropertyGridCard
                      key={p.id}
                      property={p}
                      isFavorited={favoriteIds.has(p.id)}
                      hideCustomerActions={isAgent}
                      onSelect={onSelectProperty}
                      onToggleFavorite={(id) => void handleToggleFavorite(id)}
                      onSelectAgency={onSelectAgency}
                    />
                  ))}
                </div>
                <div className="home-recent-mobile-stack">
                  {homeShowcase.recentListings.map((p) => (
                    <PropertyHorizontalCard
                      key={`m-${p.id}`}
                      property={p}
                      isFavorited={favoriteIds.has(p.id)}
                      hideCustomerActions={isAgent}
                      onSelect={onSelectProperty}
                      onToggleFavorite={(id) => void handleToggleFavorite(id)}
                      onSelectAgency={onSelectAgency}
                    />
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="home-section-block">
            <div className="home-explore-grid">
              <button
                type="button"
                className="home-explore-card"
                onClick={() => {
                  setListingType('SATILIK');
                  onChangeListingType('SATILIK');
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      marginBottom: '6px',
                    }}
                  >
                    <Home size={14} />
                    <span>SATILIK PORTFÖY</span>
                  </div>
                  <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--color-text-dark)' }}>
                    Satılık Evleri Keşfet
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {homeShowcase.totalSatilik} aktif satılık konut, villa ve arsa ilanı
                  </div>
                </div>
                <ArrowRight size={20} color="var(--color-primary)" style={{ flexShrink: 0 }} />
              </button>

              <button
                type="button"
                className="home-explore-card"
                onClick={() => {
                  setListingType('KIRALIK');
                  onChangeListingType('KIRALIK');
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--color-secondary)',
                      marginBottom: '6px',
                    }}
                  >
                    <KeyRound size={14} />
                    <span>KİRALIK PORTFÖY</span>
                  </div>
                  <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--color-text-dark)' }}>
                    Kiralık Evleri Keşfet
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {homeShowcase.totalKiralik} aktif kiralık daire, rezidans ve işyeri ilanı
                  </div>
                </div>
                <ArrowRight size={20} color="var(--color-secondary)" style={{ flexShrink: 0 }} />
              </button>
            </div>
          </section>

          <section className="home-section-block">
            <div className="home-section-header">
              <h2 className="home-section-title">
                <TrendingUp size={20} color="var(--color-primary)" />
                <span>{homeShowcase.cityLabel} Bölgesinde Ortalama m² Fiyatları</span>
              </h2>
            </div>

            <div className="home-index-grid">
              <Card padding="md">
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Satılık Ortalama m² Birim Fiyatı
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '6px' }}>
                  {homeShowcase.satilikAvgSqm > 0
                    ? `${formatPriceTL(homeShowcase.satilikAvgSqm)} / m²`
                    : 'Veri hesaplanıyor'}
                </div>
              </Card>

              <Card padding="md">
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Kiralık Ortalama m² Birim Fiyatı
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-secondary)', marginTop: '6px' }}>
                  {homeShowcase.kiralikAvgSqm > 0
                    ? `${formatPriceTL(homeShowcase.kiralikAvgSqm)} / m²`
                    : 'Veri hesaplanıyor'}
                </div>
              </Card>

              <Card padding="md">
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  {homeShowcase.cityLabel} Doğrulanmış İlan Sayısı
                </div>
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: 'var(--color-text-dark)',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Building2 size={20} color="var(--color-primary)" />
                  <span>{homeShowcase.cityCount} Aktif İlan</span>
                </div>
              </Card>
            </div>
          </section>
        </div>
      ) : (
        <>

      {!isHomeHeroMode && (
        <Breadcrumb
          items={[
            { label: 'Ana Sayfa', onClick: resetFilters },
            ...(listingType !== 'ALL'
              ? [{ label: `${formatListingTypeLabel(listingType)} İlanlar` }]
              : [{ label: 'Arama Sonuçları' }]),
            ...(committedSearchQuery
              ? [{ label: `"${committedSearchQuery}"` }]
              : []),
            ...(city ? [{ label: city }] : []),
            ...(district ? [{ label: district }] : []),
          ]}
        />
      )}

      <SidebarFilterLayout
        filterContent={filterContent}
        filterFooter={filterFooter}
        mobileFilterOpen={mobileFilterOpen}
        onCloseMobileFilter={() => setMobileFilterOpen(false)}
      >
        {/* Madde 2 & 6: Aranan kelime tırnak içinde en başta + Tek satırda sıralama/görünüm araçları */}
        <div className="results-header-card">
          <div className="results-count-text">
            {committedSearchQuery ? (
              <>
                <strong>"{truncateSearchChip(committedSearchQuery)}"</strong>{' '}
                aramanızda{' '}
              </>
            ) : null}
            <strong>
              {listingType === 'ALL'
                ? 'Gayrimenkul İlanları'
                : `${formatListingTypeLabel(listingType)} Ev Fiyatları`}
            </strong>{' '}
            için <strong>{filteredProperties.length}</strong> ilan bulundu
            {committedSearchQuery && (
              <Button
                variant="ghost"
                size="xs"
                pill
                style={{ marginLeft: '8px' }}
                onClick={() => onCommitSearch('')}
              >
                Temizle ✕
              </Button>
            )}
          </div>

          <div
            className="results-toolbar-right"
            style={{ flexWrap: 'nowrap', alignItems: 'center' }}
          >
            <Button
              variant="outline"
              size="sm"
              pill
              className="mobile-filter-trigger-only"
              leftIcon={<SlidersHorizontal size={14} />}
              onClick={() => setMobileFilterOpen(true)}
            >
              Filtrele
            </Button>

            <Button
              variant="outline-primary"
              size="sm"
              pill
              leftIcon={<MapIcon size={14} />}
              onClick={() => onChangeDisplayMode('map')}
            >
              Harita
            </Button>

            <div className="results-view-toggle-group">
              <Button
                variant={displayMode === 'grid' ? 'primary' : 'outline'}
                size="icon-sm"
                pill
                onClick={() => onChangeDisplayMode('grid')}
                title="Kare Kart (Vitrin) Görünümü"
              >
                <LayoutGrid size={15} />
              </Button>

              <Button
                variant={displayMode === 'horizontal' ? 'primary' : 'outline'}
                size="icon-sm"
                pill
                onClick={() => onChangeDisplayMode('horizontal')}
                title="Geniş Liste Görünümü"
              >
                <List size={15} />
              </Button>
            </div>

            <div className="results-sort-select-wrap">
              <Select
                selectSize="sm"
                pill
                inline
                value={sortKey}
                onChange={setSortKey}
                options={[
                  { value: 'created_at:desc', label: 'Sırala: En Yeni İlanlar' },
                  { value: 'price:asc', label: 'Fiyata Göre (Artan)' },
                  { value: 'price:desc', label: 'Fiyata Göre (Azalan)' },
                  {
                    value: 'gross_sqm:desc',
                    label: 'Metrekare (Büyükten Küçüğe)',
                  },
                ]}
              />
            </div>
          </div>
        </div>

        {/* İlan Kartları Listesi */}
        {loading && properties.length === 0 ? (
          <PropertySkeletonList count={6} />
        ) : filteredProperties.length === 0 ? (
          <Card padding="lg">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '24px 0',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 700 }}>
                Seçtiğiniz filtrelere uygun ilan bulunamadı
              </div>
              <Button variant="primary" pill onClick={resetFilters}>
                Tüm Filtreleri Temizle
              </Button>
            </div>
          </Card>
        ) : displayMode === 'grid' ? (
          <div className="property-cards-grid">
            {paginatedProperties.map((p) => (
              <PropertyGridCard
                key={p.id}
                property={p}
                isFavorited={favoriteIds.has(p.id)}
                hideCustomerActions={isAgent}
                onSelect={onSelectProperty}
                onToggleFavorite={(id) => void handleToggleFavorite(id)}
                onSelectAgency={onSelectAgency}
              />
            ))}
          </div>
        ) : (
          <div className="property-cards-stack">
            {paginatedProperties.map((p) => (
              <PropertyHorizontalCard
                key={p.id}
                property={p}
                isFavorited={favoriteIds.has(p.id)}
                hideCustomerActions={isAgent}
                onSelect={onSelectProperty}
                onToggleFavorite={(id) => void handleToggleFavorite(id)}
                onSelectAgency={onSelectAgency}
              />
            ))}
          </div>
        )}

        {/* Sayfalama (Yüzen AI Butonunun Altını Kapatmaması İçin Alt Boşluklu) */}
        {filteredProperties.length > PAGE_SIZE && (
          <div className="pagination-bar-wrap">
            <Button
              variant="outline"
              size="sm"
              pill
              disabled={safePage <= 1}
              leftIcon={<ChevronLeft size={14} />}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Önceki
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <Button
                key={pageNum}
                variant={pageNum === safePage ? 'primary' : 'outline'}
                size="sm"
                pill
                onClick={() => {
                  setCurrentPage(pageNum);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                {pageNum}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              pill
              disabled={safePage >= totalPages}
              rightIcon={<ChevronRight size={14} />}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Sonraki
            </Button>
          </div>
        )}
      </SidebarFilterLayout>
        </>
      )}

      {/* Sağ Altta Yalnızca İlan Vitrini Sayfasında Görünen HepsiAI Tetikleyicisi */}
      <button
        type="button"
        className="floating-hepsi-ai-btn"
        onClick={onOpenAiSearch}
      >
        <Sparkles size={17} color="#8b5cf6" />
        <span>
          <strong>GİB</strong>
          <span className="ai-grad-text">AI ile Ara</span>
        </span>
      </button>
    </PageContainer>
  );
}

export default MarketplacePage;
