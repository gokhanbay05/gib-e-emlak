import { useCallback, useEffect, useState } from 'react';
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
import { List, ListItem } from '@astryxdesign/core/List';
import {
  MetadataList,
  MetadataListItem,
} from '@astryxdesign/core/MetadataList';
import { Selector } from '@astryxdesign/core/Selector';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { ApiError } from '../api/client';
import {
  createCustomer,
  fetchCustomerDetail,
  fetchCustomers,
  updateCustomer,
} from '../api/customers';
import { PageFrame } from '../components/layout/PageFrame';
import type {
  CustomerCategoryCounts,
  CustomerDetailRecord,
  CustomerRecord,
  CustomerType,
  UserSession,
} from '../types';
import {
  formatAppointmentPurposeLabel,
  formatAppointmentStatusLabel,
  formatAppointmentTypeLabel,
  formatCurrencyTRY,
  formatCustomerSourceLabel,
  formatCustomerTypeLabel,
  formatDateTimeTR,
  formatDateTR,
  formatDigitsOnly,
  formatHeatingTypeLabel,
  formatListingTypeLabel,
  formatPropertyStatusLabel,
  formatPropertyTypeLabel,
  formatTurkishPhone,
  sanitizeNameInput,
} from '../utils/formatters';
import { customerSchema, zodErrorsToMap } from '../utils/validation';

interface CustomersPageProps {
  currentUser: UserSession;
  onNavigateAuth: () => void;
  onDataChanged?: () => void;
}

const EMPTY_COUNTS: CustomerCategoryCounts = {
  ALL: 0,
  ALICI: 0,
  SATICI: 0,
  KIRALAYAN: 0,
  KIRACI: 0,
};

const CUSTOMER_TYPE_OPTIONS = [
  { value: 'ALICI', label: 'Alıcı' },
  { value: 'SATICI', label: 'Satıcı' },
  { value: 'KIRALAYAN', label: 'Kiralık Mülk Sahibi' },
  { value: 'KIRACI', label: 'Kiracı' },
];

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'En Yeni Kayıt' },
  { value: 'name_asc', label: 'İsim A–Z' },
  { value: 'name_desc', label: 'İsim Z–A' },
  { value: 'property_desc', label: 'Gayrimenkul Sayısı' },
];

function parseSortOption(option: string): { sort_by: string; sort_dir: string } {
  switch (option) {
    case 'name_asc':
      return { sort_by: 'name', sort_dir: 'asc' };
    case 'name_desc':
      return { sort_by: 'name', sort_dir: 'desc' };
    case 'property_desc':
      return { sort_by: 'property_count', sort_dir: 'desc' };
    case 'created_desc':
    default:
      return { sort_by: 'created_at', sort_dir: 'desc' };
  }
}

/**
 * Müşteri Yönetimi (GİB Madde 2):
 * Alıcı, Satıcı, Kiralık Mülk Sahibi ve Kiracı müşteri kayıtları,
 * kategori/arama/sıralama tablosu ve sağdan açılan (Drawer) gayrimenkul & randevu detay paneli.
 */
