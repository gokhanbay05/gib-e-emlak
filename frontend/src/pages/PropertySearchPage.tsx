import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
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
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { ApiError } from '../api/client';
import { fetchCustomers } from '../api/customers';
import {
  buildPropertyPrintSheetUrl,
  createSearchRequest,
  fetchProperties,
  fetchSearchRequests,
} from '../api/properties';
import { LocationPicker } from '../components/common/LocationPicker';
import { PageFrame } from '../components/layout/PageFrame';
import type {
  CustomerRecord,
  PropertyRecord,
  SearchRequestRecord,
  UserSession,
} from '../types';
import {
  CUSTOMER_TYPE_LABELS,
  formatCurrencyTRY,
  formatDigitsOnly,
  formatTurkishPhone,
  HEATING_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  normalizeTurkish,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
} from '../utils/formatters';

interface PropertySearchPageProps {
  currentUser: UserSession;
  onNavigateAuth: () => void;
  onDataChanged?: () => void;
}

const LISTING_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tümü (Satılık ve Kiralık)' },
  { value: 'KIRALIK', label: 'Kiralık' },
  { value: 'SATILIK', label: 'Satılık' },
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

const STATUS_FILTER_OPTIONS = [
  { value: 'AKTIF', label: 'Sadece Aktif İlanlar' },
  { value: 'ALL', label: 'Tüm Durumlar' },
  { value: 'SATILDI', label: 'Satıldı' },
  { value: 'KIRALANDI', label: 'Kiralandı' },
  { value: 'PASIF', label: 'Pasif' },
];

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'En Yeni İlanlar' },
  { value: 'price_asc', label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'price_desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { value: 'sqm_desc', label: 'Metrekare: Büyükten Küçüğe' },
  { value: 'sqm_asc', label: 'Metrekare: Küçükten Büyüğe' },
];

function parseSort(option: string): { sort_by: string; sort_dir: string } {
  switch (option) {
    case 'price_asc':
      return { sort_by: 'price', sort_dir: 'asc' };
    case 'price_desc':
      return { sort_by: 'price', sort_dir: 'desc' };
    case 'sqm_desc':
      return { sort_by: 'gross_sqm', sort_dir: 'desc' };
    case 'sqm_asc':
      return { sort_by: 'gross_sqm', sort_dir: 'asc' };
    case 'created_desc':
    default:
      return { sort_by: 'created_at', sort_dir: 'desc' };
  }
}

function sanitizeSignedInt(raw: string): string {
  const trimmed = raw.trim();
  const isNeg = trimmed.startsWith('-');
  const digits = trimmed.replace(/\D/g, '').slice(0, 3);
  if (!digits) return isNeg ? '-' : '';
  return isNeg ? `-${digits}` : digits;
}

/**
 * Detaylı İlan Arama, Çoklu Filtreleme ve Yazıcı / PDF Bilgi Fişi Çıktısı (GİB Madde 4 & Altın Senaryo):
 * - Arayan müşteri (Alıcı / Kiracı) seçimi ve kayıtlı müşteri talebini tek tıkla filtrelere uygulama
 * - Çoklu filtreleme (İşlem türü, emlak türü, il/ilçe/mahalle, fiyat aralığı, m² aralığı, oda, kat, ısınma, kelime arama, sıralama)
 * - BR-05: Eşleşen ilan için kurumsal A4 Yazıcı / PDF Bilgi Fişi önizleme ve yazdırma
 */
