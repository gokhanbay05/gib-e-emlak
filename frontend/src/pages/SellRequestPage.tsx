import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import {
  MetadataList,
  MetadataListItem,
} from '@astryxdesign/core/MetadataList';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import {
  createAgencySellRequest,
  fetchAgencies,
  fetchAgencySellRequests,
} from '../api/agencies';
import { ApiError } from '../api/client';
import { LocationPicker } from '../components/common/LocationPicker';
import { PageFrame } from '../components/layout/PageFrame';
import type {
  AgencyRecord,
  AgencySellRequestSummary,
  ListingType,
  NavDestination,
  PropertyType,
  UserSession,
} from '../types';
import {
  extractDigits,
  formatCurrencyTRY,
  formatDateTimeTR,
  formatDigitsOnly,
  formatTurkishPhone,
  LISTING_TYPE_LABELS,
  normalizeTurkish,
  PROPERTY_TYPE_LABELS,
  sanitizeNameInput,
} from '../utils/formatters';
import { isValidTcIdentityNo } from '../utils/validation';

interface SellRequestPageProps {
  currentUser: UserSession;
  onNavigate: (dest: NavDestination) => void;
  onNavigateAuth: () => void;
  onDataChanged?: () => void;
  onViewAgencyListings?: (agencyId: number) => void;
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

const EMAIL_CHECK_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

/**
 * Evimi Sat / Kiraya Ver — Yetki Belgeli Emlakçı Seçimi (P7):
 * - T.C. Ticaret Bakanlığı TTBS yetki belgeli emlak işletmelerini il ve anahtar kelimeye göre listeler
 * - Seçilen emlak ofisine doğrudan satış / kiralama yetki başvurusu oluşturur
 * - Gönderilen başvuruları referans numarasıyla ekranda görüntüler
 */
export function SellRequestPage({
  currentUser,
  onNavigate,
  onNavigateAuth,
  onDataChanged,
  onViewAgencyListings,
}: SellRequestPageProps) {
  const showToast = useToast();

  const [agencies, setAgencies] = useState<AgencyRecord[]>([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(false);
  const [filterCity, setFilterCity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Başvuru modalı ve seçilen emlak ofisi
  const [selectedAgency, setSelectedAgency] = useState<AgencyRecord | null>(
    null,
  );
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [email, setEmail] = useState('');
  const [tcIdentityNo, setTcIdentityNo] = useState('');
  const [listingType, setListingType] = useState<ListingType>('SATILIK');
  const [propertyType, setPropertyType] = useState<PropertyType>('DAIRE');
  const [roomCount, setRoomCount] = useState('3+1');
  const [grossSqm, setGrossSqm] = useState<number>(120);
  const [expectedPrice, setExpectedPrice] = useState<number>(5500000);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [propertyNotes, setPropertyNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sonuç ve gönderilen başvurular listesi
  const [lastSubmitted, setLastSubmitted] =
    useState<AgencySellRequestSummary | null>(null);
  const [inspectedAgencyId, setInspectedAgencyId] = useState<string>('');
  const [agencyRequests, setAgencyRequests] = useState<
    AgencySellRequestSummary[]
  >([]);

  const clearError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const loadAgencies = useCallback(async () => {
    setIsLoadingAgencies(true);
    try {
      const res = await fetchAgencies();
      setAgencies(res.agencies);
      setInspectedAgencyId((prev) => {
        if (prev) return prev;
        return res.agencies.length > 0 ? String(res.agencies[0].id) : '';
      });
    } catch {
      showToast({
        body: 'Emlak işletmeleri yüklenirken bağlantı hatası oluştu.',
        type: 'error',
      });
    } finally {
      setIsLoadingAgencies(false);
    }
  }, [showToast]);

  const loadSellRequestsForAgency = useCallback(async (agencyIdNum: number) => {
    try {
      const res = await fetchAgencySellRequests(agencyIdNum);
      setAgencyRequests(res.sell_requests);
    } catch {
      // ignore offline
    }
  }, []);

  useEffect(() => {
    void loadAgencies();
  }, [loadAgencies]);

  useEffect(() => {
    if (inspectedAgencyId) {
      void loadSellRequestsForAgency(Number(inspectedAgencyId));
    }
  }, [inspectedAgencyId, loadSellRequestsForAgency]);

  const cityFilterOptions = useMemo(() => {
    const uniqueCities = Array.from(
      new Set(agencies.map((a) => a.city.trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, 'tr-TR'));
    return [
      { value: 'ALL', label: 'Tüm İller' },
      ...uniqueCities.map((c) => ({ value: c, label: c })),
    ];
  }, [agencies]);

  const agencySelectOptions = useMemo(
    () =>
      agencies.map((a) => ({
        value: String(a.id),
        label: `${a.name} (TTBS: ${a.ttbs_document_no})`,
      })),
    [agencies],
  );

  const filteredAgencies = useMemo(() => {
    const q = normalizeTurkish(searchQuery.trim());
    return agencies.filter((a) => {
      if (
        filterCity !== 'ALL' &&
        normalizeTurkish(a.city) !== normalizeTurkish(filterCity)
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = normalizeTurkish(
        `${a.name} ${a.authorized_person} ${a.city} ${a.district} ${a.neighborhood} ${a.ttbs_document_no} ${a.description}`,
      );
      return haystack.includes(q);
    });
  }, [agencies, filterCity, searchQuery]);

  const handleOpenRequestModal = (agency: AgencyRecord) => {
    setSelectedAgency(agency);
    setFieldErrors({});
    if (currentUser.role !== 'VISITOR') {
      const { firstName, lastName } = splitFullName(currentUser.full_name);
      setOwnerFirstName(firstName);
      setOwnerLastName(lastName);
      setMobilePhone(
        currentUser.phone ? formatTurkishPhone(currentUser.phone) : '',
      );
      setEmail(currentUser.email || '');
    } else {
      setOwnerFirstName('');
      setOwnerLastName('');
      setMobilePhone('');
      setEmail('');
    }
    setTcIdentityNo('');
    setListingType('SATILIK');
    setPropertyType('DAIRE');
    setRoomCount('3+1');
    setGrossSqm(120);
    setExpectedPrice(5500000);
    setCity(agency.city || '');
    setDistrict(agency.district || '');
    setNeighborhood(agency.neighborhood || '');
    setAddressDetail('');
    setPropertyNotes('');
  };

  const handleCloseModal = () => {
    setSelectedAgency(null);
    setFieldErrors({});
  };

  const validateSellRequestForm = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (ownerFirstName.trim().length < 2 || /\d/.test(ownerFirstName.trim())) {
      errs.owner_first_name =
        'Ad alanı en az 2 karakter olmalı ve rakam içermemelidir.';
    }
    if (ownerLastName.trim().length < 2 || /\d/.test(ownerLastName.trim())) {
      errs.owner_last_name =
        'Soyad alanı en az 2 karakter olmalı ve rakam içermemelidir.';
    }
    const digits = extractDigits(mobilePhone);
    if (digits.length !== 11 || !digits.startsWith('05')) {
      errs.mobile_phone =
        'Geçerli bir cep telefonu giriniz (Örn: 0 (532) 123 45 67).';
    }
    if (email.trim() && !EMAIL_CHECK_RE.test(email.trim())) {
      errs.email = 'Lütfen geçerli bir e-posta adresi giriniz.';
    }
    if (tcIdentityNo.trim() && !isValidTcIdentityNo(tcIdentityNo.trim())) {
      errs.tc_identity_no =
        'Geçerli bir 11 haneli T.C. Kimlik Numarası giriniz (0 ile başlayamaz ve çift rakamla bitmelidir).';
    }
    if (!grossSqm || grossSqm <= 0) {
      errs.gross_sqm = "Brüt m² 0'dan büyük olmalıdır.";
    }
    if (!expectedPrice || expectedPrice <= 0) {
      errs.expected_price = "Beklenen fiyat 0 TL'den büyük olmalıdır.";
    }
    if (!city.trim()) {
      errs.city = 'Lütfen il seçiniz.';
    }
    if (!district.trim()) {
      errs.district = 'Lütfen ilçe seçiniz.';
    }
    if (!neighborhood.trim()) {
      errs.neighborhood = 'Lütfen mahalle seçiniz.';
    }
    return errs;
  };

  const handleSubmitSellRequest = async () => {
    if (!selectedAgency) return;

    const errs = validateSellRequestForm();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      showToast({
        body: `Formda ${Object.keys(errs).length} alanda eksik veya hatalı bilgi var.`,
        type: 'error',
      });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const res = await createAgencySellRequest(selectedAgency.id, {
        owner_first_name: ownerFirstName.trim(),
        owner_last_name: ownerLastName.trim(),
        mobile_phone: mobilePhone.trim(),
        email: email.trim() || undefined,
        tc_identity_no: tcIdentityNo.trim() || undefined,
        listing_type: listingType,
        property_type: propertyType,
        room_count: roomCount,
        gross_sqm: grossSqm,
        expected_price: expectedPrice,
        city: city.trim(),
        district: district.trim(),
        neighborhood: neighborhood.trim(),
        address_detail: addressDetail.trim() || undefined,
        property_notes: propertyNotes.trim() || undefined,
      });

      setLastSubmitted(res.sell_request);
      setInspectedAgencyId(String(selectedAgency.id));
      showToast({ body: res.message, type: 'info' });
      handleCloseModal();
      await Promise.all([
        loadAgencies(),
        loadSellRequestsForAgency(selectedAgency.id),
      ]);
      onDataChanged?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        showToast({ body: err.message, type: 'error' });
      } else {
        showToast({ body: 'Sunucuya bağlanılamadı.', type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestColumns: TableColumn<AgencySellRequestSummary>[] = [
    {
      key: 'reference_no',
      header: 'Başvuru No',
      renderCell: (r) => <Token label={r.reference_no} />,
    },
    {
      key: 'owner_full_name',
      header: 'Mülk Sahibi',
      renderCell: (r) => (
        <VStack gap={0}>
          <Text weight="semibold">{r.owner_full_name}</Text>
          <Text color="secondary" size="sm">
            {r.mobile_phone}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'listing_type',
      header: 'Gayrimenkul Talebi',
      renderCell: (r) => (
        <VStack gap={0}>
          <Text weight="medium">
            {`${LISTING_TYPE_LABELS[r.listing_type] ?? r.listing_type} · ${PROPERTY_TYPE_LABELS[r.property_type] ?? r.property_type}`}
          </Text>
          <Text color="secondary" size="sm">
            {r.gross_sqm > 0
              ? `${r.room_count} · ${r.gross_sqm} m²`
              : 'Kayıtlı Mülk Sahibi'}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'city',
      header: 'Konum',
      renderCell: (r) => (
        <Text size="sm">
          {r.city
            ? `${r.neighborhood ? `${r.neighborhood}, ` : ''}${r.district} / ${r.city}`
            : '-'}
        </Text>
      ),
    },
    {
      key: 'expected_price',
      header: 'Beklenen Fiyat',
      renderCell: (r) => (
        <Text weight="semibold">
          {r.expected_price > 0 ? formatCurrencyTRY(r.expected_price) : '-'}
        </Text>
      ),
    },
    {
      key: 'created_at',
      header: 'Başvuru Tarihi',
      renderCell: (r) => (
        <Text color="secondary" size="sm">
          {formatDateTimeTR(r.created_at)}
        </Text>
      ),
    },
  ];

  return (
    <PageFrame
      title="Evimi Sat / Kiraya Ver — Yetki Belgeli Emlakçı Seçimi"
      subtitle="Gayrimenkulünüzü satmak veya kiraya vermek için T.C. Ticaret Bakanlığı TTBS yetki belgeli emlak işletmelerini inceleyin ve doğrudan yetki başvurusu oluşturun."
      action={
        <>
          <Button
            label="İlan Vitrinine Dön"
            variant="secondary"
            onClick={() => onNavigate('marketplace')}
          />
          {currentUser.role === 'VISITOR' && (
            <Button
              label="Müşteri Girişi Yap"
              variant="primary"
              onClick={onNavigateAuth}
            />
          )}
        </>
      }
    >
      {lastSubmitted && (
        <Banner
          status="success"
          title={`Başvurunuz İletildi · Referans No: ${lastSubmitted.reference_no}`}
          description={`${lastSubmitted.agency_name} işletmesine ${LISTING_TYPE_LABELS[lastSubmitted.listing_type] ?? lastSubmitted.listing_type} ${PROPERTY_TYPE_LABELS[lastSubmitted.property_type] ?? lastSubmitted.property_type} (${lastSubmitted.room_count}, ${lastSubmitted.gross_sqm} m², ${formatCurrencyTRY(lastSubmitted.expected_price)}) başvurunuz başarıyla kaydedildi.`}
          isDismissable
          onDismiss={() => setLastSubmitted(null)}
          collapsible={false}
        />
      )}

      {/* Emlak Ofisi Filtreleme Çubuğu */}
      <Card padding={4}>
        <Grid columns={{ minWidth: 220, max: 2 }} gap={3}>
          <Selector
            label="İl Filtresi"
            value={filterCity}
            options={cityFilterOptions}
            onChange={(val) => setFilterCity(val ?? 'ALL')}
            width="100%"
          />
          <TextInput
            label="Emlak İşletmesi Ara"
            placeholder="İşletme adı, yetkili kişi, ilçe veya TTBS belge no..."
            value={searchQuery}
            onChange={setSearchQuery}
            width="100%"
          />
        </Grid>
      </Card>

      {/* Yetki Belgeli Emlak İşletmeleri Listesi */}
      <VStack gap={3}>
        <HStack gap={1.5} vAlign="center">
          <Heading level={3}>Yetki Belgeli Emlak İşletmeleri</Heading>
          <Badge label={filteredAgencies.length} />
        </HStack>

        {filteredAgencies.length === 0 ? (
          <EmptyState
            title={
              isLoadingAgencies
                ? 'Yetki belgeli emlak işletmeleri yükleniyor...'
                : 'Arama kriterine uygun emlak işletmesi bulunamadı'
            }
            description="İl filtresini veya arama kelimesini temizleyerek tüm TTBS yetki belgeli emlak ofislerini görebilirsiniz."
            actions={
              <Button
                label="Filtreleri Temizle"
                variant="secondary"
                onClick={() => {
                  setFilterCity('ALL');
                  setSearchQuery('');
                }}
              />
            }
          />
        ) : (
          <Grid columns={{ minWidth: 280, max: 3 }} gap={3}>
            {filteredAgencies.map((agency) => (
              <Card key={agency.id} padding={4}>
                <VStack gap={3}>
                  <HStack gap={2} vAlign="center">
                    <Avatar
                      name={agency.name}
                      src={agency.logo_url || undefined}
                      size="lg"
                      shape="rounded"
                    />
                    <VStack gap={0.5}>
                      <Heading level={4}>{agency.name}</Heading>
                      <Token
                        label={`TTBS Belge No: ${agency.ttbs_document_no} (Doğrulandı)`}
                      />
                    </VStack>
                  </HStack>

                  <MetadataList>
                    <MetadataListItem label="Yetkili Kişi">
                      <Text weight="medium">{agency.authorized_person}</Text>
                    </MetadataListItem>
                    <MetadataListItem label="Konum">
                      <Text>
                        {agency.city
                          ? `${agency.district} / ${agency.city}`
                          : '-'}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Açık Adres">
                      <Text size="sm">{agency.address}</Text>
                    </MetadataListItem>
                    <MetadataListItem label="Sabit & Cep Tel">
                      <Text size="sm">
                        {`${agency.phone}${agency.mobile_phone ? ` · ${agency.mobile_phone}` : ''}`}
                      </Text>
                    </MetadataListItem>
                  </MetadataList>

                  <HStack gap={2} wrap="wrap">
                    <Text size="sm" weight="semibold">
                      {`Aktif İlan: ${agency.stats.active_property_count}`}
                    </Text>
                    <Text size="sm" color="secondary">
                      {`Toplam Portföy: ${agency.stats.property_count}`}
                    </Text>
                    <Text size="sm" color="secondary">
                      {`Kayıtlı Müşteri: ${agency.stats.customer_count}`}
                    </Text>
                  </HStack>

                  <Text color="secondary" size="sm" maxLines={3}>
                    {agency.description ||
                      'T.C. Ticaret Bakanlığı Taşınmaz Ticareti Yetki Belgeli profesyonel emlak danışmanlık işletmesi.'}
                  </Text>

                  <Divider />

                  <VStack gap={1.5}>
                    <Button
                      label="Bu Emlak Ofisine Satış / Kiralama Başvurusu Yap"
                      variant="primary"
                      onClick={() => handleOpenRequestModal(agency)}
                    />
                    <Button
                      label="Ofisin Aktif İlanlarını Gör"
                      variant="secondary"
                      onClick={() => {
                        if (onViewAgencyListings) {
                          onViewAgencyListings(agency.id);
                        } else {
                          onNavigate('marketplace');
                        }
                      }}
                    />
                  </VStack>
                </VStack>
              </Card>
            ))}
          </Grid>
        )}
      </VStack>

      {/* İletilen Satış / Kiralama Başvuruları */}
      {agencies.length > 0 && (
        <VStack gap={3}>
          <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
            <HStack gap={1.5} vAlign="center">
              <Heading level={3}>
                İletilen Satış / Kiralama Başvuruları
              </Heading>
              <Badge label={agencyRequests.length} />
            </HStack>
            <Selector
              label="Emlak İşletmesi Seçimi"
              isLabelHidden
              width={320}
              value={inspectedAgencyId || String(agencies[0].id)}
              options={agencySelectOptions}
              onChange={(val) => {
                if (val) setInspectedAgencyId(val);
              }}
            />
          </HStack>

          <HStack isScrollable width="100%">
            <Table
              data={agencyRequests}
              columns={requestColumns}
              idKey="reference_no"
              hasHover
              emptyState={
                <EmptyState
                  title="Bu emlak işletmesine ait satış/kiralama başvurusu bulunmuyor"
                  description="Yukarıdaki yetki belgeli emlak ofislerinden birini seçerek ilk satış/kiralama başvurunuzu oluşturabilirsiniz."
                  isCompact
                />
              }
            />
          </HStack>
        </VStack>
      )}

      {/* Satış / Kiralama Başvurusu Dialog Formu */}
      <Dialog
        isOpen={selectedAgency !== null}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
        width={680}
        purpose="form"
      >
        <Layout
          header={
            <DialogHeader
              title="Gayrimenkul Satış / Kiralama Yetki Başvurusu"
              subtitle={
                selectedAgency
                  ? `${selectedAgency.name} · TTBS Belge No: ${selectedAgency.ttbs_document_no}`
                  : undefined
              }
              onOpenChange={(open) => {
                if (!open) handleCloseModal();
              }}
            />
          }
          content={
            <LayoutContent>
              {selectedAgency && (
                <VStack gap={3}>
                  <Card padding={3} variant="muted">
                    <HStack gap={2} vAlign="center" wrap="wrap">
                      <Avatar
                        name={selectedAgency.name}
                        src={selectedAgency.logo_url || undefined}
                        size="md"
                        shape="rounded"
                      />
                      <VStack gap={0}>
                        <Text weight="semibold">{selectedAgency.name}</Text>
                        <Text color="secondary" size="sm">
                          {`Yetkili: ${selectedAgency.authorized_person} · TTBS Belge No: ${selectedAgency.ttbs_document_no} · Tel: ${selectedAgency.phone}`}
                        </Text>
                      </VStack>
                    </HStack>
                  </Card>

                  <Grid columns={{ minWidth: 200, max: 2 }} gap={2}>
                    <TextInput
                      label="Ad *"
                      placeholder="Örn: Ayşe"
                      value={ownerFirstName}
                      onChange={(val) => {
                        setOwnerFirstName(sanitizeNameInput(val));
                        clearError('owner_first_name');
                      }}
                      status={
                        fieldErrors.owner_first_name
                          ? { type: 'error', message: fieldErrors.owner_first_name }
                          : undefined
                      }
                      width="100%"
                    />
                    <TextInput
                      label="Soyad *"
                      placeholder="Örn: Demir"
                      value={ownerLastName}
                      onChange={(val) => {
                        setOwnerLastName(sanitizeNameInput(val));
                        clearError('owner_last_name');
                      }}
                      status={
                        fieldErrors.owner_last_name
                          ? { type: 'error', message: fieldErrors.owner_last_name }
                          : undefined
                      }
                      width="100%"
                    />
                  </Grid>

                  <Grid columns={{ minWidth: 180, max: 3 }} gap={2}>
                    <TextInput
                      label="Cep Telefonu *"
                      placeholder="0 (532) 123 45 67"
                      value={mobilePhone}
                      onChange={(val) => {
                        setMobilePhone(formatTurkishPhone(val));
                        clearError('mobile_phone');
                      }}
                      status={
                        fieldErrors.mobile_phone
                          ? { type: 'error', message: fieldErrors.mobile_phone }
                          : undefined
                      }
                      width="100%"
                    />
                    <TextInput
                      label="E-posta"
                      placeholder="ornek@eposta.com"
                      value={email}
                      onChange={(val) => {
                        setEmail(val);
                        clearError('email');
                      }}
                      status={
                        fieldErrors.email
                          ? { type: 'error', message: fieldErrors.email }
                          : undefined
                      }
                      width="100%"
                    />
                    <TextInput
                      inputMode="numeric"
                      label="T.C. Kimlik No (11 Hane)"
                      placeholder="Opsiyonel (11 hane)"
                      value={tcIdentityNo}
                      onChange={(val) => {
                        setTcIdentityNo(formatDigitsOnly(val, 11));
                        clearError('tc_identity_no');
                      }}
                      status={
                        fieldErrors.tc_identity_no
                          ? { type: 'error', message: fieldErrors.tc_identity_no }
                          : undefined
                      }
                      width="100%"
                    />
                  </Grid>

                  <Divider />

                  <Grid columns={{ minWidth: 160, max: 3 }} gap={2}>
                    <Selector
                      label="İşlem Türü *"
                      value={listingType}
                      options={LISTING_TYPE_OPTIONS}
                      onChange={(val) => {
                        if (val) setListingType(val as ListingType);
                      }}
                      width="100%"
                    />
                    <Selector
                      label="Emlak Türü *"
                      value={propertyType}
                      options={PROPERTY_TYPE_OPTIONS}
                      onChange={(val) => {
                        if (val) setPropertyType(val as PropertyType);
                      }}
                      width="100%"
                    />
                    <Selector
                      label="Oda Sayısı"
                      value={roomCount}
                      options={ROOM_COUNT_OPTIONS}
                      onChange={(val) => {
                        if (val) setRoomCount(val);
                      }}
                      width="100%"
                    />
                  </Grid>

                  <Grid columns={{ minWidth: 200, max: 2 }} gap={2}>
                    <NumberInput
                      label="Brüt m² *"
                      min={1}
                      max={100000}
                      step={5}
                      value={grossSqm}
                      onChange={(val) => {
                        setGrossSqm(val);
                        clearError('gross_sqm');
                      }}
                      status={
                        fieldErrors.gross_sqm
                          ? { type: 'error', message: fieldErrors.gross_sqm }
                          : undefined
                      }
                      width="100%"
                    />
                    <NumberInput
                      label="Beklenen Fiyat (TL) *"
                      min={1000}
                      step={50000}
                      value={expectedPrice}
                      onChange={(val) => {
                        setExpectedPrice(val);
                        clearError('expected_price');
                      }}
                      status={
                        fieldErrors.expected_price
                          ? { type: 'error', message: fieldErrors.expected_price }
                          : undefined
                      }
                      width="100%"
                    />
                  </Grid>

                  <LocationPicker
                    city={city}
                    district={district}
                    neighborhood={neighborhood}
                    requiredMark
                    errors={{
                      city: fieldErrors.city,
                      district: fieldErrors.district,
                      neighborhood: fieldErrors.neighborhood,
                    }}
                    onChange={(next) => {
                      setCity(next.city);
                      setDistrict(next.district);
                      setNeighborhood(next.neighborhood);
                      clearError('city');
                      clearError('district');
                      clearError('neighborhood');
                    }}
                  />

                  <TextInput
                    label="Açık Adres Detayı"
                    placeholder="Cadde, sokak, site veya bina numarası..."
                    value={addressDetail}
                    onChange={setAddressDetail}
                    width="100%"
                  />

                  <TextArea
                    label="Gayrimenkul Özellikleri & Emlakçıya Not"
                    placeholder="Cephe, kat bilgisi, ısınma sistemi, otopark, tapu durumu veya görüşme için uygun saatlerinizi yazabilirsiniz..."
                    rows={3}
                    value={propertyNotes}
                    onChange={setPropertyNotes}
                    width="100%"
                  />

                  <Text color="secondary" size="sm">
                    * işaretli alanlar zorunludur.
                  </Text>
                </VStack>
              )}
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                <Button
                  label="Vazgeç"
                  variant="ghost"
                  onClick={handleCloseModal}
                />
                <Button
                  label="Satış / Kiralama Başvurusunu Gönder"
                  variant="primary"
                  isLoading={isSubmitting}
                  onClick={() => void handleSubmitSellRequest()}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </PageFrame>
  );
}