export function CustomersPage({
  currentUser,
  onNavigateAuth,
  onDataChanged,
}: CustomersPageProps) {
  const showToast = useToast();

  // Liste, kategori ve sıralama durumları
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [counts, setCounts] = useState<CustomerCategoryCounts>(EMPTY_COUNTS);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('created_desc');
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Yan panel (Drawer) müşteri detay durumları
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerSummary, setDrawerSummary] = useState<CustomerRecord | null>(
    null,
  );
  const [drawerDetail, setDrawerDetail] =
    useState<CustomerDetailRecord | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Yeni müşteri ekleme / düzenleme Dialog durumları
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<CustomerRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form alanları
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('ALICI');
  const [mobilePhone, setMobilePhone] = useState('');
  const [homePhone, setHomePhone] = useState('');
  const [email, setEmail] = useState('');
  const [tcIdentityNo, setTcIdentityNo] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const agencyId =
    currentUser.role === 'AGENT' && currentUser.agency
      ? currentUser.agency.id
      : null;

  const clearError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const loadCustomers = useCallback(async () => {
    if (!agencyId) return;
    const { sort_by, sort_dir } = parseSortOption(sortOption);
    setIsLoadingList(true);
    try {
      const res = await fetchCustomers({
        agency_id: agencyId,
        customer_type: activeTab === 'ALL' ? undefined : activeTab,
        search: searchQuery,
        sort_by,
        sort_dir,
      });
      setCustomers(res.customers);
      setCounts(res.counts);
    } catch {
      showToast({
        body: 'Müşteri listesi yüklenirken sunucu bağlantı hatası oluştu.',
        type: 'error',
      });
    } finally {
      setIsLoadingList(false);
    }
  }, [agencyId, activeTab, searchQuery, sortOption, showToast]);

  useEffect(() => {
    if (!agencyId) return;
    const timer = window.setTimeout(() => {
      void loadCustomers();
    }, 150);
    return () => {
      window.clearTimeout(timer);
    };
  }, [agencyId, loadCustomers]);

  const loadCustomerDetailById = async (customerId: number) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetchCustomerDetail(customerId);
      setDrawerDetail(res.customer);
      setDrawerSummary(res.customer);
    } catch {
      showToast({
        body: 'Müşteri detay bilgileri alınamadı.',
        type: 'error',
      });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleOpenDrawer = (customer: CustomerRecord) => {
    setDrawerSummary(customer);
    if (!drawerDetail || drawerDetail.id !== customer.id) {
      setDrawerDetail(null);
    }
    setIsDrawerOpen(true);
    void loadCustomerDetailById(customer.id);
  };

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFirstName('');
    setLastName('');
    setCustomerType(
      activeTab !== 'ALL' ? (activeTab as CustomerType) : 'KIRALAYAN',
    );
    setMobilePhone('');
    setHomePhone('');
    setEmail('');
    setTcIdentityNo('');
    setNotes('');
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (customer: CustomerRecord) => {
    setEditingCustomer(customer);
    setFirstName(customer.first_name);
    setLastName(customer.last_name);
    setCustomerType(customer.customer_type);
    setMobilePhone(formatTurkishPhone(customer.mobile_phone));
    setHomePhone(
      customer.home_phone ? formatTurkishPhone(customer.home_phone) : '',
    );
    setEmail(customer.email);
    setTcIdentityNo(customer.tc_identity_no);
    setNotes(customer.notes);
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const handleSubmitForm = async () => {
    if (!agencyId) return;

    const rawValues = {
      first_name: firstName,
      last_name: lastName,
      mobile_phone: mobilePhone,
      home_phone: homePhone,
      email,
      tc_identity_no: tcIdentityNo,
      customer_type: customerType,
      notes,
    };

    const parsed = customerSchema.safeParse(rawValues);
    if (!parsed.success) {
      const errs = zodErrorsToMap(parsed.error);
      setFieldErrors(errs);
      showToast({
        body: `Formda ${Object.keys(errs).length} alanda eksik veya hatalı bilgi bulunuyor.`,
        type: 'error',
      });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        const res = await updateCustomer(editingCustomer.id, rawValues);
        showToast({ body: res.message, type: 'info' });
        if (drawerSummary && drawerSummary.id === res.customer.id) {
          setDrawerSummary(res.customer);
          void loadCustomerDetailById(res.customer.id);
        }
      } else {
        const res = await createCustomer({
          agency_id: agencyId,
          ...rawValues,
        });
        showToast({ body: res.message, type: 'info' });
      }
      setIsFormOpen(false);
      await loadCustomers();
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

  if (currentUser.role !== 'AGENT' || !currentUser.agency) {
    return (
      <PageFrame
        title="Müşteri Yönetimi"
        subtitle="Alıcı, satıcı, kiralık mülk sahibi ve kiracı müşteri kayıtlarını yönetin."
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
          title="Müşteri yönetimi ekranı için emlak işletmesi girişi gereklidir"
          description="İşletmenize ait müşterileri görüntülemek, filtrelemek ve yeni müşteri kaydı oluşturmak için emlakçı hesabıyla giriş yapınız."
          collapsible={false}
        />
      </PageFrame>
    );
  }

  const customerColumns: TableColumn<CustomerRecord>[] = [
    {
      key: 'full_name',
      header: 'Ad Soyad',
      renderCell: (c) => (
        <HStack gap={1.5} vAlign="center">
          <Avatar name={c.full_name} size="sm" />
          <VStack gap={0}>
            <Text weight="semibold">{c.full_name}</Text>
            <Text color="secondary" size="sm">
              {c.email || formatCustomerSourceLabel(c.source)}
            </Text>
          </VStack>
        </HStack>
      ),
    },
    {
      key: 'customer_type',
      header: 'Müşteri Kategorisi',
      renderCell: (c) => (
        <VStack gap={0}>
          <Text weight="medium">{formatCustomerTypeLabel(c.customer_type)}</Text>
          <Text color="secondary" size="sm">
            {formatCustomerSourceLabel(c.source)}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'mobile_phone',
      header: 'Cep ve Ev Telefonu',
      renderCell: (c) => (
        <VStack gap={0}>
          <Text>{formatTurkishPhone(c.mobile_phone)}</Text>
          <Text color="secondary" size="sm">
            {c.home_phone
              ? `Ev: ${formatTurkishPhone(c.home_phone)}`
              : 'Ev tel belirtilmedi'}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'is_tc_verified',
      header: 'T.C. Kimlik Durumu',
      renderCell: (c) => (
        <VStack gap={0}>
          <Text weight="medium">
            {c.is_tc_verified && c.tc_identity_no ? 'Doğrulandı' : 'Eksik'}
          </Text>
          {c.tc_identity_no ? (
            <Text color="secondary" size="sm">
              {c.tc_identity_no}
            </Text>
          ) : (
            <Text color="secondary" size="sm">
              Henüz girilmedi
            </Text>
          )}
        </VStack>
      ),
    },
    {
      key: 'property_count',
      header: 'Kayıtlı Mülk',
      renderCell: (c) => <Text>{`${c.property_count} gayrimenkul`}</Text>,
    },
    {
      key: 'actions',
      header: 'İşlemler',
      renderCell: (c) => (
        <HStack gap={1.5} wrap="wrap">
          <Button
            label="Detaylar / Gayrimenkuller"
            variant="secondary"
            size="sm"
            onClick={() => handleOpenDrawer(c)}
          />
          <Button
            label="Düzenle"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(c)}
          />
        </HStack>
      ),
    },
  ];

  const activeCustomer = drawerDetail ?? drawerSummary;

  return (
    <PageFrame
      title="Müşteri Yönetimi"
      subtitle={`${currentUser.agency.name} müşteri portföyü, kategori filtreleme ve bağlı gayrimenkul kayıtları.`}
      action={
        <Button
          label="+ Yeni Müşteri Kaydı"
          variant="primary"
          onClick={handleOpenCreate}
        />
      }
    >
      <Grid columns={{ minWidth: 180, max: 4 }} gap={3}>
        <Card padding={3}>
          <VStack gap={0.5}>
            <Text color="secondary" size="sm">
              Toplam Müşteri
            </Text>
            <Heading level={3}>{counts.ALL}</Heading>
          </VStack>
        </Card>
        <Card padding={3}>
          <VStack gap={0.5}>
            <Text color="secondary" size="sm">
              Kiralık Mülk Sahibi
            </Text>
            <Heading level={3}>{counts.KIRALAYAN}</Heading>
          </VStack>
        </Card>
        <Card padding={3}>
          <VStack gap={0.5}>
            <Text color="secondary" size="sm">
              Satıcı Müşteri
            </Text>
            <Heading level={3}>{counts.SATICI}</Heading>
          </VStack>
        </Card>
        <Card padding={3}>
          <VStack gap={0.5}>
            <Text color="secondary" size="sm">
              Alıcı ve Kiracı Adayı
            </Text>
            <Heading level={3}>{counts.ALICI + counts.KIRACI}</Heading>
          </VStack>
        </Card>
      </Grid>

      <VStack gap={3}>
        <TabList value={activeTab} onChange={setActiveTab} hasDivider>
          <Tab value="ALL" label={`Tümü (${counts.ALL})`} />
          <Tab value="ALICI" label={`Alıcı (${counts.ALICI})`} />
          <Tab value="SATICI" label={`Satıcı (${counts.SATICI})`} />
          <Tab
            value="KIRALAYAN"
            label={`Kiralık Mülk Sahibi (${counts.KIRALAYAN})`}
          />
          <Tab value="KIRACI" label={`Kiracı (${counts.KIRACI})`} />
        </TabList>

        <Grid columns={{ minWidth: 220, max: 2 }} gap={3}>
          <TextInput
            label="Müşteri Ara"
            placeholder="Ad soyad, cep/ev telefonu, e-posta veya T.C. Kimlik No..."
            value={searchQuery}
            onChange={setSearchQuery}
            width="100%"
          />
          <Selector
            label="Sıralama"
            value={sortOption}
            options={SORT_OPTIONS}
            onChange={(val) => {
              if (val) setSortOption(val);
            }}
            width="100%"
          />
        </Grid>

        {customers.length === 0 && !isLoadingList ? (
          <EmptyState
            title="Eşleşen müşteri kaydı bulunamadı"
            description="Seçili kategori veya arama kriterlerine uygun müşteri bulunmuyor. Filtreyi temizleyebilir veya yeni müşteri kaydı ekleyebilirsiniz."
            actions={
              <HStack gap={2}>
                {(activeTab !== 'ALL' || searchQuery.trim() !== '') && (
                  <Button
                    label="Filtreleri Temizle"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setActiveTab('ALL');
                      setSearchQuery('');
                    }}
                  />
                )}
                <Button
                  label="+ Yeni Müşteri Kaydı"
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreate}
                />
              </HStack>
            }
          />
        ) : (
          <HStack isScrollable width="100%">
            <Table
              data={customers}
              columns={customerColumns}
              idKey="id"
              hasHover
            />
          </HStack>
        )}
      </VStack>

      {/* Sağdan Açılan Yan Panel (Drawer) — Müşteri Detay, Gayrimenkuller ve Randevular */}
      <Drawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        label={
          activeCustomer
            ? `${activeCustomer.full_name} Müşteri Detayı`
            : 'Müşteri Detayı'
        }
        width={540}
      >
        <Layout
          header={
            <DrawerHeader
              title={activeCustomer ? activeCustomer.full_name : 'Müşteri Detayı'}
              subtitle={
                activeCustomer
                  ? `${formatCustomerTypeLabel(activeCustomer.customer_type)} · ${formatCustomerSourceLabel(activeCustomer.source)}`
                  : undefined
              }
              onOpenChange={setIsDrawerOpen}
              hasDivider
            />
          }
          content={
            <LayoutContent>
              {activeCustomer && (
                <VStack gap={5}>
                  <VStack gap={3}>
                    <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                      <Heading level={4}>İletişim ve Kimlik Bilgileri</Heading>
                      <Button
                        label="Bilgileri Düzenle"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setIsDrawerOpen(false);
                          handleOpenEdit(activeCustomer);
                        }}
                      />
                    </HStack>

                    <MetadataList>
                      <MetadataListItem label="Ad Soyad">
                        <Text weight="medium">{activeCustomer.full_name}</Text>
                      </MetadataListItem>
                      <MetadataListItem label="Müşteri Tipi">
                        <Text>
                          {formatCustomerTypeLabel(activeCustomer.customer_type)}
                        </Text>
                      </MetadataListItem>
                      <MetadataListItem label="Kayıt Kaynağı">
                        <Text>
                          {formatCustomerSourceLabel(activeCustomer.source)}
                        </Text>
                      </MetadataListItem>
                      <MetadataListItem label="Cep Telefonu">
                        <Text>
                          {formatTurkishPhone(activeCustomer.mobile_phone)}
                        </Text>
                      </MetadataListItem>
                      <MetadataListItem label="Ev Telefonu">
                        <Text>
                          {activeCustomer.home_phone
                            ? formatTurkishPhone(activeCustomer.home_phone)
                            : 'Belirtilmedi'}
                        </Text>
                      </MetadataListItem>
                      <MetadataListItem label="E-posta Adresi">
                        <Text>{activeCustomer.email || 'Belirtilmedi'}</Text>
                      </MetadataListItem>
                      <MetadataListItem label="T.C. Kimlik No">
                        <Text>
                          {activeCustomer.tc_identity_no
                            ? `${activeCustomer.tc_identity_no} (${activeCustomer.is_tc_verified ? 'Doğrulandı' : 'Doğrulanmadı'})`
                            : 'Eksik (Henüz girilmedi)'}
                        </Text>
                      </MetadataListItem>
                      <MetadataListItem label="Kayıt Tarihi">
                        <Text>{formatDateTR(activeCustomer.created_at)}</Text>
                      </MetadataListItem>
                      <MetadataListItem label="Müşteri Notu">
                        <Text>
                          {activeCustomer.notes || 'Açıklama veya not girilmemiş.'}
                        </Text>
                      </MetadataListItem>
                    </MetadataList>
                  </VStack>

                  <Divider />

                  <VStack gap={2}>
                    <HStack justify="between" vAlign="center">
                      <Heading level={4}>Üzerine Kayıtlı Gayrimenkuller</Heading>
                      <Badge
                        label={
                          drawerDetail
                            ? drawerDetail.owned_properties.length
                            : activeCustomer.property_count
                        }
                      />
                    </HStack>

                    {isLoadingDetail && !drawerDetail ? (
                      <Text color="secondary" size="sm">
                        Gayrimenkul bilgileri yükleniyor...
                      </Text>
                    ) : drawerDetail &&
                      drawerDetail.owned_properties.length > 0 ? (
                      <List hasDividers edge="flush">
                        {drawerDetail.owned_properties.map((prop) => (
                          <ListItem
                            key={prop.id}
                            itemKey={prop.id}
                            align="start"
                            label={<Text weight="semibold">{prop.title}</Text>}
                            description={
                              <VStack gap={0.5}>
                                <Text color="secondary" size="sm">
                                  {`${formatListingTypeLabel(prop.listing_type)} · ${formatPropertyTypeLabel(prop.property_type)} · ${prop.room_count} · Brüt ${prop.gross_sqm} m² (Net ${prop.net_sqm} m²)`}
                                </Text>
                                <Text color="secondary" size="sm">
                                  {`Kat ${prop.floor_number}/${prop.building_floors} · ${formatHeatingTypeLabel(prop.heating_type)} · ${prop.district} / ${prop.city}`}
                                </Text>
                                <Text size="sm">
                                  {`Durum: ${formatPropertyStatusLabel(prop.status)}`}
                                </Text>
                              </VStack>
                            }
                            endContent={
                              <Text weight="semibold">
                                {formatCurrencyTRY(prop.price)}
                              </Text>
                            }
                          />
                        ))}
                      </List>
                    ) : (
                      <Text color="secondary" size="sm">
                        Bu müşterinin üzerine kayıtlı gayrimenkul bulunmamaktadır.
                      </Text>
                    )}
                  </VStack>

                  <Divider />

                  <VStack gap={2}>
                    <HStack justify="between" vAlign="center">
                      <Heading level={4}>Emlak Arama Talepleri</Heading>
                      <Badge
                        label={
                          drawerDetail
                            ? drawerDetail.search_requests.length
                            : activeCustomer.search_request_count
                        }
                      />
                    </HStack>

                    {isLoadingDetail && !drawerDetail ? (
                      <Text color="secondary" size="sm">
                        Arama talepleri yükleniyor...
                      </Text>
                    ) : drawerDetail &&
                      drawerDetail.search_requests.length > 0 ? (
                      <List hasDividers edge="flush">
                        {drawerDetail.search_requests.map((req) => {
                          const metaParts = [
                            req.district && req.city
                              ? `${req.district} / ${req.city}`
                              : req.city || '',
                            req.min_sqm || req.max_sqm
                              ? `${req.min_sqm ?? '-'}–${req.max_sqm ?? '-'} m²`
                              : '',
                            req.min_price !== null || req.max_price !== null
                              ? `${req.min_price !== null ? formatCurrencyTRY(req.min_price) : '-'} – ${req.max_price !== null ? formatCurrencyTRY(req.max_price) : '-'}`
                              : '',
                          ].filter(Boolean);

                          return (
                            <ListItem
                              key={req.id}
                              itemKey={req.id}
                              align="start"
                              label={
                                <Text weight="semibold">
                                  {[
                                    formatListingTypeLabel(req.listing_type),
                                    req.property_type
                                      ? formatPropertyTypeLabel(req.property_type)
                                      : '',
                                    req.room_count || '',
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </Text>
                              }
                              description={
                                <VStack gap={0.5}>
                                  {metaParts.length > 0 && (
                                    <Text color="secondary" size="sm">
                                      {metaParts.join(' · ')}
                                    </Text>
                                  )}
                                  {req.natural_language_prompt && (
                                    <Text size="sm">
                                      {`Talep Özeti: ${req.natural_language_prompt}`}
                                    </Text>
                                  )}
                                </VStack>
                              }
                            />
                          );
                        })}
                      </List>
                    ) : (
                      <Text color="secondary" size="sm">
                        Bu müşteriye ait kayıtlı arama talebi bulunmamaktadır.
                      </Text>
                    )}
                  </VStack>

                  <Divider />

                  <VStack gap={2}>
                    <HStack justify="between" vAlign="center">
                      <Heading level={4}>Randevu Geçmişi ve Notlar</Heading>
                      <Badge
                        label={
                          drawerDetail
                            ? drawerDetail.appointments.length
                            : activeCustomer.appointment_count
                        }
                      />
                    </HStack>

                    {isLoadingDetail && !drawerDetail ? (
                      <Text color="secondary" size="sm">
                        Randevu geçmişi yükleniyor...
                      </Text>
                    ) : drawerDetail && drawerDetail.appointments.length > 0 ? (
                      <List hasDividers edge="flush">
                        {drawerDetail.appointments.map((appt) => (
                          <ListItem
                            key={appt.id}
                            itemKey={appt.id}
                            align="start"
                            label={
                              <Text weight="semibold">
                                {`${formatDateTimeTR(appt.start_time)} · ${formatAppointmentTypeLabel(appt.appointment_type)}`}
                              </Text>
                            }
                            description={
                              <VStack gap={0.5}>
                                <Text color="secondary" size="sm">
                                  {`${formatAppointmentPurposeLabel(appt.purpose)} · Durum: ${formatAppointmentStatusLabel(appt.status)}`}
                                </Text>
                                {appt.property_title && (
                                  <Text color="secondary" size="sm">
                                    {`İlgili Gayrimenkul: ${appt.property_title}`}
                                  </Text>
                                )}
                                {appt.meeting_notes && (
                                  <Text size="sm">
                                    {`Görüşme Notu: ${appt.meeting_notes}`}
                                  </Text>
                                )}
                              </VStack>
                            }
                          />
                        ))}
                      </List>
                    ) : (
                      <Text color="secondary" size="sm">
                        Bu müşteriye ait randevu kaydı bulunmamaktadır.
                      </Text>
                    )}
                  </VStack>
                </VStack>
              )}
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={2} hAlign="end">
                <Button
                  label="Kapat"
                  variant="secondary"
                  onClick={() => setIsDrawerOpen(false)}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Drawer>

      {/* Manuel Müşteri Kayıt / Düzenleme Modalı */}
      <Dialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        purpose="form"
        width={560}
      >
        <Layout
          header={
            <DialogHeader
              title={
                editingCustomer
                  ? 'Müşteri Bilgilerini Düzenle'
                  : 'Yeni Müşteri Kaydı'
              }
              subtitle="Müşteri iletişim, T.C. Kimlik ve kategori bilgilerini eksiksiz tanımlayın."
              onOpenChange={setIsFormOpen}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                <Grid columns={{ minWidth: 180, max: 2 }} gap={2}>
                  <TextInput
                    label="Adı *"
                    placeholder="Örn: Mehmet"
                    value={firstName}
                    onChange={(val) => {
                      setFirstName(sanitizeNameInput(val));
                      clearError('first_name');
                    }}
                    status={
                      fieldErrors.first_name
                        ? { type: 'error', message: fieldErrors.first_name }
                        : undefined
                    }
                    width="100%"
                  />
                  <TextInput
                    label="Soyadı *"
                    placeholder="Örn: Özkan"
                    value={lastName}
                    onChange={(val) => {
                      setLastName(sanitizeNameInput(val));
                      clearError('last_name');
                    }}
                    status={
                      fieldErrors.last_name
                        ? { type: 'error', message: fieldErrors.last_name }
                        : undefined
                    }
                    width="100%"
                  />
                </Grid>

                <Selector
                  label="Müşteri Tipi *"
                  placeholder="Müşteri kategorisi seçiniz"
                  value={customerType}
                  options={CUSTOMER_TYPE_OPTIONS}
                  onChange={(val) => {
                    if (val) {
                      setCustomerType(val as CustomerType);
                      clearError('customer_type');
                    }
                  }}
                  status={
                    fieldErrors.customer_type
                      ? { type: 'error', message: fieldErrors.customer_type }
                      : undefined
                  }
                  width="100%"
                />

                <Grid columns={{ minWidth: 180, max: 2 }} gap={2}>
                  <TextInput
                    type="tel"
                    inputMode="tel"
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
                    type="tel"
                    inputMode="tel"
                    label="Ev Telefonu"
                    placeholder="0 (312) 426 11 22"
                    value={homePhone}
                    onChange={(val) => {
                      setHomePhone(formatTurkishPhone(val));
                      clearError('home_phone');
                    }}
                    status={
                      fieldErrors.home_phone
                        ? { type: 'error', message: fieldErrors.home_phone }
                        : undefined
                    }
                    width="100%"
                  />
                </Grid>

                <Grid columns={{ minWidth: 180, max: 2 }} gap={2}>
                  <TextInput
                    type="email"
                    inputMode="email"
                    label="E-posta Adresi"
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
                    label="T.C. Kimlik No"
                    placeholder="11 haneli T.C. Kimlik No"
                    value={tcIdentityNo}
                    onChange={(val) => {
                      setTcIdentityNo(formatDigitsOnly(val, 11));
                      clearError('tc_identity_no');
                    }}
                    status={
                      fieldErrors.tc_identity_no
                        ? {
                            type: 'error',
                            message: fieldErrors.tc_identity_no,
                          }
                        : undefined
                    }
                    width="100%"
                  />
                </Grid>

                <TextArea
                  label="Açıklama / Müşteri Notu"
                  placeholder="Müşterinin gayrimenkul kriterleri, bütçe beklentisi veya iletişim notları..."
                  value={notes}
                  onChange={setNotes}
                />

                <Text color="secondary" size="sm">
                  * işaretli alanlar zorunludur.
                </Text>
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={2} hAlign="end">
                <Button
                  label="Vazgeç"
                  variant="secondary"
                  onClick={() => setIsFormOpen(false)}
                />
                <Button
                  label={
                    editingCustomer
                      ? 'Değişiklikleri Kaydet'
                      : 'Müşteriyi Kaydet'
                  }
                  variant="primary"
                  isLoading={isSubmitting}
                  onClick={() => void handleSubmitForm()}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </PageFrame>
  );
}
