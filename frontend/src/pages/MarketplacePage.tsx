import { useCallback, useEffect, useMemo, useState } from 'react';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import {
  MetadataList,
  MetadataListItem,
} from '@astryxdesign/core/MetadataList';
import { Selector } from '@astryxdesign/core/Selector';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { fetchAgencies } from '../api/agencies';
import { ApiError } from '../api/client';
import { addFavorite, fetchFavorites, removeFavorite } from '../api/favorites';
import {
  buildPropertyPrintSheetUrl,
  fetchProperties,
} from '../api/properties';
import { LocationPicker } from '../components/common/LocationPicker';
import { PageFrame } from '../components/layout/PageFrame';
import type {
  AgencyRecord,
  FavoriteItemRecord,
  NavDestination,
  PropertyRecord,
  UserSession,
} from '../types';
import {
  formatCurrencyTRY,
  formatDigitsOnly,
  HEATING_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
} from '../utils/formatters';

interface MarketplacePageProps {
  currentUser: UserSession;
  onNavigate: (dest: NavDestination) => void;
  onNavigateAuth: () => void;
  initialAgencyId?: number | null;
}

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800';

const LISTING_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tümü (Satılık ve Kiralık)' },
  { value: 'SATILIK', label: 'Satılık' },
  { value: 'KIRALIK', label: 'Kiralık' },
];

const PROPERTY_TYPE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tüm Emlak Türleri' },
  { value: 'DAIRE', label: 'Daire' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'ISYERI', label: 'İşyeri' },
  { value: 'ARSA', label: 'Arsa' },
];

const ROOM_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tüm Oda Sayıları' },
  { value: '1+0', label: '1+0 (Stüdyo)' },
  { value: '1+1', label: '1+1' },
  { value: '2+1', label: '2+1' },
  { value: '3+1', label: '3+1' },
  { value: '4+1', label: '4+1' },
  { value: '5+1', label: '5+1' },
];

const HEATING_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tüm Isınma Türleri' },
  { value: 'DOGALGAZ_KOMBI', label: 'Doğalgaz Kombi' },
  { value: 'MERKEZI', label: 'Merkezi Sistem' },
  { value: 'YERDEN_ISITMA', label: 'Yerden Isıtma' },
  { value: 'KLIMA', label: 'Klima' },
  { value: 'SOBA', label: 'Soba' },
];

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat Artan' },
  { value: 'price_desc', label: 'Fiyat Azalan' },
  { value: 'sqm_desc', label: 'Metrekare Azalan' },
];

function parseSort(option: string): { sort_by: string; sort_dir: string } {
  switch (option) {
    case 'price_asc':
      return { sort_by: 'price', sort_dir: 'asc' };
    case 'price_desc':
      return { sort_by: 'price', sort_dir: 'desc' };
    case 'sqm_desc':
      return { sort_by: 'gross_sqm', sort_dir: 'desc' };
    case 'created_desc':
    default:
      return { sort_by: 'created_at', sort_dir: 'desc' };
  }
}

function sanitizeSignedFloor(raw: string): string {
  const trimmed = raw.trim();
  const isNeg = trimmed.startsWith('-');
  const digits = trimmed.replace(/\D/g, '').slice(0, 3);
  if (!digits) return isNeg ? '-' : '';
  return isNeg ? `-${digits}` : digits;
}

/**
 * Ortak İlan Vitrini (P7):
 * - Girişsiz ziyaretçilerin tüm yetki belgeli emlak ofislerinin aktif ilanlarını gezmesi ve filtrelemesi
 * - BR-08 uyarınca favorilere ekleme ve randevu işlemlerinde kayıtlı kullanıcı doğrulaması
 * - İlan detayı, emlak ofisi TTBS bilgileri ve A4 Bilgi Fişi / PDF çıktısı Drawer paneli
 */
