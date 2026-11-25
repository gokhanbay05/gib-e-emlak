import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Divider } from '@astryxdesign/core/Divider';
import { Drawer } from '@astryxdesign/core/Drawer';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Selector } from '@astryxdesign/core/Selector';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { ApiError } from '../api/client';
import { createCustomer, fetchCustomers } from '../api/customers';
import {
  createProperty,
  fetchProperties,
  updatePropertyById,
  updatePropertyStatus,
} from '../api/properties';
import { LocationPicker } from '../components/common/LocationPicker';
import { PropertyImageUploader } from '../components/common/PropertyImageUploader';
import { PageFrame } from '../components/layout/PageFrame';
import type {
  CustomerRecord,
  CustomerType,
  HeatingType,
  ListingType,
  PropertyCounts,
  PropertyRecord,
  PropertyStatus,
  PropertyType,
  RoomCountType,
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
  sanitizeNameInput,
} from '../utils/formatters';
import {
  isValidTcIdentityNo,
  propertySchema,
  quickCustomerSchema,
  zodErrorsToMap,
} from '../utils/validation';

interface PropertiesPageProps {
  currentUser: UserSession;
  onNavigateAuth: () => void;
  onDataChanged?: () => void;
}

const LISTING_TYPE_OPTIONS = [
  { value: 'SATILIK', label: 'Satılık' },
  { value: 'KIRALIK', label: 'Kiralık' },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: 'DAIRE', label: 'Daire' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'ISYERI', label: 'İşyeri' },
  { value: 'ARSA', label: 'Arsa' },
];

const ROOM_COUNT_OPTIONS = [
  { value: '1+0', label: '1+0 (Stüdyo)' },
  { value: '1+1', label: '1+1' },
  { value: '2+1', label: '2+1' },
  { value: '3+1', label: '3+1' },
  { value: '4+1', label: '4+1' },
  { value: '5+1', label: '5+1' },
];

const HEATING_TYPE_OPTIONS = [
  { value: 'DOGALGAZ_KOMBI', label: 'Doğalgaz Kombi' },
  { value: 'MERKEZI', label: 'Merkezi Sistem' },
  { value: 'YERDEN_ISITMA', label: 'Yerden Isıtma' },
  { value: 'KLIMA', label: 'Klima' },
  { value: 'SOBA', label: 'Soba' },
];

const PROPERTY_STATUS_OPTIONS = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'SATILDI', label: 'Satıldı' },
  { value: 'KIRALANDI', label: 'Kiralandı' },
  { value: 'PASIF', label: 'Pasif' },
];

const FILTER_LISTING_OPTIONS = [
  { value: 'ALL', label: 'Tümü (Satılık ve Kiralık)' },
  ...LISTING_TYPE_OPTIONS,
];

const FILTER_PROPERTY_OPTIONS = [
  { value: 'ALL', label: 'Tüm Emlak Türleri' },
  ...PROPERTY_TYPE_OPTIONS,
];

const QUICK_CUSTOMER_TYPE_OPTIONS = [
  { value: 'SATICI', label: 'Satıcı (Mülk Sahibi)' },
  { value: 'KIRALAYAN', label: 'Kiralayan (Mülk Sahibi)' },
  { value: 'ALICI', label: 'Alıcı' },
  { value: 'KIRACI', label: 'Kiracı' },
];

function sanitizeSignedFloor(raw: string): string {
  const trimmed = raw.trim();
  const isNegative = trimmed.startsWith('-');
  const digits = trimmed.replace(/\D/g, '').slice(0, 3);
  if (!digits) return isNegative ? '-' : '';
  return isNegative ? `-${digits}` : digits;
}

function getCustomerDisplayName(c: CustomerRecord): string {
  if (c.full_name && c.full_name.trim()) return c.full_name.trim();
  return `${c.first_name} ${c.last_name}`.trim();
}

/**
 * Portföy (Emlak) Yönetimi — GİB Case Madde 3:
 * - BR-03: Sahipsiz Ev Olmaz (Zorunlu mülk sahibi bağlantısı + sayfa içi Hızlı Müşteri Ekleme modalı)
 * - BR-04: İlan yüklerken mülk sahibinin 11 haneli T.C. Kimlik Numarası doğrulaması
 * - Portföy filtreleme, durum sekmeleri, anlık durum güncelleme ve Drawer detay inceleme
 */