export function PropertySearchPage({
  currentUser,
  onNavigateAuth,
  onDataChanged,
}: PropertySearchPageProps) {
  const showToast = useToast();
  const agencyId =
    currentUser.role === 'AGENT' && currentUser.agency
      ? currentUser.agency.id
      : undefined;

  // Müşteri ve kayıtlı arama talepleri
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [searchRequests, setSearchRequests] = useState<SearchRequestRecord[]>(
    [],
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null,
  );
  const [requestNote, setRequestNote] = useState('');
  const [isSavingRequest, setIsSavingRequest] = useState(false);

  // Çoklu filtre durumları
  const [listingType, setListingType] = useState<string>('ALL');
  const [propertyType, setPropertyType] = useState<string>('ALL');
  const [roomCount, setRoomCount] = useState<string>('ALL');
  const [heatingType, setHeatingType] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('AKTIF');
  const [city, setCity] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minSqm, setMinSqm] = useState<string>('');
  const [maxSqm, setMaxSqm] = useState<string>('');
  const [floorNumber, setFloorNumber] = useState<string>('');
  const [buildingFloors, setBuildingFloors] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('created_desc');

  // Sonuçlar ve önizleme durumları
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [infoSheetProperty, setInfoSheetProperty] =
    useState<PropertyRecord | null>(null);
  const [detailProperty, setDetailProperty] = useState<PropertyRecord | null>(
    null,
  );

  const loadCustomersAndRequests = useCallback(async () => {
    try {
      const [custRes, reqRes] = await Promise.all([
        fetchCustomers({ agency_id: agencyId }),
        fetchSearchRequests({ agency_id: agencyId }),
      ]);
      setCustomers(custRes.customers);
      setSearchRequests(reqRes.search_requests);
    } catch {
      // ignore initial offline
    }
  }, [agencyId]);

  useEffect(() => {
    void loadCustomersAndRequests();
  }, [loadCustomersAndRequests]);

  const executeSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { sort_by, sort_dir } = parseSort(sortOption);
      const parsedFloor =
        floorNumber.trim() !== '' && floorNumber.trim() !== '-'
          ? Number(floorNumber)
          : undefined;
      const parsedBuildingFloors =
        buildingFloors.trim() !== '' ? Number(buildingFloors) : undefined;

      const res = await fetchProperties({
        agency_id: agencyId,
        listing_type: listingType,
        property_type: propertyType,
        status: statusFilter,
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
        building_floors:
          parsedBuildingFloors !== undefined &&
          !Number.isNaN(parsedBuildingFloors)
            ? parsedBuildingFloors
            : undefined,
        search: searchQuery || undefined,
        sort_by,
        sort_dir,
      });
      setProperties(res.properties);
    } catch {
      showToast({
        body: 'İlan arama sonuçları yüklenirken bağlantı hatası oluştu.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    agencyId,
    listingType,
    propertyType,
    statusFilter,
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
    buildingFloors,
    searchQuery,
    sortOption,
    showToast,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void executeSearch();
    }, 150);
    return () => {
      window.clearTimeout(timer);
    };
  }, [executeSearch]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const selectedCustomerRequest = useMemo(
    () =>
      selectedCustomerId !== null
        ? searchRequests.find((r) => r.customer_id === selectedCustomerId) ??
          null
        : null,
    [searchRequests, selectedCustomerId],
  );

  const customerOptions = useMemo(
    () =>
      customers.map((c) => {
        const typeLabel =
          CUSTOMER_TYPE_LABELS[c.customer_type] ?? c.customer_type;
        const summary = `${c.full_name} · ${typeLabel} · ${c.mobile_phone}`;
        const norm = normalizeTurkish(
          `${c.full_name} ${typeLabel} ${c.mobile_phone}`,
        );
        return {
          value: String(c.id),
          label: `${summary} ${norm}`,
          description: summary,
        };
      }),
    [customers],
  );

  const applyRequestToFilters = (req: SearchRequestRecord) => {
    setSelectedCustomerId(req.customer_id);
    setListingType(req.listing_type || 'ALL');
    setPropertyType(req.property_type || 'ALL');
    setRoomCount(req.room_count || 'ALL');
    setHeatingType(req.heating_type || 'ALL');
    setCity(req.city || '');
    setDistrict(req.district || '');
    setNeighborhood('');
    setMinSqm(req.min_sqm !== null ? String(req.min_sqm) : '');
    setMaxSqm(req.max_sqm !== null ? String(req.max_sqm) : '');
    setFloorNumber(
      req.floor_preference !== null ? String(req.floor_preference) : '',
    );
    setBuildingFloors('');
    setMinPrice(
      req.min_price !== null ? String(Math.round(req.min_price)) : '',
    );
    setMaxPrice(
      req.max_price !== null ? String(Math.round(req.max_price)) : '',
    );
    setStatusFilter('AKTIF');
    setRequestNote(req.natural_language_prompt || '');
    showToast({
      body: `${req.customer_name} müşterisinin arama talebi filtrelere uygulandı.`,
      type: 'info',
    });
  };

  const handleClearFilters = () => {
    setListingType('ALL');
    setPropertyType('ALL');
    setRoomCount('ALL');
    setHeatingType('ALL');
    setStatusFilter('AKTIF');
    setCity('');
    setDistrict('');
    setNeighborhood('');
    setMinPrice('');
    setMaxPrice('');
    setMinSqm('');
    setMaxSqm('');
    setFloorNumber('');
    setBuildingFloors('');
    setSearchQuery('');
    setSortOption('created_desc');
  };

  const handleSaveSearchRequest = async () => {
    if (!agencyId) {
      showToast({
        body: 'Müşteri talebi kaydetmek için emlak işletmesi girişi gereklidir.',
        type: 'error',
      });
      return;
    }
    if (!selectedCustomerId) {
      showToast({
        body: 'Lütfen önce talep kaydedilecek müşteriyi seçiniz.',
        type: 'error',
      });
      return;
    }
    const effectiveListing = listingType === 'ALL' ? 'KIRALIK' : listingType;
    setIsSavingRequest(true);
    try {
      const res = await createSearchRequest({
        agency_id: agencyId,
        customer_id: selectedCustomerId,
        listing_type: effectiveListing,
        property_type: propertyType !== 'ALL' ? propertyType : undefined,
        room_count: roomCount !== 'ALL' ? roomCount : undefined,
        heating_type: heatingType !== 'ALL' ? heatingType : undefined,
        min_sqm: minSqm ? Number(minSqm) : null,
        max_sqm: maxSqm ? Number(maxSqm) : null,
        floor_preference:
          floorNumber && floorNumber !== '-' ? Number(floorNumber) : null,
        min_price: minPrice ? Number(minPrice) : null,
        max_price: maxPrice ? Number(maxPrice) : null,
        city: city || undefined,
        district: district || undefined,
        natural_language_prompt: requestNote || searchQuery || undefined,
      });
      showToast({ body: res.message, type: 'info' });
      await loadCustomersAndRequests();
      onDataChanged?.();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Müşteri arama talebi kaydedilemedi.';
      showToast({ body: msg, type: 'error' });
    } finally {
      setIsSavingRequest(false);
    }
  };

  const handleOpenPrintWindow = (prop: PropertyRecord, autoPrint = true) => {
    const url = buildPropertyPrintSheetUrl(
      prop.id,
      selectedCustomerId,
      autoPrint,
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const columns: TableColumn<PropertyRecord>[] = [
    {
      key: 'title',
      header: 'Eşleşen Gayrimenkul İlanı',
      renderCell: (p) => (
        <HStack gap={2} vAlign="center">
          <Thumbnail
            src={p.image_url || undefined}
            alt={p.title}
            label={p.title}
            onClick={() => setDetailProperty(p)}
          />
          <VStack gap={0.5}>
            <Text weight="semibold">{p.title}</Text>
            <Text color="secondary" size="sm">
              {`#${p.id} · ${LISTING_TYPE_LABELS[p.listing_type] ?? p.listing_type} · ${PROPERTY_TYPE_LABELS[p.property_type] ?? p.property_type} · Durum: ${PROPERTY_STATUS_LABELS[p.status] ?? p.status}`}
            </Text>
          </VStack>
        </HStack>
      ),
    },
    {
      key: 'city',
      header: 'Konum',
      renderCell: (p) => (
        <VStack gap={0.5}>
          <Text weight="medium" size="sm">
            {`${p.district} / ${p.city}`}
          </Text>
          <Text color="secondary" size="sm">
            {p.neighborhood}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'room_count',
      header: 'Teknik Özellikler',
      renderCell: (p) => (
        <VStack gap={0.5}>
          <Text size="sm">
            {`${p.room_count} · Brüt ${p.gross_sqm} m² (Net ${p.net_sqm} m²)`}
          </Text>
          <Text color="secondary" size="sm">
            {`Kat: ${p.floor_number}/${p.building_floors} · ${HEATING_TYPE_LABELS[p.heating_type] ?? p.heating_type}`}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'owner',
      header: 'Mülk Sahibi',
      renderCell: (p) => (
        <VStack gap={0.5}>
          <Text weight="medium" size="sm">
            {p.owner ? p.owner.full_name : '-'}
          </Text>
          <Text color="secondary" size="sm">
            {p.owner?.mobile_phone ?? '-'}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'price',
      header: 'Fiyat',
      renderCell: (p) => (
        <Text weight="semibold">{formatCurrencyTRY(p.price)}</Text>
      ),
    },
    {
      key: 'actions',
      header: 'Yazıcı Çıktısı ve Detay',
      renderCell: (p) => (
        <HStack gap={1} wrap="wrap">
          <Button
            label="Bilgi Fişi / PDF"
            variant="primary"
            size="sm"
            onClick={() => setInfoSheetProperty(p)}
          />
          <Button
            label="Detay"
            variant="secondary"
            size="sm"
            onClick={() => setDetailProperty(p)}
          />
        </HStack>
      ),
    },
  ];

  const activeAgency =
    infoSheetProperty?.agency ?? currentUser.agency ?? null;

  return (
    <PageFrame
      title="İlan Arama ve Yazıcı Çıktısı"
      subtitle="Müşteri taleplerine göre portföyü çoklu kriterlerle filtreleyin ve eşleşen kayıt için kurumsal A4 Yazıcı / PDF Bilgi Fişi üretin."
      action={
        <>
          {currentUser.role !== 'AGENT' && (
            <Button
              label="Emlakçı Girişi"
              variant="primary"
              onClick={onNavigateAuth}
            />
          )}
          <Button
            label="Filtreleri Temizle"
            variant="secondary"
            onClick={handleClearFilters}
          />
        </>
      }
    >
      {currentUser.role !== 'AGENT' && (
        <Banner
          status="info"
          title="Ziyaretçi / Müşteri Görünümü"
          description="Tüm aktif ilanları filtreleyebilir ve bilgi fişi önizlemesi alabilirsiniz. Emlak işletmesi müşteri talep kaydı için emlakçı girişi yapabilirsiniz."
          collapsible={false}
        />
      )}

      {/* 1. Arayan Müşteri (Alıcı / Kiracı) ve Kayıtlı Talep Seçim Kartı */}
      <Card padding={4}>
        <VStack gap={3}>
          <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
            <VStack gap={0.5}>
              <Heading level={3}>
                Arayan Müşteri ve Talep Eşleştirme (GİB Altın Senaryo)
              </Heading>
              <Text color="secondary" size="sm">
                Ev arayan müşteriyi seçerek kayıtlı talebini tek tıkla filtrelere
                uygulayabilir veya yazıcı bilgi fişinin müşteri bölümüne otomatik
                bağlayabilirsiniz.
              </Text>
            </VStack>
            {selectedCustomer && agencyId && (
              <Button
                label="Mevcut Filtreleri Müşteri Talebi Olarak Kaydet"
                variant="secondary"
                size="sm"
                isLoading={isSavingRequest}
                onClick={() => void handleSaveSearchRequest()}
              />
            )}
          </HStack>

          <Grid columns={{ minWidth: 220, max: 2 }} gap={3}>
            <Selector
              label="Arayan Müşteri (Alıcı / Kiracı)"
              placeholder="Bilgi fişi ve talep sorgusu için müşteri seçiniz"
              hasSearch
              hasClear
              searchPlaceholder="Müşteri adı, tipi veya telefon ile ara..."
              emptyText="Kayıtlı müşteri bulunamadı"
              emptySearchText="Eşleşen müşteri bulunamadı"
              value={
                selectedCustomerId !== null ? String(selectedCustomerId) : null
              }
              options={customerOptions}
              renderOption={(opt) => (
                <Text>{opt.description ?? opt.value}</Text>
              )}
              renderValue={(opt) => (
                <Text>{opt.description ?? opt.value}</Text>
              )}
              onChange={(val) => {
                if (!val) {
                  setSelectedCustomerId(null);
                  return;
                }
                const nextId = Number(val);
                setSelectedCustomerId(nextId);
                const existingReq = searchRequests.find(
                  (r) => r.customer_id === nextId,
                );
                if (existingReq) {
                  applyRequestToFilters(existingReq);
                }
              }}
              width="100%"
            />

            <TextInput
              label="Müşteri Talep Notu / Özel Beklenti"
              placeholder="Örn: Metroya yakın, güneş gören, kombili 3+1 ara kat aile dairesi..."
              value={requestNote}
              onChange={setRequestNote}
              width="100%"
            />
          </Grid>

          {selectedCustomerRequest && (
            <Card padding={3} variant="muted">
              <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                <VStack gap={0.5}>
                  <Text weight="semibold" size="sm">
                    {`${selectedCustomerRequest.customer_name} — Kayıtlı Arama Talebi`}
                  </Text>
                  <Text color="secondary" size="sm">
                    {[
                      LISTING_TYPE_LABELS[
                        selectedCustomerRequest.listing_type
                      ] ?? selectedCustomerRequest.listing_type,
                      PROPERTY_TYPE_LABELS[
                        selectedCustomerRequest.property_type
                      ] ?? selectedCustomerRequest.property_type,
                      selectedCustomerRequest.room_count,
                      selectedCustomerRequest.min_sqm ||
                      selectedCustomerRequest.max_sqm
                        ? `${selectedCustomerRequest.min_sqm ?? '-'}–${selectedCustomerRequest.max_sqm ?? '-'} m²`
                        : '',
                      selectedCustomerRequest.floor_preference !== null
                        ? `${selectedCustomerRequest.floor_preference}. Kat`
                        : '',
                      HEATING_TYPE_LABELS[
                        selectedCustomerRequest.heating_type
                      ] ?? selectedCustomerRequest.heating_type,
                      selectedCustomerRequest.min_price !== null ||
                      selectedCustomerRequest.max_price !== null
                        ? `${selectedCustomerRequest.min_price !== null ? formatCurrencyTRY(selectedCustomerRequest.min_price) : '-'} – ${selectedCustomerRequest.max_price !== null ? formatCurrencyTRY(selectedCustomerRequest.max_price) : '-'}`
                        : '',
                      selectedCustomerRequest.district &&
                      selectedCustomerRequest.city
                        ? `${selectedCustomerRequest.district} / ${selectedCustomerRequest.city}`
                        : selectedCustomerRequest.city,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </VStack>
                <Button
                  label="Talebi Filtrelere Uygula"
                  variant="primary"
                  size="sm"
                  onClick={() => applyRequestToFilters(selectedCustomerRequest)}
                />
              </HStack>
            </Card>
          )}

          {searchRequests.length > 0 && !selectedCustomerRequest && (
            <HStack gap={1.5} vAlign="center" wrap="wrap">
              <Text color="secondary" size="sm">
                Hızlı Talep Yükle:
              </Text>
              {searchRequests.slice(0, 4).map((req) => (
                <Button
                  key={req.id}
                  label={`${req.customer_name} (${LISTING_TYPE_LABELS[req.listing_type] ?? req.listing_type} ${req.room_count || ''})`}
                  variant="ghost"
                  size="sm"
                  onClick={() => applyRequestToFilters(req)}
                />
              ))}
            </HStack>
          )}
        </VStack>
      </Card>

      {/* 2. Çoklu Detaylı Filtreleme Kartı (GİB Madde 4) */}
      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={3}>Detaylı Emlak Arama Filtreleri</Heading>
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

          <Grid columns={{ minWidth: 160, max: 4 }} gap={2}>
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
              placeholder="Örn: 35000"
              value={maxPrice}
              onChange={(val) => setMaxPrice(formatDigitsOnly(val, 12))}
              width="100%"
            />
            <TextInput
              inputMode="numeric"
              label="Min Brüt m²"
              placeholder="Örn: 100"
              value={minSqm}
              onChange={(val) => setMinSqm(formatDigitsOnly(val, 6))}
              width="100%"
            />
            <TextInput
              inputMode="numeric"
              label="Max Brüt m²"
              placeholder="Örn: 160"
              value={maxSqm}
              onChange={(val) => setMaxSqm(formatDigitsOnly(val, 6))}
              width="100%"
            />
          </Grid>

          <Grid columns={{ minWidth: 160, max: 4 }} gap={2}>
            <TextInput
              inputMode="numeric"
              label="Bulunduğu Kat"
              placeholder="Örn: 3"
              value={floorNumber}
              onChange={(val) => setFloorNumber(sanitizeSignedInt(val))}
              width="100%"
            />
            <TextInput
              inputMode="numeric"
              label="Bina Kat Sayısı"
              placeholder="Örn: 5"
              value={buildingFloors}
              onChange={(val) => setBuildingFloors(formatDigitsOnly(val, 3))}
              width="100%"
            />
            <Selector
              label="İlan Durumu"
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onChange={(val) => setStatusFilter(val ?? 'AKTIF')}
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
            label="Kelime ile Arama (Başlık, Mahalle, Adres veya Emlakçı Özel Tasviri)"
            placeholder="Örn: metroya yakın, güneş gören, balkonlu, otoparklı, Ayrancı..."
            value={searchQuery}
            onChange={setSearchQuery}
            width="100%"
          />
        </VStack>
      </Card>

      {/* 3. Arama Sonuçları ve Yazıcı Çıktısı Tablosu */}
      <VStack gap={3}>
        <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
          <HStack gap={1.5} vAlign="center">
            <Heading level={3}>Arama Sonuçları</Heading>
            <Badge label={properties.length} />
          </HStack>
          {selectedCustomer && (
            <Text color="secondary" size="sm">
              {`Seçili Müşteri: ${selectedCustomer.full_name} (${CUSTOMER_TYPE_LABELS[selectedCustomer.customer_type] ?? selectedCustomer.customer_type})`}
            </Text>
          )}
        </HStack>

        <HStack isScrollable width="100%">
          <Table
            data={properties}
            columns={columns}
            idKey="id"
            hasHover
            emptyState={
              <EmptyState
                title={
                  isLoading
                    ? 'İlanlar sorgulanıyor...'
                    : 'Kriterlere uygun gayrimenkul kaydı bulunamadı'
                }
                description="Filtre aralığını genişletebilir veya tüm aktif portföyü görmek için filtreleri sıfırlayabilirsiniz."
                actions={
                  <Button
                    label="Filtreleri Sıfırla"
                    variant="secondary"
                    size="sm"
                    onClick={handleClearFilters}
                  />
                }
                isCompact
              />
            }
          />
        </HStack>
      </VStack>

      {/* 4. Kurumsal Yazıcı Çıktısı / PDF Bilgi Fişi Modalı (BR-05) */}
      <Dialog
        isOpen={infoSheetProperty !== null}
        onOpenChange={(open) => {
          if (!open) setInfoSheetProperty(null);
        }}
        width={680}
      >
        <Layout
          header={
            <DialogHeader
              title="Kurumsal Gayrimenkul Bilgi Fişi (Yazıcı / PDF)"
              subtitle={
                infoSheetProperty
                  ? `Belge No: GIB-EMLAK-${String(infoSheetProperty.agency_id).padStart(2, '0')}-${String(infoSheetProperty.id).padStart(4, '0')}`
                  : undefined
              }
              onOpenChange={(open) => {
                if (!open) setInfoSheetProperty(null);
              }}
            />
          }
          content={
            <LayoutContent>
              {infoSheetProperty && (
                <VStack gap={4}>
                  {/* İşyeri Anteti */}
                  <Card padding={3} variant="muted">
                    <HStack
                      justify="between"
                      vAlign="center"
                      wrap="wrap"
                      gap={2}
                    >
                      <HStack gap={2} vAlign="center">
                        <Avatar
                          name={activeAgency?.name ?? 'GİB e-Emlak'}
                          src={activeAgency?.logo_url || undefined}
                          size="lg"
                          shape="rounded"
                        />
                        <VStack gap={0.5}>
                          <Heading level={4}>
                            {activeAgency?.name ??
                              'Yetki Belgeli Emlak İşletmesi'}
                          </Heading>
                          <Text size="sm">
                            {`Yetkili: ${activeAgency?.authorized_person ?? '-'} · TTBS Yetki Belge No: ${activeAgency?.ttbs_document_no ?? '-'} (DOĞRULANDI)`}
                          </Text>
                          <Text color="secondary" size="sm">
                            {`Tel: ${activeAgency?.phone ?? '-'} · Cep: ${activeAgency?.mobile_phone || '-'} · Fax: ${activeAgency?.fax || '-'}`}
                          </Text>
                          <Text color="secondary" size="sm">
                            {`${activeAgency?.neighborhood ?? ''} ${activeAgency?.address ?? ''} ${activeAgency?.district ?? ''} / ${activeAgency?.city ?? ''}`}
                          </Text>
                        </VStack>
                      </HStack>
                    </HStack>
                  </Card>

                  {/* Bilgi Fişi Alıcısı (Arayan Müşteri) Seçimi */}
                  <Selector
                    label="Bilgi Fişi Teslim Edilecek Arayan Müşteri"
                    placeholder="Fiş üzerinde yer alacak müşteriyi seçiniz (Opsiyonel)"
                    hasSearch
                    hasClear
                    searchPlaceholder="Müşteri ara..."
                    value={
                      selectedCustomerId !== null
                        ? String(selectedCustomerId)
                        : null
                    }
                    options={customerOptions}
                    renderOption={(opt) => (
                      <Text>{opt.description ?? opt.value}</Text>
                    )}
                    renderValue={(opt) => (
                      <Text>{opt.description ?? opt.value}</Text>
                    )}
                    onChange={(val) =>
                      setSelectedCustomerId(val ? Number(val) : null)
                    }
                    width="100%"
                  />

                  <Divider />

                  {/* Gayrimenkul Başlık ve Fiyat */}
                  <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                    <VStack gap={0.5}>
                      <Heading level={3}>{infoSheetProperty.title}</Heading>
                      <Text color="secondary" size="sm">
                        {`${LISTING_TYPE_LABELS[infoSheetProperty.listing_type] ?? infoSheetProperty.listing_type} · ${PROPERTY_TYPE_LABELS[infoSheetProperty.property_type] ?? infoSheetProperty.property_type} · ${infoSheetProperty.neighborhood}, ${infoSheetProperty.district} / ${infoSheetProperty.city}`}
                      </Text>
                    </VStack>
                    <Heading level={3}>
                      {formatCurrencyTRY(infoSheetProperty.price)}
                    </Heading>
                  </HStack>

                  {/* Gayrimenkul Teknik Özellikleri */}
                  <MetadataList>
                    <MetadataListItem label="İlan Kayıt No">
                      <Text weight="medium">{`#${infoSheetProperty.id}`}</Text>
                    </MetadataListItem>
                    <MetadataListItem label="İşlem ve Emlak Türü">
                      <Text>
                        {`${LISTING_TYPE_LABELS[infoSheetProperty.listing_type] ?? infoSheetProperty.listing_type} / ${PROPERTY_TYPE_LABELS[infoSheetProperty.property_type] ?? infoSheetProperty.property_type}`}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Oda Sayısı">
                      <Text weight="medium">{infoSheetProperty.room_count}</Text>
                    </MetadataListItem>
                    <MetadataListItem label="Brüt / Net Metrekare">
                      <Text>
                        {`${infoSheetProperty.gross_sqm} m² Brüt / ${infoSheetProperty.net_sqm} m² Net`}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Bulunduğu Kat / Bina Katı">
                      <Text>
                        {`${infoSheetProperty.floor_number}. Kat / ${infoSheetProperty.building_floors} Katlı Bina`}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Isınma Sistemi">
                      <Text>
                        {HEATING_TYPE_LABELS[infoSheetProperty.heating_type] ??
                          infoSheetProperty.heating_type}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Açık Adres">
                      <Text>
                        {`${infoSheetProperty.neighborhood}, ${infoSheetProperty.address_detail} (${infoSheetProperty.district} / ${infoSheetProperty.city})`}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Mülk Sahibi ve Kimlik">
                      <Text>
                        {infoSheetProperty.owner
                          ? `${infoSheetProperty.owner.full_name} (${infoSheetProperty.owner.mobile_phone}) · T.C. Doğrulandı`
                          : '-'}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Talep Eden Müşteri">
                      <Text>
                        {selectedCustomer
                          ? `${selectedCustomer.full_name} (${CUSTOMER_TYPE_LABELS[selectedCustomer.customer_type] ?? selectedCustomer.customer_type} · ${formatTurkishPhone(selectedCustomer.mobile_phone)})`
                          : 'Genel Müşteri Bilgilendirme Fişi'}
                      </Text>
                    </MetadataListItem>
                  </MetadataList>

                  {/* Emlakçı Özel Tasviri */}
                  <Card padding={3} variant="muted">
                    <VStack gap={1}>
                      <Heading level={4}>
                        Emlakçı Özel Tasviri ve Gayrimenkul Notları
                      </Heading>
                      <Text size="sm">
                        {infoSheetProperty.agent_description}
                      </Text>
                    </VStack>
                  </Card>
                </VStack>
              )}
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                <Button
                  label="Kapat"
                  variant="ghost"
                  onClick={() => setInfoSheetProperty(null)}
                />
                <HStack gap={1.5} wrap="wrap">
                  <Button
                    label="A4 Bilgi Fişini Yeni Sekmede Gör"
                    variant="secondary"
                    onClick={() => {
                      if (infoSheetProperty) {
                        handleOpenPrintWindow(infoSheetProperty, false);
                      }
                    }}
                  />
                  <Button
                    label="Yazıcı Çıktısı Al / PDF Kaydet"
                    variant="primary"
                    onClick={() => {
                      if (infoSheetProperty) {
                        handleOpenPrintWindow(infoSheetProperty, true);
                      }
                    }}
                  />
                </HStack>
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>

      {/* 5. Yan Panel (Drawer) Hızlı İlan İnceleme */}
      <Drawer
        isOpen={detailProperty !== null}
        onOpenChange={(open) => {
          if (!open) setDetailProperty(null);
        }}
        label={detailProperty?.title ?? 'Gayrimenkul Detayı'}
        width={480}
      >
        <Layout
          header={
            <DrawerHeader
              title={detailProperty?.title ?? 'Gayrimenkul Detayı'}
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
                  <MetadataList>
                    <MetadataListItem label="Fiyat">
                      <Text weight="semibold">
                        {formatCurrencyTRY(detailProperty.price)}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Oda / Metrekare">
                      <Text>
                        {`${detailProperty.room_count} · Brüt ${detailProperty.gross_sqm} m² / Net ${detailProperty.net_sqm} m²`}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Kat Bilgisi">
                      <Text>
                        {`${detailProperty.floor_number}. Kat / ${detailProperty.building_floors} Katlı`}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Isınma">
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
                    <MetadataListItem label="Mülk Sahibi">
                      <Text>
                        {detailProperty.owner
                          ? `${detailProperty.owner.full_name} (${detailProperty.owner.mobile_phone})`
                          : '-'}
                      </Text>
                    </MetadataListItem>
                  </MetadataList>

                  <Divider />

                  <VStack gap={1}>
                    <Heading level={4}>Emlakçı Özel Tasviri</Heading>
                    <Text size="sm">{detailProperty.agent_description}</Text>
                  </VStack>
                </VStack>
              )}
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                <Button
                  label="Kapat"
                  variant="secondary"
                  onClick={() => setDetailProperty(null)}
                />
                <Button
                  label="Bilgi Fişi / PDF Çıktısı Al"
                  variant="primary"
                  onClick={() => {
                    const target = detailProperty;
                    setDetailProperty(null);
                    setInfoSheetProperty(target);
                  }}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Drawer>
    </PageFrame>
  );
}