export function MarketplacePage({
  currentUser,
  onNavigate,
  onNavigateAuth,
  initialAgencyId = null,
}: MarketplacePageProps) {
  const showToast = useToast();
  const isVisitor = currentUser.role === 'VISITOR' || currentUser.id <= 0;

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [agencies, setAgencies] = useState<AgencyRecord[]>([]);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItemRecord[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [togglingPropertyId, setTogglingPropertyId] = useState<number | null>(
    null,
  );
  const [br08BannerMessage, setBr08BannerMessage] = useState<string | null>(
    null,
  );
  const [detailProperty, setDetailProperty] = useState<PropertyRecord | null>(
    null,
  );

  // Çoklu filtre durumları
  const [listingType, setListingType] = useState<string>('ALL');
  const [propertyType, setPropertyType] = useState<string>('ALL');
  const [roomCount, setRoomCount] = useState<string>('ALL');
  const [heatingType, setHeatingType] = useState<string>('ALL');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(
    initialAgencyId ? String(initialAgencyId) : 'ALL',
  );
  const [city, setCity] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minSqm, setMinSqm] = useState<string>('');
  const [maxSqm, setMaxSqm] = useState<string>('');
  const [floorNumber, setFloorNumber] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('created_desc');

  useEffect(() => {
    if (initialAgencyId !== null && initialAgencyId !== undefined) {
      setSelectedAgencyId(String(initialAgencyId));
      setActiveTab('ALL');
    }
  }, [initialAgencyId]);

  const loadAgenciesList = useCallback(async () => {
    try {
      const res = await fetchAgencies();
      setAgencies(res.agencies);
    } catch {
      // ignore offline
    }
  }, []);

  const loadFavoritesList = useCallback(async () => {
    if (isVisitor) {
      setFavoriteItems([]);
      setFavoriteIds([]);
      return;
    }
    try {
      const res = await fetchFavorites(currentUser.id);
      setFavoriteItems(res.favorites);
      setFavoriteIds(res.favorite_property_ids);
    } catch {
      // ignore offline
    }
  }, [currentUser.id, isVisitor]);

  useEffect(() => {
    void loadAgenciesList();
  }, [loadAgenciesList]);

  useEffect(() => {
    setBr08BannerMessage(null);
    void loadFavoritesList();
  }, [loadFavoritesList]);

  const loadMarketplaceProperties = useCallback(async () => {
    setIsLoading(true);
    try {
      const { sort_by, sort_dir } = parseSort(sortOption);
      const parsedFloor =
        floorNumber.trim() !== '' && floorNumber.trim() !== '-'
          ? Number(floorNumber)
          : undefined;

      const res = await fetchProperties({
        agency_id:
          selectedAgencyId !== 'ALL' ? Number(selectedAgencyId) : undefined,
        listing_type: listingType,
        property_type: propertyType,
        status: 'AKTIF',
        room_count: roomCount,
        heating_type: heatingType,
        city: city || undefined,
        district: district || undefined,
        neighborhood: neighborhood || undefined,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        min_sqm: minSqm ? Number(minSqm) : undefined,
        max_sqm: maxSqm ? Number(maxSqm) : undefined,
        floor_number:
          parsedFloor !== undefined && !Number.isNaN(parsedFloor)
            ? parsedFloor
            : undefined,
        search: searchQuery || undefined,
        sort_by,
        sort_dir,
      });
      setProperties(res.properties);
    } catch {
      showToast({
        body: 'Vitrin ilanları yüklenirken bağlantı hatası oluştu.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedAgencyId,
    listingType,
    propertyType,
    roomCount,
    heatingType,
    city,
    district,
    neighborhood,
    minPrice,
    maxPrice,
    minSqm,
    maxSqm,
    floorNumber,
    searchQuery,
    sortOption,
    showToast,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMarketplaceProperties();
    }, 150);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadMarketplaceProperties]);

  const agencyFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Tüm Yetki Belgeli Emlak İşletmeleri' },
      ...agencies.map((a) => ({
        value: String(a.id),
        label: `${a.name} (TTBS: ${a.ttbs_document_no})`,
      })),
    ],
    [agencies],
  );

  const favoriteProperties = useMemo(() => {
    return favoriteItems
      .map((item) => item.property)
      .filter((prop): prop is PropertyRecord => prop !== null);
  }, [favoriteItems]);

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const handleClearFilters = () => {
    setListingType('ALL');
    setPropertyType('ALL');
    setRoomCount('ALL');
    setHeatingType('ALL');
    setSelectedAgencyId('ALL');
    setCity('');
    setDistrict('');
    setNeighborhood('');
    setMinPrice('');
    setMaxPrice('');
    setMinSqm('');
    setMaxSqm('');
    setFloorNumber('');
    setSearchQuery('');
    setSortOption('created_desc');
  };

  const handleToggleFavorite = async (prop: PropertyRecord) => {
    if (isVisitor) {
      const msg =
        'BR-08: İlanları favorilere ekleyebilmek için kayıtlı kullanıcı girişi yapılmalıdır.';
      setBr08BannerMessage(msg);
      showToast({ body: msg, type: 'error' });
      return;
    }

    const currentlyFav = favoriteIdSet.has(prop.id);
    setTogglingPropertyId(prop.id);
    try {
      if (currentlyFav) {
        const res = await removeFavorite(currentUser.id, prop.id);
        showToast({ body: res.message, type: 'info' });
      } else {
        const res = await addFavorite(currentUser.id, prop.id);
        showToast({ body: res.message, type: 'info' });
      }
      await loadFavoritesList();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Favori işlemi sırasında hata oluştu.';
      showToast({ body: msg, type: 'error' });
    } finally {
      setTogglingPropertyId(null);
    }
  };

  const handleOpenPrintSheet = (prop: PropertyRecord) => {
    const url = buildPropertyPrintSheetUrl(
      prop.id,
      currentUser.customer?.id ?? null,
      true,
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderPropertyCard = (prop: PropertyRecord) => {
    const isFav = favoriteIdSet.has(prop.id);
    const listingLabel =
      LISTING_TYPE_LABELS[prop.listing_type] ?? prop.listing_type;
    const propertyTypeLabel =
      PROPERTY_TYPE_LABELS[prop.property_type] ?? prop.property_type;
    const heatingLabel =
      HEATING_TYPE_LABELS[prop.heating_type] ?? prop.heating_type;

    return (
      <Card key={prop.id} padding={3}>
        <VStack gap={2}>
          <AspectRatio ratio={16 / 10} fit="cover">
            <img
              src={prop.image_url || DEFAULT_FALLBACK_IMAGE}
              alt={prop.title}
            />
          </AspectRatio>

          <HStack justify="between" vAlign="center" wrap="wrap" gap={1}>
            <Token label={`${listingLabel} · ${propertyTypeLabel}`} />
            <Text weight="bold" size="lg">
              {formatCurrencyTRY(prop.price)}
            </Text>
          </HStack>

          <VStack gap={0.5}>
            <Heading level={4}>{prop.title}</Heading>
            <Text color="secondary" size="sm">
              {`${prop.neighborhood}, ${prop.district} / ${prop.city}`}
            </Text>
          </VStack>

          <Text size="sm">
            {`${prop.room_count} · Brüt ${prop.gross_sqm} m² / Net ${prop.net_sqm} m² · ${prop.floor_number}. Kat (${prop.building_floors} Katlı) · ${heatingLabel}`}
          </Text>

          <Text color="secondary" size="sm" maxLines={2}>
            {prop.agent_description}
          </Text>

          <Divider />

          <HStack justify="between" vAlign="center" wrap="wrap" gap={1.5}>
            <HStack gap={1.5} vAlign="center">
              <Avatar
                name={prop.agency?.name ?? 'Emlak Ofisi'}
                src={prop.agency?.logo_url || undefined}
                size="sm"
                shape="rounded"
              />
              <VStack gap={0}>
                <Text weight="medium" size="sm">
                  {prop.agency?.name ?? 'Yetki Belgeli Emlak İşletmesi'}
                </Text>
                {prop.agency?.ttbs_document_no && (
                  <Text color="secondary" size="sm">
                    {`TTBS Belge No: ${prop.agency.ttbs_document_no}`}
                  </Text>
                )}
              </VStack>
            </HStack>
          </HStack>

          <HStack gap={1.5} wrap="wrap">
            <Button
              label={isFav ? 'Favoride (Çıkar)' : 'Favoriye Ekle'}
              variant={isFav ? 'secondary' : 'ghost'}
              size="sm"
              isLoading={togglingPropertyId === prop.id}
              onClick={() => void handleToggleFavorite(prop)}
            />
            <Button
              label="İlan Detayı & Bilgi Fişi"
              variant="primary"
              size="sm"
              onClick={() => setDetailProperty(prop)}
            />
          </HStack>
        </VStack>
      </Card>
    );
  };

  return (
    <PageFrame
      title="Ortak İlan Vitrini"
      subtitle="Yetki belgeli emlak işletmelerinin aktif gayrimenkul portföyünü giriş yapmadan inceleyin, filtreleyin ve favorilerinize ekleyin."
      action={
        <>
          {isVisitor && (
            <Button
              label="Müşteri Girişi Yap"
              variant="primary"
              onClick={onNavigateAuth}
            />
          )}
          <Button
            label="Evimi Sat / Kiraya Ver"
            variant={isVisitor ? 'secondary' : 'primary'}
            onClick={() => onNavigate('sell-request')}
          />
        </>
      }
    >
      {isVisitor && (
        <Banner
          status="info"
          title="Girişsiz Ziyaretçi Modu (BR-08)"
          description="Tüm yetki belgeli emlak ofislerinin aktif ilanlarını giriş yapmadan gezebilir ve filtreleyebilirsiniz. Favorilere Ekleme ve Randevu Alma işlemleri için müşteri girişi yapılması gerekmektedir."
          collapsible={false}
        />
      )}

      {br08BannerMessage && isVisitor && (
        <Banner
          status="warning"
          title="Müşteri Girişi Gerekiyor (BR-08)"
          description={br08BannerMessage}
          endContent={
            <Button
              label="Müşteri Girişi Yap"
              variant="primary"
              size="sm"
              onClick={onNavigateAuth}
            />
          }
          isDismissable
          onDismiss={() => setBr08BannerMessage(null)}
          collapsible={false}
        />
      )}

      <TabList value={activeTab} onChange={setActiveTab} hasDivider>
        <Tab
          value="ALL"
          label="Tüm Aktif İlanlar"
          endContent={<Badge label={properties.length} />}
        />
        <Tab
          value="FAVORITES"
          label="Favorilerim"
          endContent={<Badge label={favoriteProperties.length} />}
        />
      </TabList>

      {activeTab === 'ALL' && (
        <VStack gap={4}>
          {/* Çoklu Filtreleme Kartı */}
          <Card padding={4}>
            <VStack gap={3}>
              <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                <Heading level={3}>Vitrin Arama ve Filtreleme</Heading>
                <Button
                  label="Filtreleri Sıfırla"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                />
              </HStack>
              <Divider />

              <Grid columns={{ minWidth: 180, max: 4 }} gap={2}>
                <Selector
                  label="İşlem Türü"
                  value={listingType}
                  options={LISTING_FILTER_OPTIONS}
                  onChange={(val) => setListingType(val ?? 'ALL')}
                  width="100%"
                />
                <Selector
                  label="Emlak Türü"
                  value={propertyType}
                  options={PROPERTY_TYPE_FILTER_OPTIONS}
                  onChange={(val) => setPropertyType(val ?? 'ALL')}
                  width="100%"
                />
                <Selector
                  label="Oda Sayısı"
                  value={roomCount}
                  options={ROOM_FILTER_OPTIONS}
                  onChange={(val) => setRoomCount(val ?? 'ALL')}
                  width="100%"
                />
                <Selector
                  label="Isınma Türü"
                  value={heatingType}
                  options={HEATING_FILTER_OPTIONS}
                  onChange={(val) => setHeatingType(val ?? 'ALL')}
                  width="100%"
                />
              </Grid>

              <Grid columns={{ minWidth: 200, max: 2 }} gap={2}>
                <Selector
                  label="Emlak İşletmesi"
                  hasSearch
                  searchPlaceholder="Emlak ofisi veya TTBS ara..."
                  value={selectedAgencyId}
                  options={agencyFilterOptions}
                  onChange={(val) => setSelectedAgencyId(val ?? 'ALL')}
                  width="100%"
                />
                <Selector
                  label="Sıralama"
                  value={sortOption}
                  options={SORT_OPTIONS}
                  onChange={(val) => setSortOption(val ?? 'created_desc')}
                  width="100%"
                />
              </Grid>

              <Grid columns={{ minWidth: 160, max: 5 }} gap={2}>
                <TextInput
                  inputMode="numeric"
                  label="Min Fiyat (TL)"
                  placeholder="Örn: 20000"
                  value={minPrice}
                  onChange={(val) => setMinPrice(formatDigitsOnly(val, 12))}
                  width="100%"
                />
                <TextInput
                  inputMode="numeric"
                  label="Max Fiyat (TL)"
                  placeholder="Örn: 8500000"
                  value={maxPrice}
                  onChange={(val) => setMaxPrice(formatDigitsOnly(val, 12))}
                  width="100%"
                />
                <TextInput
                  inputMode="numeric"
                  label="Min Brüt m²"
                  placeholder="Örn: 90"
                  value={minSqm}
                  onChange={(val) => setMinSqm(formatDigitsOnly(val, 6))}
                  width="100%"
                />
                <TextInput
                  inputMode="numeric"
                  label="Max Brüt m²"
                  placeholder="Örn: 200"
                  value={maxSqm}
                  onChange={(val) => setMaxSqm(formatDigitsOnly(val, 6))}
                  width="100%"
                />
                <TextInput
                  inputMode="numeric"
                  label="Bulunduğu Kat"
                  placeholder="Örn: 3"
                  value={floorNumber}
                  onChange={(val) => setFloorNumber(sanitizeSignedFloor(val))}
                  width="100%"
                />
              </Grid>

              <LocationPicker
                city={city}
                district={district}
                neighborhood={neighborhood}
                requiredMark={false}
                onChange={(next) => {
                  setCity(next.city);
                  setDistrict(next.district);
                  setNeighborhood(next.neighborhood);
                }}
              />

              <TextInput
                label="Kelime ile Arama"
                placeholder="Başlık, mahalle, metroya yakın, güneş gören, balkonlu vb..."
                value={searchQuery}
                onChange={setSearchQuery}
                width="100%"
              />
            </VStack>
          </Card>

          {/* Aktif İlan Vitrin Kartları */}
          {properties.length === 0 ? (
            <EmptyState
              title={
                isLoading
                  ? 'Aktif vitrin ilanları yükleniyor...'
                  : 'Seçili filtrelere uygun aktif ilan bulunamadı'
              }
              description="Filtreleri genişletebilir veya tüm yetki belgeli emlak ofislerinin portföyünü görmek için filtreleri sıfırlayabilirsiniz."
              actions={
                <Button
                  label="Filtreleri Sıfırla"
                  variant="secondary"
                  onClick={handleClearFilters}
                />
              }
            />
          ) : (
            <Grid columns={{ minWidth: 280, max: 3 }} gap={3}>
              {properties.map((prop) => renderPropertyCard(prop))}
            </Grid>
          )}
        </VStack>
      )}

      {activeTab === 'FAVORITES' && (
        <VStack gap={3}>
          {isVisitor ? (
            <EmptyState
              title="Favorilerinizi görüntülemek için giriş yapın (BR-08)"
              description="Ziyaretçiler tüm aktif ilanları giriş yapmadan gezebilir; favori listesi oluşturmak ve ilanları kaydetmek için kayıtlı kullanıcı girişi yapılmalıdır."
              actions={
                <Button
                  label="Müşteri Girişi Yap"
                  variant="primary"
                  onClick={onNavigateAuth}
                />
              }
            />
          ) : favoriteProperties.length === 0 ? (
            <EmptyState
              title="Henüz favori ilanınız bulunmuyor"
              description="Tüm Aktif İlanlar sekmesinden beğendiğiniz gayrimenkulleri favorilerinize ekleyebilirsiniz."
              actions={
                <Button
                  label="Aktif İlanları İncele"
                  variant="primary"
                  onClick={() => setActiveTab('ALL')}
                />
              }
            />
          ) : (
            <Grid columns={{ minWidth: 280, max: 3 }} gap={3}>
              {favoriteProperties.map((prop) => renderPropertyCard(prop))}
            </Grid>
          )}
        </VStack>
      )}

      {/* İlan Detayı & Bilgi Fişi Drawer */}
      <Drawer
        isOpen={detailProperty !== null}
        onOpenChange={(open) => {
          if (!open) setDetailProperty(null);
        }}
        label={detailProperty?.title ?? 'İlan Detayı'}
        width={520}
      >
        <Layout
          header={
            <DrawerHeader
              title={detailProperty?.title ?? 'İlan Detayı'}
              subtitle={
                detailProperty
                  ? `${LISTING_TYPE_LABELS[detailProperty.listing_type] ?? detailProperty.listing_type} · ${PROPERTY_TYPE_LABELS[detailProperty.property_type] ?? detailProperty.property_type} · ${formatCurrencyTRY(detailProperty.price)}`
                  : undefined
              }
              onOpenChange={(open) => {
                if (!open) setDetailProperty(null);
              }}
              hasDivider
            />
          }
          content={
            <LayoutContent>
              {detailProperty && (
                <VStack gap={4}>
                  <AspectRatio ratio={16 / 9} fit="cover">
                    <img
                      src={detailProperty.image_url || DEFAULT_FALLBACK_IMAGE}
                      alt={detailProperty.title}
                    />
                  </AspectRatio>

                  <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                    <Token
                      label={`${LISTING_TYPE_LABELS[detailProperty.listing_type] ?? detailProperty.listing_type} · ${PROPERTY_TYPE_LABELS[detailProperty.property_type] ?? detailProperty.property_type}`}
                    />
                    <Heading level={3}>
                      {formatCurrencyTRY(detailProperty.price)}
                    </Heading>
                  </HStack>

                  <MetadataList>
                    <MetadataListItem label="İlan Kayıt No">
                      <Text weight="medium">{`#${detailProperty.id}`}</Text>
                    </MetadataListItem>
                    <MetadataListItem label="Oda Sayısı">
                      <Text weight="medium">{detailProperty.room_count}</Text>
                    </MetadataListItem>
                    <MetadataListItem label="Brüt / Net Metrekare">
                      <Text>
                        {`${detailProperty.gross_sqm} m² Brüt / ${detailProperty.net_sqm} m² Net`}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Bulunduğu Kat / Bina Katı">
                      <Text>
                        {`${detailProperty.floor_number}. Kat / ${detailProperty.building_floors} Katlı`}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Isınma Sistemi">
                      <Text>
                        {HEATING_TYPE_LABELS[detailProperty.heating_type] ??
                          detailProperty.heating_type}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Konum">
                      <Text>
                        {`${detailProperty.neighborhood}, ${detailProperty.district} / ${detailProperty.city}`}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Açık Adres">
                      <Text>{detailProperty.address_detail}</Text>
                    </MetadataListItem>
                  </MetadataList>

                  <Card padding={3} variant="muted">
                    <VStack gap={1}>
                      <Heading level={4}>Emlakçı Özel Tasviri</Heading>
                      <Text size="sm">{detailProperty.agent_description}</Text>
                    </VStack>
                  </Card>

                  {detailProperty.agency && (
                    <Card padding={3} variant="muted">
                      <VStack gap={2}>
                        <Heading level={4}>
                          Yetki Belgeli Emlak İşletmesi İletişim Bilgileri
                        </Heading>
                        <HStack gap={2} vAlign="center">
                          <Avatar
                            name={detailProperty.agency.name}
                            src={detailProperty.agency.logo_url || undefined}
                            size="md"
                            shape="rounded"
                          />
                          <VStack gap={0.5}>
                            <Text weight="semibold">
                              {detailProperty.agency.name}
                            </Text>
                            <Token
                              label={`TTBS Belge No: ${detailProperty.agency.ttbs_document_no}`}
                            />
                          </VStack>
                        </HStack>
                        <MetadataList>
                          <MetadataListItem label="Yetkili Danışman">
                            <Text>{detailProperty.agency.authorized_person}</Text>
                          </MetadataListItem>
                          <MetadataListItem label="Ofis / Cep Telefonu">
                            <Text>
                              {`${detailProperty.agency.phone}${detailProperty.agency.mobile_phone ? ` · ${detailProperty.agency.mobile_phone}` : ''}`}
                            </Text>
                          </MetadataListItem>
                          <MetadataListItem label="İşletme Adresi">
                            <Text>{detailProperty.agency.address}</Text>
                          </MetadataListItem>
                        </MetadataList>
                      </VStack>
                    </Card>
                  )}
                </VStack>
              )}
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack justify="between" vAlign="center" wrap="wrap" gap={1.5}>
                <Button
                  label="Kapat"
                  variant="ghost"
                  onClick={() => setDetailProperty(null)}
                />
                <HStack gap={1.5} wrap="wrap">
                  <Button
                    label="A4 Bilgi Fişi / PDF Yazdır"
                    variant="secondary"
                    onClick={() => {
                      if (detailProperty) {
                        handleOpenPrintSheet(detailProperty);
                      }
                    }}
                  />
                  <Button
                    label="Randevu Takvimine Git"
                    variant="primary"
                    onClick={() => {
                      setDetailProperty(null);
                      onNavigate('calendar');
                    }}
                  />
                </HStack>
              </HStack>
            </LayoutFooter>
          }
        />
      </Drawer>
    </PageFrame>
  );
}
