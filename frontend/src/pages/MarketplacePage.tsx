import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  LayoutGrid,
  List,
  Map as MapIcon,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
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
  Select,
} from '../components/core';
import {
  PageContainer,
  SidebarFilterLayout,
} from '../components/layout';
import PropertyMapView from '../components/map/PropertyMapView';
import AppointmentModal from '../components/modals/AppointmentModal';
import PropertyGridCard from '../components/property/PropertyGridCard';
import PropertyHorizontalCard from '../components/property/PropertyHorizontalCard';
import type { LocationOption, PropertyRecord, UserSession } from '../types';
import {
  formatDigitsOnly,
  formatListingTypeLabel,
  normalizeTurkish,
} from '../utils/formatters';
import '../css/pages/MarketplacePage.css';

export interface MarketplacePageProps {
  session: UserSession;
  globalSearchQuery: string;
  initialListingType?: 'ALL' | 'SATILIK' | 'KIRALIK';
  onGlobalSearchChange: (q: string) => void;
  onSelectProperty: (property: PropertyRecord) => void;
  onSelectAgency: (agencyId: number, advisorId?: number) => void;
  onRequireAuth: (reason: string) => void;
  onOpenAiSearch: () => void;
  onNotify: (msg: string) => void;
}

type ListingDisplayMode = 'horizontal' | 'grid' | 'map';

const ROOM_OPTIONS = ['ALL', '1+0', '1+1', '2+1', '3+1', '4+1', '5+1'];