export function PropertiesPage({
  currentUser,
  onNavigateAuth,
  onDataChanged,
}: PropertiesPageProps) {
  const showToast = useToast();
  const agencyId = currentUser.agency?.id;

  // Portföy liste ve filtre durumları
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [counts, setCounts] = useState<PropertyCounts>({
    ALL: 0,
    AKTIF: 0,
    SATILDI: 0,
    KIRALANDI: 0,
    PASIF: 0,
  });
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [filterListingType, setFilterListingType] = useState<string>('ALL');
  const [filterPropertyType, setFilterPropertyType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  // Müşteri listesi (Mülk sahibi seçici için)
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);

  // Detay Drawer durumu
  const [detailProperty, setDetailProperty] = useState<PropertyRecord | null>(
    null,
  );

  // İlan Ekleme / Düzenleme Form durumları
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<number | null>(
    null,
  );
  const [isSavingProperty, setIsSavingProperty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [ownerCustomerId, setOwnerCustomerId] = useState<number | null>(null);
  const [ownerTcIdentityNo, setOwnerTcIdentityNo] = useState('');
  const [title, setTitle] = useState('');
  const [listingType, setListingType] = useState<ListingType>('KIRALIK');
  const [propertyType, setPropertyType] = useState<PropertyType>('DAIRE');
  const [priceInput, setPriceInput] = useState('');
  const [grossSqmInput, setGrossSqmInput] = useState('');
  const [netSqmInput, setNetSqmInput] = useState('');
  const [roomCount, setRoomCount] = useState<RoomCountType>('3+1');
  const [floorNumberInput, setFloorNumberInput] = useState('2');
  const [buildingFloorsInput, setBuildingFloorsInput] = useState('5');
  const [heatingType, setHeatingType] =
    useState<HeatingType>('DOGALGAZ_KOMBI');
  const [city, setCity] = useState(currentUser.agency?.city ?? '');
  const [district, setDistrict] = useState(currentUser.agency?.district ?? '');
  const [neighborhood, setNeighborhood] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [propertyStatus, setPropertyStatus] =
    useState<PropertyStatus>('AKTIF');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Hızlı Müşteri Ekleme Modalı durumları
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>(
    {},
  );
  const [quickFirstName, setQuickFirstName] = useState('');
  const [quickLastName, setQuickLastName] = useState('');
  const [quickMobilePhone, setQuickMobilePhone] = useState('');
  const [quickHomePhone, setQuickHomePhone] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickTcIdentityNo, setQuickTcIdentityNo] = useState('');
  const [quickCustomerType, setQuickCustomerType] =
    useState<CustomerType>('KIRALAYAN');
  const [quickNotes, setQuickNotes] = useState('');

  const clearError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearCustomerError = (key: string) => {
    setCustomerErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const loadPortfolio = useCallback(async () => {
    if (!agencyId) return;
    try {
      const res = await fetchProperties({
        agency_id: agencyId,
        status: statusTab,
        listing_type: filterListingType,
        property_type: filterPropertyType,
        search: searchQuery,
      });
      setProperties(res.properties);
      setCounts(res.counts);
      return res.properties;
    } catch {
      showToast({
        body: 'Portföy kayıtları yüklenirken sunucu bağlantı hatası oluştu.',
        type: 'error',
      });
      return [];
    }
  }, [
    agencyId,
    statusTab,
    filterListingType,
    filterPropertyType,
    searchQuery,
    showToast,
  ]);

  const loadAgencyCustomers = useCallback(
    async (fallbackProps?: PropertyRecord[]) => {
      if (!agencyId) return;
      try {
        const res = await fetchCustomers({ agency_id: agencyId });
        setCustomers(res.customers);
      } catch {
        // P4 birleştirilmeden tekil test edilirse mevcut portföy sahiplerini yedek olarak listele
        if (fallbackProps && fallbackProps.length > 0) {
          const map = new Map<number, CustomerRecord>();
          for (const prop of fallbackProps) {
            if (prop.owner && !map.has(prop.owner.id)) {
              const parts = prop.owner.full_name.trim().split(/\s+/);
              const firstName = parts[0] ?? '';
              const lastName = parts.slice(1).join(' ');
              map.set(prop.owner.id, {
                id: prop.owner.id,
                agency_id: prop.agency_id,
                first_name: firstName,
                last_name: lastName,
                full_name: prop.owner.full_name,
                mobile_phone: prop.owner.mobile_phone,
                home_phone: '',
                email: '',
                tc_identity_no: prop.owner.tc_identity_no,
                is_tc_verified: prop.owner.is_tc_verified,
                customer_type: prop.owner.customer_type as CustomerType,
                source: 'MANUEL',
                notes: '',
                property_count: 1,
                appointment_count: 0,
                search_request_count: 0,
                created_at: prop.created_at,
              });
            }
          }
          setCustomers((prev) =>
            prev.length > 0 ? prev : Array.from(map.values()),
          );
        }
      }
    },
    [agencyId],
  );

  useEffect(() => {
    if (currentUser.role === 'AGENT' && agencyId) {
      void loadPortfolio().then((loaded) => {
        void loadAgencyCustomers(loaded);
      });
    }
  }, [currentUser.role, agencyId, loadPortfolio, loadAgencyCustomers]);

  const selectedOwner = useMemo(
    () => customers.find((c) => c.id === ownerCustomerId) ?? null,
    [customers, ownerCustomerId],
  );

  const customerSelectorOptions = useMemo(
    () =>
      customers.map((c) => {
        const displayName = getCustomerDisplayName(c);
        const typeLabel =
          CUSTOMER_TYPE_LABELS[c.customer_type] ?? c.customer_type;
        const summary = `${displayName} · ${typeLabel} · ${c.mobile_phone}`;
        const normalizedSearch = normalizeTurkish(
          `${displayName} ${typeLabel} ${c.mobile_phone} ${c.tc_identity_no}`,
        );
        return {
          value: String(c.id),
          label: `${summary} ${normalizedSearch}`,
          description: summary,
        };
      }),
    [customers],
  );

  const resetPropertyForm = () => {
    setEditingPropertyId(null);
    setOwnerCustomerId(null);
    setOwnerTcIdentityNo('');
    setTitle('');
    setListingType('KIRALIK');
    setPropertyType('DAIRE');
    setPriceInput('');
    setGrossSqmInput('');
    setNetSqmInput('');
    setRoomCount('3+1');
    setFloorNumberInput('2');
    setBuildingFloorsInput('5');
    setHeatingType('DOGALGAZ_KOMBI');
    setCity(currentUser.agency?.city ?? '');
    setDistrict(currentUser.agency?.district ?? '');
    setNeighborhood('');
    setAddressDetail('');
    setAgentDescription('');
    setPropertyStatus('AKTIF');
    setImageUrl(null);
    setFieldErrors({});
  };

  const handleOpenNewForm = () => {
    resetPropertyForm();
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPropertyId(null);
    setFieldErrors({});
  };

  const handleEditProperty = (prop: PropertyRecord) => {
    setDetailProperty(null);
    setEditingPropertyId(prop.id);
    setOwnerCustomerId(prop.owner_customer_id);
    setOwnerTcIdentityNo(prop.owner?.tc_identity_no ?? '');
    setTitle(prop.title);
    setListingType(prop.listing_type);
    setPropertyType(prop.property_type);
    setPriceInput(String(Math.round(prop.price)));
    setGrossSqmInput(String(prop.gross_sqm));
    setNetSqmInput(String(prop.net_sqm));
    setRoomCount(
      (['1+0', '1+1', '2+1', '3+1', '4+1', '5+1'].includes(prop.room_count)
        ? prop.room_count
        : '3+1') as RoomCountType,
    );
    setFloorNumberInput(String(prop.floor_number));
    setBuildingFloorsInput(String(prop.building_floors));
    setHeatingType(prop.heating_type);
    setCity(prop.city);
    setDistrict(prop.district);
    setNeighborhood(prop.neighborhood);
    setAddressDetail(prop.address_detail);
    setAgentDescription(prop.agent_description);
    setPropertyStatus(prop.status);
    setImageUrl(prop.image_url || null);
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const handleOpenQuickCustomerModal = () => {
    setQuickFirstName('');
    setQuickLastName('');
    setQuickMobilePhone('');
    setQuickHomePhone('');
    setQuickEmail('');
    setQuickTcIdentityNo('');
    setQuickCustomerType(listingType === 'SATILIK' ? 'SATICI' : 'KIRALAYAN');
    setQuickNotes('');
    setCustomerErrors({});
    setIsQuickCustomerOpen(true);
  };

  const handleCreateQuickCustomer = async () => {
    if (!agencyId) return;

    const candidate = {
      first_name: quickFirstName,
      last_name: quickLastName,
      mobile_phone: quickMobilePhone,
      home_phone: quickHomePhone,
      email: quickEmail,
      tc_identity_no: quickTcIdentityNo,
      customer_type: quickCustomerType,
      notes: quickNotes,
    };

    const parsed = quickCustomerSchema.safeParse(candidate);
    if (!parsed.success) {
      const errs = zodErrorsToMap(parsed.error);
      setCustomerErrors(errs);
      showToast({
        body: `Müşteri formunda ${Object.keys(errs).length} alanı kontrol ediniz.`,
        type: 'error',
      });
      return;
    }

    setCustomerErrors({});
    setIsSavingCustomer(true);
    try {
      const res = await createCustomer({
        agency_id: agencyId,
        first_name: quickFirstName.trim(),
        last_name: quickLastName.trim(),
        mobile_phone: quickMobilePhone.trim(),
        home_phone: quickHomePhone.trim() || undefined,
        email: quickEmail.trim() || undefined,
        tc_identity_no: quickTcIdentityNo.trim(),
        customer_type: quickCustomerType,
        notes: quickNotes.trim() || undefined,
      });

      const created = res.customer;
      setCustomers((prev) => [
        created,
        ...prev.filter((c) => c.id !== created.id),
      ]);
      setOwnerCustomerId(created.id);
      setOwnerTcIdentityNo(created.tc_identity_no || quickTcIdentityNo.trim());
      clearError('owner_customer_id');
      clearError('owner_tc_identity_no');
      setIsQuickCustomerOpen(false);
      showToast({
        body: `${getCustomerDisplayName(created)} mülk sahibi olarak eklendi ve ilana bağlandı.`,
        type: 'info',
      });
      onDataChanged?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setCustomerErrors(err.fieldErrors);
        showToast({ body: err.message, type: 'error' });
      } else {
        showToast({
          body: 'Müşteri kaydedilirken sunucuya ulaşılamadı.',
          type: 'error',
        });
      }
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleSaveProperty = async () => {
    if (!agencyId) return;

    const numericPrice = priceInput ? Number(priceInput) : 0;
    const numericGross = grossSqmInput ? Number(grossSqmInput) : 0;
    const numericNet = netSqmInput ? Number(netSqmInput) : 0;
    const numericFloor =
      floorNumberInput && floorNumberInput !== '-'
        ? Number(floorNumberInput)
        : Number.NaN;
    const numericBuildingFloors = buildingFloorsInput
      ? Number(buildingFloorsInput)
      : Number.NaN;

    const candidate = {
      owner_customer_id: ownerCustomerId ?? 0,
      owner_tc_identity_no: ownerTcIdentityNo,
      title,
      listing_type: listingType,
      property_type: propertyType,
      price: numericPrice,
      gross_sqm: numericGross,
      net_sqm: numericNet,
      room_count: roomCount,
      floor_number: Number.isNaN(numericFloor) ? -999 : numericFloor,
      building_floors: Number.isNaN(numericBuildingFloors)
        ? -1
        : numericBuildingFloors,
      heating_type: heatingType,
      city,
      district,
      neighborhood,
      address_detail: addressDetail,
      agent_description: agentDescription,
      status: propertyStatus,
    };

    const parsed = propertySchema.safeParse(candidate);
    if (!parsed.success) {
      const errs = zodErrorsToMap(parsed.error);
      setFieldErrors(errs);
      showToast({
        body: errs.owner_customer_id
          ? errs.owner_customer_id
          : errs.owner_tc_identity_no
            ? errs.owner_tc_identity_no
            : `Formda ${Object.keys(errs).length} alanda eksik veya hatalı bilgi var.`,
        type: 'error',
      });
      return;
    }

    setFieldErrors({});
    setIsSavingProperty(true);
    try {
      const apiPayload = {
        agency_id: agencyId,
        owner_customer_id: parsed.data.owner_customer_id,
        owner_tc_identity_no: parsed.data.owner_tc_identity_no,
        title: parsed.data.title,
        listing_type: parsed.data.listing_type,
        property_type: parsed.data.property_type,
        gross_sqm: parsed.data.gross_sqm,
        net_sqm: parsed.data.net_sqm,
        room_count: parsed.data.room_count,
        floor_number: parsed.data.floor_number,
        building_floors: parsed.data.building_floors,
        heating_type: parsed.data.heating_type,
        price: parsed.data.price,
        city: parsed.data.city,
        district: parsed.data.district,
        neighborhood: parsed.data.neighborhood,
        address_detail: parsed.data.address_detail,
        agent_description: parsed.data.agent_description,
        status: parsed.data.status,
        image_url: imageUrl,
      };

      const res = editingPropertyId
        ? await updatePropertyById(editingPropertyId, apiPayload)
        : await createProperty(apiPayload);

      // Mülk sahibinin doğrulanmış TC bilgisini yerel müşteri listesinde de senkronla
      if (res.property.owner) {
        const updatedOwner = res.property.owner;
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === updatedOwner.id
              ? {
                  ...c,
                  tc_identity_no: updatedOwner.tc_identity_no,
                  is_tc_verified: updatedOwner.is_tc_verified,
                }
              : c,
          ),
        );
      }

      showToast({ body: res.message, type: 'info' });
      handleCloseForm();
      await loadPortfolio();
      onDataChanged?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        showToast({ body: err.message, type: 'error' });
      } else {
        showToast({ body: 'Sunucuya bağlanılamadı.', type: 'error' });
      }
    } finally {
      setIsSavingProperty(false);
    }
  };

  const handleQuickStatusChange = async (
    propertyId: number,
    nextStatus: PropertyStatus,
  ) => {
    setUpdatingStatusId(propertyId);
    try {
      const res = await updatePropertyStatus(propertyId, nextStatus);
      showToast({ body: res.message, type: 'info' });
      await loadPortfolio();
      if (detailProperty?.id === propertyId) {
        setDetailProperty(res.property);
      }
      onDataChanged?.();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'İlan durumu güncellenirken hata oluştu.';
      showToast({ body: msg, type: 'error' });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const propertyColumns: TableColumn<PropertyRecord>[] = [
    {
      key: 'title',
      header: 'Gayrimenkul İlanı',
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
              {`${LISTING_TYPE_LABELS[p.listing_type] ?? p.listing_type} · ${PROPERTY_TYPE_LABELS[p.property_type] ?? p.property_type}`}
            </Text>
          </VStack>
        </HStack>
      ),
    },
    {
      key: 'owner',
      header: 'Mülk Sahibi ve Kimlik',
      renderCell: (p) => (
        <VStack gap={0.5}>
          <Text weight="medium">
            {p.owner ? p.owner.full_name : 'Tanımsız'}
          </Text>
          <Text color="secondary" size="sm">
            {p.is_owner_id_verified && p.owner?.tc_identity_no
              ? `T.C. Doğrulandı (${p.owner.tc_identity_no})`
              : p.is_owner_id_verified
                ? 'T.C. Kimlik Doğrulandı'
                : 'Kimlik Doğrulama Bekliyor'}
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
            {`${p.room_count} · Net ${p.net_sqm} m² (Brüt ${p.gross_sqm} m²)`}
          </Text>
          <Text color="secondary" size="sm">
            {`Kat: ${p.floor_number}/${p.building_floors} · ${HEATING_TYPE_LABELS[p.heating_type] ?? p.heating_type}`}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'city',
      header: 'Konum',
      renderCell: (p) => (
        <VStack gap={0.5}>
          <Text size="sm">{`${p.district} / ${p.city}`}</Text>
          <Text color="secondary" size="sm">
            {p.neighborhood}
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
      key: 'status',
      header: 'Durum',
      renderCell: (p) => (
        <Selector
          label="İlan Durumu"
          isLabelHidden
          size="sm"
          width={132}
          value={p.status}
          isDisabled={updatingStatusId === p.id}
          options={PROPERTY_STATUS_OPTIONS}
          onChange={(val) => {
            if (val && val !== p.status) {
              void handleQuickStatusChange(p.id, val as PropertyStatus);
            }
          }}
        />
      ),
    },
    {
      key: 'id',
      header: 'İşlemler',
      renderCell: (p) => (
        <HStack gap={1}>
          <Button
            label="Detay"
            variant="ghost"
            size="sm"
            onClick={() => setDetailProperty(p)}
          />
          <Button
            label="Düzenle"
            variant="secondary"
            size="sm"
            onClick={() => handleEditProperty(p)}
          />
        </HStack>
      ),
    },
  ];

  if (currentUser.role !== 'AGENT' || !currentUser.agency) {
    return (
      <PageFrame
        title="Portföy Yönetimi"
        subtitle="Gayrimenkul portföyünü yönetmek için yetki belgeli emlak işletmesi girişi gereklidir."
        action={
          <Button
            label="Giriş Ekranına Git"
            variant="primary"
            size="sm"
            onClick={onNavigateAuth}
          />
        }
      >
        <Banner
          status="info"
          title="Emlak işletmesi oturumu gereklidir"
          description="Yeni gayrimenkul ilanı eklemek, mülk sahibi bağlamak ve T.C. Kimlik doğrulaması yapmak için emlakçı hesabıyla giriş yapınız."
          collapsible={false}
        />
      </PageFrame>
    );
  }

  const isTcReady =
    ownerCustomerId !== null && isValidTcIdentityNo(ownerTcIdentityNo);

  return (
    <PageFrame
      title="Portföy Yönetimi"
      subtitle="Gayrimenkul ilanlarını mülk sahibi bağlantısı (BR-03) ve T.C. Kimlik doğrulaması (BR-04) ile yönetin."
      action={
        <Button
          label={
            isFormOpen && editingPropertyId === null
              ? 'Formu Kapat'
              : '+ Yeni Emlak / İlan Ekle'
          }
          variant={
            isFormOpen && editingPropertyId === null ? 'secondary' : 'primary'
          }
          onClick={() => {
            if (isFormOpen && editingPropertyId === null) {
              handleCloseForm();
            } else {
              handleOpenNewForm();
            }
          }}
        />
      }
    >
      <Grid columns={{ minWidth: 180, max: 4 }} gap={3}>
        <Card padding={3}>
          <VStack gap={0.5}>
            <Text color="secondary" size="sm">
              Toplam Portföy
            </Text>
            <Heading level={3}>{counts.ALL}</Heading>
          </VStack>
        </Card>
        <Card padding={3}>
          <VStack gap={0.5}>
            <Text color="secondary" size="sm">
              Aktif İlanlar
            </Text>
            <Heading level={3}>{counts.AKTIF}</Heading>
          </VStack>
        </Card>
        <Card padding={3}>
          <VStack gap={0.5}>
            <Text color="secondary" size="sm">
              Satılan Gayrimenkul
            </Text>
            <Heading level={3}>{counts.SATILDI}</Heading>
          </VStack>
        </Card>
        <Card padding={3}>
          <VStack gap={0.5}>
            <Text color="secondary" size="sm">
              Kiralanan Gayrimenkul
            </Text>
            <Heading level={3}>{counts.KIRALANDI}</Heading>
          </VStack>
        </Card>
      </Grid>

      {isFormOpen && (
        <Card padding={4}>
          <VStack gap={4}>
            <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
              <VStack gap={0.5}>
                <Heading level={3}>
                  {editingPropertyId
                    ? 'Gayrimenkul İlanını Düzenle'
                    : 'Yeni Emlak / İlan Kaydı'}
                </Heading>
                <Text color="secondary" size="sm">
                  Mülk sahibini seçin veya hızlıca oluşturun, kimlik numarasını
                  doğrulayın ve gayrimenkul detaylarını kaydedin.
                </Text>
              </VStack>
              <Button
                label="Vazgeç"
                variant="ghost"
                size="sm"
                onClick={handleCloseForm}
              />
            </HStack>

            <Divider />

            <Card padding={3} variant="muted">
              <VStack gap={3}>
                <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                  <VStack gap={0.5}>
                    <Heading level={4}>
                      Mülk Sahibi ve Kimlik Doğrulaması
                    </Heading>
                    <Text color="secondary" size="sm">
                      Sahipsiz ev kaydedilemez (BR-03). Mülk sahibi listede
                      yoksa yan taraftan sayfayı terk etmeden ekleyebilirsiniz.
                    </Text>
                  </VStack>
                  <Button
                    label="+ Yeni Müşteri Ekle"
                    variant="secondary"
                    size="sm"
                    onClick={handleOpenQuickCustomerModal}
                  />
                </HStack>

                <Grid columns={{ minWidth: 220, max: 2 }} gap={3}>
                  <Selector
                    label="Mülk Sahibi Müşteri *"
                    placeholder="Mülk sahibi müşteriyi seçiniz"
                    hasSearch
                    hasClear
                    searchPlaceholder="Ad soyad, telefon veya T.C. No ile ara..."
                    emptyText="Kayıtlı müşteri bulunamadı. '+ Yeni Müşteri Ekle' butonunu kullanın."
                    emptySearchText="Aramanızla eşleşen müşteri bulunamadı"
                    value={
                      ownerCustomerId !== null ? String(ownerCustomerId) : null
                    }
                    options={customerSelectorOptions}
                    renderOption={(opt) => (
                      <Text>{opt.description ?? opt.value}</Text>
                    )}
                    renderValue={(opt) => (
                      <Text>{opt.description ?? opt.value}</Text>
                    )}
                    onChange={(val) => {
                      clearError('owner_customer_id');
                      clearError('owner_tc_identity_no');
                      if (!val) {
                        setOwnerCustomerId(null);
                        setOwnerTcIdentityNo('');
                        return;
                      }
                      const nextId = Number(val);
                      setOwnerCustomerId(nextId);
                      const found = customers.find((c) => c.id === nextId);
                      setOwnerTcIdentityNo(found?.tc_identity_no ?? '');
                    }}
                    status={
                      fieldErrors.owner_customer_id
                        ? {
                            type: 'error',
                            message: fieldErrors.owner_customer_id,
                          }
                        : undefined
                    }
                    width="100%"
                  />

                  <TextInput
                    inputMode="numeric"
                    label="Mülk Sahibi T.C. Kimlik No *"
                    placeholder="11 haneli T.C. Kimlik Numarası"
                    description={
                      selectedOwner
                        ? selectedOwner.tc_identity_no
                          ? 'Müşteri kartındaki kayıtlı kimlik numarası otomatik getirildi.'
                          : 'Seçilen müşteride T.C. Kimlik No eksik; ilan kaydı için 11 haneli giriniz.'
                        : 'Önce mülk sahibi seçiniz veya yeni müşteri ekleyiniz.'
                    }
                    value={ownerTcIdentityNo}
                    onChange={(val) => {
                      setOwnerTcIdentityNo(formatDigitsOnly(val, 11));
                      clearError('owner_tc_identity_no');
                    }}
                    status={
                      fieldErrors.owner_tc_identity_no
                        ? {
                            type: 'error',
                            message: fieldErrors.owner_tc_identity_no,
                          }
                        : isTcReady
                          ? {
                              type: 'success',
                              message:
                                selectedOwner?.is_tc_verified &&
                                selectedOwner.tc_identity_no ===
                                  ownerTcIdentityNo
                                  ? 'Mülk sahibi T.C. Kimlik Numarası doğrulanmış (BR-04).'
                                  : 'Geçerli 11 haneli T.C. Kimlik No — kayıtla birlikte doğrulanacaktır (BR-04).',
                            }
                          : undefined
                    }
                    width="100%"
                  />
                </Grid>
              </VStack>
            </Card>

            <Grid columns={{ minWidth: 220, max: 2 }} gap={4}>
              <VStack gap={3}>
                <Heading level={4}>Temel ve Teknik Özellikler</Heading>
                <Divider />

                <TextInput
                  label="İlan Başlığı *"
                  placeholder="Örn: Çankaya Ayrancı'da Metroya Yakın Güneş Gören 3+1 Daire"
                  value={title}
                  onChange={(val) => {
                    setTitle(val);
                    clearError('title');
                  }}
                  status={
                    fieldErrors.title
                      ? { type: 'error', message: fieldErrors.title }
                      : undefined
                  }
                  width="100%"
                />

                <Grid columns={{ minWidth: 160, max: 2 }} gap={2}>
                  <Selector
                    label="İşlem Türü *"
                    value={listingType}
                    options={LISTING_TYPE_OPTIONS}
                    onChange={(val) => {
                      if (val) {
                        setListingType(val as ListingType);
                        clearError('listing_type');
                      }
                    }}
                    status={
                      fieldErrors.listing_type
                        ? { type: 'error', message: fieldErrors.listing_type }
                        : undefined
                    }
                    width="100%"
                  />

                  <Selector
                    label="Emlak Türü *"
                    value={propertyType}
                    options={PROPERTY_TYPE_OPTIONS}
                    onChange={(val) => {
                      if (val) {
                        const nextType = val as PropertyType;
                        setPropertyType(nextType);
                        if (nextType === 'ARSA') {
                          setFloorNumberInput('0');
                          setBuildingFloorsInput('0');
                        } else if (buildingFloorsInput === '0') {
                          setFloorNumberInput('1');
                          setBuildingFloorsInput('5');
                        }
                        clearError('property_type');
                      }
                    }}
                    status={
                      fieldErrors.property_type
                        ? { type: 'error', message: fieldErrors.property_type }
                        : undefined
                    }
                    width="100%"
                  />
                </Grid>

                <Grid columns={{ minWidth: 160, max: 2 }} gap={2}>
                  <TextInput
                    inputMode="numeric"
                    label="Fiyat (TL) *"
                    placeholder={
                      listingType === 'KIRALIK' ? 'Örn: 26500' : 'Örn: 7850000'
                    }
                    value={priceInput}
                    onChange={(val) => {
                      setPriceInput(formatDigitsOnly(val, 12));
                      clearError('price');
                    }}
                    status={
                      fieldErrors.price
                        ? { type: 'error', message: fieldErrors.price }
                        : undefined
                    }
                    width="100%"
                  />

                  <Selector
                    label="İlan Durumu *"
                    value={propertyStatus}
                    options={PROPERTY_STATUS_OPTIONS}
                    onChange={(val) => {
                      if (val) {
                        setPropertyStatus(val as PropertyStatus);
                        clearError('status');
                      }
                    }}
                    status={
                      fieldErrors.status
                        ? { type: 'error', message: fieldErrors.status }
                        : undefined
                    }
                    width="100%"
                  />
                </Grid>

                <Grid columns={{ minWidth: 140, max: 3 }} gap={2}>
                  <TextInput
                    inputMode="numeric"
                    label="Brüt m² *"
                    placeholder="Örn: 135"
                    value={grossSqmInput}
                    onChange={(val) => {
                      setGrossSqmInput(formatDigitsOnly(val, 6));
                      clearError('gross_sqm');
                    }}
                    status={
                      fieldErrors.gross_sqm
                        ? { type: 'error', message: fieldErrors.gross_sqm }
                        : undefined
                    }
                    width="100%"
                  />

                  <TextInput
                    inputMode="numeric"
                    label="Net m² *"
                    placeholder="Örn: 120"
                    value={netSqmInput}
                    onChange={(val) => {
                      setNetSqmInput(formatDigitsOnly(val, 6));
                      clearError('net_sqm');
                    }}
                    status={
                      fieldErrors.net_sqm
                        ? { type: 'error', message: fieldErrors.net_sqm }
                        : undefined
                    }
                    width="100%"
                  />

                  <Selector
                    label="Oda Sayısı *"
                    value={roomCount}
                    options={ROOM_COUNT_OPTIONS}
                    onChange={(val) => {
                      if (val) {
                        setRoomCount(val as RoomCountType);
                        clearError('room_count');
                      }
                    }}
                    status={
                      fieldErrors.room_count
                        ? { type: 'error', message: fieldErrors.room_count }
                        : undefined
                    }
                    width="100%"
                  />
                </Grid>

                <Grid columns={{ minWidth: 140, max: 3 }} gap={2}>
                  <TextInput
                    inputMode="numeric"
                    label="Bulunduğu Kat *"
                    placeholder="Örn: 3"
                    value={floorNumberInput}
                    onChange={(val) => {
                      setFloorNumberInput(sanitizeSignedFloor(val));
                      clearError('floor_number');
                    }}
                    status={
                      fieldErrors.floor_number
                        ? { type: 'error', message: fieldErrors.floor_number }
                        : undefined
                    }
                    width="100%"
                  />

                  <TextInput
                    inputMode="numeric"
                    label="Bina Kat Sayısı *"
                    placeholder="Örn: 5"
                    value={buildingFloorsInput}
                    onChange={(val) => {
                      setBuildingFloorsInput(formatDigitsOnly(val, 3));
                      clearError('building_floors');
                    }}
                    status={
                      fieldErrors.building_floors
                        ? {
                            type: 'error',
                            message: fieldErrors.building_floors,
                          }
                        : undefined
                    }
                    width="100%"
                  />

                  <Selector
                    label="Isınma Türü *"
                    value={heatingType}
                    options={HEATING_TYPE_OPTIONS}
                    onChange={(val) => {
                      if (val) {
                        setHeatingType(val as HeatingType);
                        clearError('heating_type');
                      }
                    }}
                    status={
                      fieldErrors.heating_type
                        ? { type: 'error', message: fieldErrors.heating_type }
                        : undefined
                    }
                    width="100%"
                  />
                </Grid>
              </VStack>

              <VStack gap={3}>
                <Heading level={4}>Konum, Görsel ve Emlakçı Tasviri</Heading>
                <Divider />

                <LocationPicker
                  city={city}
                  district={district}
                  neighborhood={neighborhood}
                  onChange={(next) => {
                    setCity(next.city);
                    setDistrict(next.district);
                    setNeighborhood(next.neighborhood);
                    clearError('city');
                    clearError('district');
                    clearError('neighborhood');
                  }}
                  errors={{
                    city: fieldErrors.city,
                    district: fieldErrors.district,
                    neighborhood: fieldErrors.neighborhood,
                  }}
                />

                <TextInput
                  label="Açık Adres *"
                  placeholder="Cadde, sokak, bina ve daire numarası"
                  value={addressDetail}
                  onChange={(val) => {
                    setAddressDetail(val);
                    clearError('address_detail');
                  }}
                  status={
                    fieldErrors.address_detail
                      ? { type: 'error', message: fieldErrors.address_detail }
                      : undefined
                  }
                  width="100%"
                />

                <PropertyImageUploader
                  currentImageUrl={imageUrl}
                  onUploaded={(url) => setImageUrl(url)}
                />

                <TextArea
                  label="Emlakçı Özel Tasviri *"
                  description="Cephe, güneş alma durumu, ulaşım yakınlığı ve öne çıkan detaylar (AI arama ve yazıcı bilgi fişinde kullanılır)."
                  placeholder="Örn: Güney-doğu cepheli, tüm gün güneş gören, geniş cam balkonlu, metro durağına yürüyüş mesafesinde bakımlı aile dairesi..."
                  value={agentDescription}
                  onChange={(val) => {
                    setAgentDescription(val);
                    clearError('agent_description');
                  }}
                  status={
                    fieldErrors.agent_description
                      ? {
                          type: 'error',
                          message: fieldErrors.agent_description,
                        }
                      : undefined
                  }
                />
              </VStack>
            </Grid>

            <Divider />

            <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
              <Text color="secondary" size="sm">
                * işaretli alanlar zorunludur.
              </Text>
              <HStack gap={1.5}>
                <Button
                  label="Vazgeç"
                  variant="secondary"
                  onClick={handleCloseForm}
                />
                <Button
                  label={
                    editingPropertyId
                      ? 'İlan Bilgilerini Güncelle'
                      : 'Kimliği Doğrula ve İlanı Kaydet'
                  }
                  variant="primary"
                  isLoading={isSavingProperty}
                  onClick={() => void handleSaveProperty()}
                />
              </HStack>
            </HStack>
          </VStack>
        </Card>
      )}

      <VStack gap={3}>
        <TabList
          value={statusTab}
          onChange={(val) => setStatusTab(val)}
          hasDivider
        >
          <Tab value="ALL" label={`Tümü (${counts.ALL})`} />
          <Tab value="AKTIF" label={`Aktif (${counts.AKTIF})`} />
          <Tab value="SATILDI" label={`Satıldı (${counts.SATILDI})`} />
          <Tab value="KIRALANDI" label={`Kiralandı (${counts.KIRALANDI})`} />
          <Tab value="PASIF" label={`Pasif (${counts.PASIF})`} />
        </TabList>

        <Grid columns={{ minWidth: 200, max: 3 }} gap={2}>
          <Selector
            label="İşlem Türü Filtresi"
            value={filterListingType}
            options={FILTER_LISTING_OPTIONS}
            onChange={(val) => setFilterListingType(val ?? 'ALL')}
            width="100%"
          />

          <Selector
            label="Emlak Türü Filtresi"
            value={filterPropertyType}
            options={FILTER_PROPERTY_OPTIONS}
            onChange={(val) => setFilterPropertyType(val ?? 'ALL')}
            width="100%"
          />

          <TextInput
            label="Portföy İçinde Ara"
            placeholder="Başlık, mahalle, mülk sahibi veya açıklama..."
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            width="100%"
          />
        </Grid>

        <HStack isScrollable width="100%">
          <Table
            data={properties}
            columns={propertyColumns}
            idKey="id"
            hasHover
            emptyState={
              <EmptyState
                title="Eşleşen gayrimenkul ilanı bulunamadı"
                description="Seçili filtre kriterlerine uygun ilan yok veya henüz portföy kaydı eklenmedi."
                actions={
                  <Button
                    label="+ Yeni Emlak / İlan Ekle"
                    variant="primary"
                    size="sm"
                    onClick={handleOpenNewForm}
                  />
                }
                isCompact
              />
            }
          />
        </HStack>
      </VStack>

      <Dialog
        isOpen={isQuickCustomerOpen}
        onOpenChange={setIsQuickCustomerOpen}
        purpose="form"
        width={540}
        padding={4}
      >
        <VStack gap={3}>
          <DialogHeader
            title="Hızlı Mülk Sahibi Müşteri Ekle"
            subtitle="Yeni müşteriyi oluşturup otomatik olarak ilana mülk sahibi bağlayın."
            onOpenChange={setIsQuickCustomerOpen}
          />

          <Grid columns={{ minWidth: 180, max: 2 }} gap={2}>
            <TextInput
              label="Ad *"
              placeholder="Örn: Mehmet"
              value={quickFirstName}
              onChange={(val) => {
                setQuickFirstName(sanitizeNameInput(val));
                clearCustomerError('first_name');
              }}
              status={
                customerErrors.first_name
                  ? { type: 'error', message: customerErrors.first_name }
                  : undefined
              }
              width="100%"
            />

            <TextInput
              label="Soyad *"
              placeholder="Örn: Özkan"
              value={quickLastName}
              onChange={(val) => {
                setQuickLastName(sanitizeNameInput(val));
                clearCustomerError('last_name');
              }}
              status={
                customerErrors.last_name
                  ? { type: 'error', message: customerErrors.last_name }
                  : undefined
              }
              width="100%"
            />
          </Grid>

          <Grid columns={{ minWidth: 180, max: 2 }} gap={2}>
            <TextInput
              type="tel"
              inputMode="tel"
              label="Cep Telefonu *"
              placeholder="0 (532) 123 45 67"
              value={quickMobilePhone}
              onChange={(val) => {
                setQuickMobilePhone(formatTurkishPhone(val));
                clearCustomerError('mobile_phone');
              }}
              status={
                customerErrors.mobile_phone
                  ? { type: 'error', message: customerErrors.mobile_phone }
                  : undefined
              }
              width="100%"
            />

            <TextInput
              type="tel"
              inputMode="tel"
              label="Ev Telefonu"
              placeholder="0 (312) 426 11 22"
              value={quickHomePhone}
              onChange={(val) => {
                setQuickHomePhone(formatTurkishPhone(val));
                clearCustomerError('home_phone');
              }}
              status={
                customerErrors.home_phone
                  ? { type: 'error', message: customerErrors.home_phone }
                  : undefined
              }
              width="100%"
            />
          </Grid>

          <Grid columns={{ minWidth: 180, max: 2 }} gap={2}>
            <TextInput
              inputMode="numeric"
              label="T.C. Kimlik No *"
              placeholder="11 haneli T.C. Kimlik No"
              value={quickTcIdentityNo}
              onChange={(val) => {
                setQuickTcIdentityNo(formatDigitsOnly(val, 11));
                clearCustomerError('tc_identity_no');
              }}
              status={
                customerErrors.tc_identity_no
                  ? { type: 'error', message: customerErrors.tc_identity_no }
                  : undefined
              }
              width="100%"
            />

            <Selector
              label="Müşteri Tipi *"
              value={quickCustomerType}
              options={QUICK_CUSTOMER_TYPE_OPTIONS}
              onChange={(val) => {
                if (val) {
                  setQuickCustomerType(val as CustomerType);
                  clearCustomerError('customer_type');
                }
              }}
              status={
                customerErrors.customer_type
                  ? { type: 'error', message: customerErrors.customer_type }
                  : undefined
              }
              width="100%"
            />
          </Grid>

          <TextInput
            type="email"
            label="E-Posta Adresi"
            placeholder="ornek@eposta.com"
            value={quickEmail}
            onChange={(val) => {
              setQuickEmail(val);
              clearCustomerError('email');
            }}
            status={
              customerErrors.email
                ? { type: 'error', message: customerErrors.email }
                : undefined
            }
            width="100%"
          />

          <TextArea
            label="Müşteri Notu"
            placeholder="Mülk sahibinin kira/satış beklentileri veya tercih notları..."
            value={quickNotes}
            onChange={(val) => setQuickNotes(val)}
          />

          <Divider />

          <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
            <Text color="secondary" size="sm">
              * işaretli alanlar zorunludur.
            </Text>
            <HStack gap={1.5}>
              <Button
                label="İptal"
                variant="secondary"
                onClick={() => setIsQuickCustomerOpen(false)}
              />
              <Button
                label="Müşteriyi Kaydet ve Bağla"
                variant="primary"
                isLoading={isSavingCustomer}
                onClick={() => void handleCreateQuickCustomer()}
              />
            </HStack>
          </HStack>
        </VStack>
      </Dialog>

      <Drawer
        isOpen={detailProperty !== null}
        onOpenChange={(open) => {
          if (!open) setDetailProperty(null);
        }}
        label={detailProperty?.title ?? 'Gayrimenkul Detayı'}
        side="end"
        width={480}
        padding={4}
      >
        {detailProperty && (
          <VStack gap={4}>
            <HStack gap={3} vAlign="center" wrap="wrap">
              <Avatar
                src={detailProperty.image_url || undefined}
                name={detailProperty.title}
                size="xl"
                shape="rounded"
                tooltip={false}
              />
              <VStack gap={0.5}>
                <Text color="secondary" size="sm">
                  {`${LISTING_TYPE_LABELS[detailProperty.listing_type] ?? detailProperty.listing_type} · ${PROPERTY_TYPE_LABELS[detailProperty.property_type] ?? detailProperty.property_type} · Durum: ${PROPERTY_STATUS_LABELS[detailProperty.status] ?? detailProperty.status}`}
                </Text>
                <Heading level={3}>{detailProperty.title}</Heading>
                <Heading level={4}>
                  {formatCurrencyTRY(detailProperty.price)}
                </Heading>
              </VStack>
            </HStack>

            <Divider />

            <Card padding={3} variant="muted">
              <VStack gap={1.5}>
                <Heading level={4}>Mülk Sahibi ve Kimlik Kontrolü</Heading>
                <Text weight="semibold">
                  {detailProperty.owner
                    ? `${detailProperty.owner.full_name} (${CUSTOMER_TYPE_LABELS[detailProperty.owner.customer_type] ?? detailProperty.owner.customer_type})`
                    : '-'}
                </Text>
                <Text size="sm">
                  {`Cep Telefonu: ${detailProperty.owner?.mobile_phone ?? '-'}`}
                </Text>
                <Text color="secondary" size="sm">
                  {detailProperty.is_owner_id_verified
                    ? `BR-04 T.C. Kimlik Doğrulandı · T.C. No: ${detailProperty.owner?.tc_identity_no || '-'}`
                    : 'T.C. Kimlik Doğrulaması Bekleniyor'}
                </Text>
              </VStack>
            </Card>

            <VStack gap={2}>
              <Heading level={4}>Teknik Özellikler</Heading>
              <Divider />
              <Grid columns={{ minWidth: 160, max: 2 }} gap={2}>
                <VStack gap={0.5}>
                  <Text color="secondary" size="sm">
                    Brüt / Net Alan
                  </Text>
                  <Text weight="medium">
                    {`${detailProperty.gross_sqm} m² / ${detailProperty.net_sqm} m²`}
                  </Text>
                </VStack>
                <VStack gap={0.5}>
                  <Text color="secondary" size="sm">
                    Oda Sayısı
                  </Text>
                  <Text weight="medium">{detailProperty.room_count}</Text>
                </VStack>
                <VStack gap={0.5}>
                  <Text color="secondary" size="sm">
                    Bulunduğu Kat / Bina Katı
                  </Text>
                  <Text weight="medium">
                    {`${detailProperty.floor_number} / ${detailProperty.building_floors}`}
                  </Text>
                </VStack>
                <VStack gap={0.5}>
                  <Text color="secondary" size="sm">
                    Isınma Türü
                  </Text>
                  <Text weight="medium">
                    {HEATING_TYPE_LABELS[detailProperty.heating_type] ??
                      detailProperty.heating_type}
                  </Text>
                </VStack>
              </Grid>
            </VStack>

            <VStack gap={1.5}>
              <Heading level={4}>Konum ve Açık Adres</Heading>
              <Divider />
              <Text weight="medium">
                {`${detailProperty.neighborhood}, ${detailProperty.district} / ${detailProperty.city}`}
              </Text>
              <Text color="secondary" size="sm">
                {detailProperty.address_detail}
              </Text>
            </VStack>

            <VStack gap={1.5}>
              <Heading level={4}>Emlakçı Özel Tasviri</Heading>
              <Divider />
              <Text size="sm">{detailProperty.agent_description}</Text>
            </VStack>

            <Divider />

            <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
              <Button
                label="Kapat"
                variant="secondary"
                onClick={() => setDetailProperty(null)}
              />
              <Button
                label="İlanı Düzenle"
                variant="primary"
                onClick={() => handleEditProperty(detailProperty)}
              />
            </HStack>
          </VStack>
        )}
      </Drawer>
    </PageFrame>
  );
}