export function MarketplacePage({
  session,
  globalSearchQuery,
  initialListingType = 'ALL',
  onGlobalSearchChange,
  onSelectProperty,
  onSelectAgency,
  onRequireAuth,
  onOpenAiSearch,
  onNotify,
}: MarketplacePageProps) {
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  const [displayMode, setDisplayMode] =
    useState<ListingDisplayMode>('horizontal');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [appointmentProperty, setAppointmentProperty] =
    useState<PropertyRecord | null>(null);

  // Filtre Durumları
  const [listingType, setListingType] = useState<string>(initialListingType);
  const [propertyType, setPropertyType] = useState<string>('ALL');
  const [roomCount, setRoomCount] = useState<string>('ALL');
  const [city, setCity] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [neighborhood, setNeighborhood] = useState<string>('');
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

  const filteredProperties = useMemo(() => {
    const q = normalizeTurkish(globalSearchQuery.trim());
    if (!q) return properties;
    return properties.filter((p) => {
      const haystack = normalizeTurkish(
        `${p.id} ${150000 + p.id} ${p.title} ${p.city} ${p.district} ${p.neighborhood} ${p.room_count} ${p.agency?.name ?? ''}`,
      );
      return haystack.includes(q);
    });
  }, [properties, globalSearchQuery]);

  const handleToggleFavorite = async (propertyId: number) => {
    if (session.role === 'VISITOR') {
      onRequireAuth('İlanı favorilerinize eklemek için lütfen üye girişi yapınız.');
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
    setPropertyType('ALL');
    setRoomCount('ALL');
    setCity('');
    setDistrict('');
    setNeighborhood('');
    setMinPrice('');
    setMaxPrice('');
    setMinSqm('');
    setMaxSqm('');
    onGlobalSearchChange('');
  };

  // Sol Filtre Sütunu İçeriği (Screenshot #2 & #4)
  const filterContent = (
    <>
      {displayMode === 'map' && (
        <Button
          variant="outline"
          size="sm"
          pill
          fullWidth
          leftIcon={<ChevronLeft size={15} />}
          onClick={() => setDisplayMode('horizontal')}
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
              onClick={() => setListingType(opt.value)}
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
          onChange={setCity}
          placeholder="İl Seçiniz"
          options={provinces.map((p) => ({ value: p.name, label: p.name }))}
        />
        <Select
          value={district}
          onChange={setDistrict}
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
        />
      </SidebarFilterLayout>
    );
  }

  return (
    <PageContainer size="wide">
      {/* Hepsiemlak Screenshot #1 Hero Arama Alanı */}
      <section className="hepsi-hero-banner">
        <div className="hepsi-hero-inner">
          <h1 className="hepsi-hero-title">
            Aradığın evi bulup <span className="highlight-coral">OHH BE</span>{' '}
            demek için GİB e-Emlak!
          </h1>

          <div className="hepsi-hero-search-card">
            <div className="hepsi-hero-search-row">
              <div className="hepsi-hero-input-box">
                <Sparkles size={17} color="var(--color-ai-accent)" />
                <input
                  type="text"
                  className="hepsi-hero-input"
                  placeholder="Konum, ilan no ya da emlak ofisi adıyla arayın (Örn. Çankaya, Kadıköy, 3+1)"
                  value={globalSearchQuery}
                  onChange={(e) => onGlobalSearchChange(e.target.value)}
                />
              </div>

              <Button
                variant="primary"
                size="lg"
                pill
                leftIcon={<Search size={16} />}
                onClick={() => void loadProperties()}
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
            </div>

            <div className="hepsi-hero-chips">
              <button
                type="button"
                className={`hepsi-quick-chip ${listingType === 'SATILIK' && propertyType === 'DAIRE' ? 'is-active' : ''}`}
                onClick={() => {
                  setListingType('SATILIK');
                  setPropertyType('DAIRE');
                }}
              >
                Fırsat Satılık Daireler
              </button>
              <button
                type="button"
                className={`hepsi-quick-chip ${listingType === 'KIRALIK' && propertyType === 'DAIRE' ? 'is-active' : ''}`}
                onClick={() => {
                  setListingType('KIRALIK');
                  setPropertyType('DAIRE');
                }}
              >
                Fırsat Kiralık Daireler
              </button>
              <button
                type="button"
                className={`hepsi-quick-chip ${propertyType === 'VILLA' ? 'is-active' : ''}`}
                onClick={() => {
                  setListingType('SATILIK');
                  setPropertyType('VILLA');
                }}
              >
                Müstakil Ev & Villalar
              </button>
              <button
                type="button"
                className={`hepsi-quick-chip ${city === 'Ankara' ? 'is-active' : ''}`}
                onClick={() => setCity(city === 'Ankara' ? '' : 'Ankara')}
              >
                Ankara İlanları
              </button>
              <button
                type="button"
                className={`hepsi-quick-chip ${city === 'İstanbul' ? 'is-active' : ''}`}
                onClick={() => setCity(city === 'İstanbul' ? '' : 'İstanbul')}
              >
                İstanbul İlanları
              </button>
            </div>
          </div>
        </div>
      </section>

      <Breadcrumb
        items={[
          { label: 'Ana Sayfa', onClick: resetFilters },
          ...(listingType !== 'ALL'
            ? [{ label: formatListingTypeLabel(listingType) }]
            : [{ label: 'Tüm Gayrimenkul İlanları' }]),
          ...(city ? [{ label: city }] : []),
          ...(district ? [{ label: district }] : []),
        ]}
      />

      <SidebarFilterLayout
        filterContent={filterContent}
        filterFooter={filterFooter}
        mobileFilterOpen={mobileFilterOpen}
        onCloseMobileFilter={() => setMobileFilterOpen(false)}
      >
        {/* Sağ Üst Sonuç Barı (Screenshot #2) */}
        <div className="results-header-card">
          <div className="results-count-text">
            <strong>
              {listingType === 'ALL'
                ? 'Gayrimenkul İlanları'
                : `${formatListingTypeLabel(listingType)} Ev Fiyatları`}
            </strong>{' '}
            için <strong>{filteredProperties.length}</strong> ilan bulundu
          </div>

          <div className="results-toolbar-right">
            {/* Yalnızca mobilde görünen filtre tetikleyicisi */}
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
              onClick={() => setDisplayMode('map')}
            >
              Harita
            </Button>

            <Button
              variant={displayMode === 'horizontal' ? 'secondary' : 'outline'}
              size="icon-sm"
              pill
              onClick={() => setDisplayMode('horizontal')}
              title="Geniş Liste Görünümü"
            >
              <List size={15} />
            </Button>

            <Button
              variant={displayMode === 'grid' ? 'secondary' : 'outline'}
              size="icon-sm"
              pill
              onClick={() => setDisplayMode('grid')}
              title="Vitrin Kart Görünümü"
            >
              <LayoutGrid size={15} />
            </Button>

            <Select
              selectSize="sm"
              pill
              value={sortKey}
              onChange={setSortKey}
              options={[
                { value: 'created_at:desc', label: 'Sırala: En Yeni İlanlar' },
                { value: 'price:asc', label: 'Fiyata Göre (Artan)' },
                { value: 'price:desc', label: 'Fiyata Göre (Azalan)' },
                { value: 'gross_sqm:desc', label: 'Metrekare (Büyükten Küçüğe)' },
              ]}
            />
          </div>
        </div>

        {/* İlan Kartları Listesi */}
        {loading ? (
          <Card padding="lg">
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Gayrimenkul ilanları yükleniyor...
            </div>
          </Card>
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
            {filteredProperties.map((p) => (
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
            {filteredProperties.map((p) => (
              <PropertyHorizontalCard
                key={p.id}
                property={p}
                isFavorited={favoriteIds.has(p.id)}
                hideCustomerActions={isAgent}
                onSelect={onSelectProperty}
                onToggleFavorite={(id) => void handleToggleFavorite(id)}
                onSelectAgency={onSelectAgency}
                onRequestAppointment={(prop) => setAppointmentProperty(prop)}
              />
            ))}
          </div>
        )}
      </SidebarFilterLayout>

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

      <AppointmentModal
        property={appointmentProperty}
        session={session}
        onClose={() => setAppointmentProperty(null)}
        onBooked={onNotify}
        onRequireAuth={() =>
          onRequireAuth('Randevu oluşturmak için lütfen giriş yapınız.')
        }
      />
    </PageContainer>
  );
}

export default MarketplacePage;
