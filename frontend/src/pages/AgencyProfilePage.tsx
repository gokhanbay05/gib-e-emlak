import { useEffect, useState } from 'react';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { fetchAgencies, fetchAgencyById, updateAgencyById } from '../api/agencies';
import { ApiError } from '../api/client';
import { LocationPicker } from '../components/common/LocationPicker';
import { LogoUploader } from '../components/common/LogoUploader';
import { PageFrame } from '../components/layout/PageFrame';
import type { AgencyRecord, SessionAgency, UserSession } from '../types';
import {
  formatDigitsOnly,
  formatTurkishPhone,
  sanitizeNameInput,
} from '../utils/formatters';
import { agencyProfileSchema, zodErrorsToMap } from '../utils/validation';

interface AgencyProfilePageProps {
  currentUser: UserSession;
  onAgencyUpdated: (agency: SessionAgency) => void;
  onNavigateAuth: () => void;
}

/**
 * İşyeri Tanımı (GİB Madde 1):
 * Emlak işletmesinin kurumsal bilgilerini düzenler ve PDF bilgi fişi antetini önizler.
 */
export function AgencyProfilePage({
  currentUser,
  onAgencyUpdated,
  onNavigateAuth,
}: AgencyProfilePageProps) {
  const showToast = useToast();

  const [allAgencies, setAllAgencies] = useState<AgencyRecord[]>([]);
  const [agency, setAgency] = useState<AgencyRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form alanları
  const [name, setName] = useState('');
  const [authorizedPerson, setAuthorizedPerson] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [fax, setFax] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const applyAgencyToForm = (rec: AgencyRecord) => {
    setAgency(rec);
    setName(rec.name);
    setAuthorizedPerson(rec.authorized_person);
    setCity(rec.city);
    setDistrict(rec.district);
    setNeighborhood(rec.neighborhood);
    setAddress(rec.address);
    setPhone(formatTurkishPhone(rec.phone));
    setMobilePhone(rec.mobile_phone ? formatTurkishPhone(rec.mobile_phone) : '');
    setFax(rec.fax ? formatTurkishPhone(rec.fax) : '');
    setTaxOffice(rec.tax_office);
    setTaxNumber(rec.tax_number);
    setDescription(rec.description);
    setLogoUrl(rec.logo_url);
    setFieldErrors({});
  };

  const loadData = async () => {
    try {
      const listRes = await fetchAgencies();
      setAllAgencies(listRes.agencies);

      if (currentUser.role === 'AGENT' && currentUser.agency) {
        const detailRes = await fetchAgencyById(currentUser.agency.id);
        applyAgencyToForm(detailRes.agency);
      }
    } catch {
      showToast({
        body: 'İşyeri bilgileri yüklenirken bağlantı hatası oluştu.',
        type: 'error',
      });
    }
  };

  useEffect(() => {
    void loadData();
  }, [currentUser.agency?.id, currentUser.role]);

  const handleSave = async () => {
    if (!agency) return;

    const payload = {
      name,
      authorized_person: authorizedPerson,
      city,
      district,
      neighborhood,
      address,
      phone,
      mobile_phone: mobilePhone,
      fax,
      tax_office: taxOffice,
      tax_number: taxNumber,
      logo_url: logoUrl,
      description,
    };

    const parsed = agencyProfileSchema.safeParse(payload);
    if (!parsed.success) {
      const errs = zodErrorsToMap(parsed.error);
      setFieldErrors(errs);
      showToast({
        body: `Formda ${Object.keys(errs).length} alanda eksik veya hatalı bilgi var.`,
        type: 'error',
      });
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    try {
      const res = await updateAgencyById(agency.id, payload);
      applyAgencyToForm(res.agency);
      onAgencyUpdated({
        id: res.agency.id,
        name: res.agency.name,
        authorized_person: res.agency.authorized_person,
        phone: res.agency.phone,
        mobile_phone: res.agency.mobile_phone,
        fax: res.agency.fax,
        city: res.agency.city,
        district: res.agency.district,
        neighborhood: res.agency.neighborhood,
        address: res.agency.address,
        ttbs_document_no: res.agency.ttbs_document_no,
        is_ttbs_verified: res.agency.is_ttbs_verified,
        logo_url: res.agency.logo_url,
      });
      showToast({ body: res.message, type: 'info' });
      const listRes = await fetchAgencies();
      setAllAgencies(listRes.agencies);
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        showToast({ body: err.message, type: 'error' });
      } else {
        showToast({ body: 'Sunucuya bağlanılamadı.', type: 'error' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const agencyColumns: TableColumn<AgencyRecord>[] = [
    {
      key: 'name',
      header: 'Emlak İşletmesi',
      renderCell: (a) => (
        <HStack gap={1.5} vAlign="center">
          <Avatar
            name={a.name}
            src={a.logo_url || undefined}
            size="sm"
            shape="rounded"
          />
          <VStack gap={0}>
            <Text weight="semibold">{a.name}</Text>
            <Text color="secondary" size="sm">
              {a.authorized_person}
            </Text>
          </VStack>
        </HStack>
      ),
    },
    {
      key: 'city',
      header: 'Konum',
      renderCell: (a) => (
        <Text>{a.city ? `${a.district} / ${a.city}` : '-'}</Text>
      ),
    },
    {
      key: 'phone',
      header: 'İletişim',
      renderCell: (a) => <Text>{a.phone}</Text>,
    },
    {
      key: 'stats',
      header: 'Aktif İlan',
      renderCell: (a) => <Text>{`${a.stats.active_property_count} ilan`}</Text>,
    },
  ];

  if (currentUser.role !== 'AGENT' || !currentUser.agency) {
    return (
      <PageFrame
        title="İşyeri Tanımı"
        subtitle="Kayıtlı emlak işletmelerini görüntüleyebilirsiniz."
        action={
          <Button
            label="Emlakçı Girişi Yap"
            variant="primary"
            size="sm"
            onClick={onNavigateAuth}
          />
        }
      >
        <Banner
          status="info"
          title="İşyeri bilgilerini düzenlemek için emlakçı hesabı gereklidir"
          description="Hesap ekranından emlakçı oturumuna geçebilirsiniz."
          collapsible={false}
        />
        <HStack isScrollable width="100%">
          <Table data={allAgencies} columns={agencyColumns} idKey="id" hasHover />
        </HStack>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title="İşyeri Tanımı"
      subtitle="Emlak işletmenizin resmi bilgilerini ve yazıcı çıktısı antetini yönetin."
      action={
        <Button
          label="Değişiklikleri Kaydet"
          variant="primary"
          isLoading={isSaving}
          onClick={() => void handleSave()}
        />
      }
    >
      {agency && (
        <Grid columns={{ minWidth: 180, max: 3 }} gap={3}>
          <Card padding={3}>
            <VStack gap={0.5}>
              <Text color="secondary" size="sm">
                Aktif Portföy
              </Text>
              <Heading level={3}>{agency.stats.active_property_count}</Heading>
            </VStack>
          </Card>
          <Card padding={3}>
            <VStack gap={0.5}>
              <Text color="secondary" size="sm">
                Kayıtlı Müşteri
              </Text>
              <Heading level={3}>{agency.stats.customer_count}</Heading>
            </VStack>
          </Card>
          <Card padding={3}>
            <VStack gap={0.5}>
              <Text color="secondary" size="sm">
                Randevular
              </Text>
              <Heading level={3}>{agency.stats.appointment_count}</Heading>
            </VStack>
          </Card>
        </Grid>
      )}

      <Grid columns={{ minWidth: 280, max: 2 }} gap={5}>
        <VStack gap={3}>
          <Heading level={3}>İşletme Bilgileri</Heading>
          <Divider />

          <TextInput
            label="İşletme Adı *"
            value={name}
            onChange={(val) => {
              setName(val);
              clearError('name');
            }}
            status={
              fieldErrors.name
                ? { type: 'error', message: fieldErrors.name }
                : undefined
            }
            width="100%"
          />

          <TextInput
            label="Yetkili Kişi *"
            value={authorizedPerson}
            onChange={(val) => {
              setAuthorizedPerson(sanitizeNameInput(val));
              clearError('authorized_person');
            }}
            status={
              fieldErrors.authorized_person
                ? { type: 'error', message: fieldErrors.authorized_person }
                : undefined
            }
            width="100%"
          />

          <Grid columns={{ minWidth: 160, max: 2 }} gap={2}>
            <TextInput
              type="tel"
              inputMode="tel"
              label="Ofis Telefonu *"
              placeholder="0 (312) 468 10 20"
              value={phone}
              onChange={(val) => {
                setPhone(formatTurkishPhone(val));
                clearError('phone');
              }}
              status={
                fieldErrors.phone
                  ? { type: 'error', message: fieldErrors.phone }
                  : undefined
              }
              width="100%"
            />
            <TextInput
              type="tel"
              inputMode="tel"
              label="Cep Telefonu"
              placeholder="0 (532) 411 22 33"
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
          </Grid>

          <Grid columns={{ minWidth: 160, max: 2 }} gap={2}>
            <TextInput
              type="tel"
              inputMode="tel"
              label="Fax"
              placeholder="0 (312) 468 10 21"
              value={fax}
              onChange={(val) => {
                setFax(formatTurkishPhone(val));
                clearError('fax');
              }}
              status={
                fieldErrors.fax
                  ? { type: 'error', message: fieldErrors.fax }
                  : undefined
              }
              width="100%"
            />
            <TextInput
              inputMode="numeric"
              label="Vergi No"
              placeholder="10 haneli VKN"
              value={taxNumber}
              onChange={(val) => {
                setTaxNumber(formatDigitsOnly(val, 11));
                clearError('tax_number');
              }}
              status={
                fieldErrors.tax_number
                  ? { type: 'error', message: fieldErrors.tax_number }
                  : undefined
              }
              width="100%"
            />
          </Grid>

          <TextInput
            label="Vergi Dairesi"
            placeholder="Örn: Çankaya Vergi Dairesi"
            value={taxOffice}
            onChange={(val) => setTaxOffice(val)}
            width="100%"
          />

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
            value={address}
            onChange={(val) => {
              setAddress(val);
              clearError('address');
            }}
            status={
              fieldErrors.address
                ? { type: 'error', message: fieldErrors.address }
                : undefined
            }
            width="100%"
          />

          <TextArea
            label="İşletme Açıklaması"
            placeholder="Hizmet verilen bölgeler ve uzmanlık alanları..."
            value={description}
            onChange={(val) => setDescription(val)}
          />

          <Text color="secondary" size="sm">
            * işaretli alanlar zorunludur.
          </Text>
        </VStack>

        <VStack gap={5}>
          <VStack gap={3}>
            <Heading level={3}>Ofis Logosu</Heading>
            <Divider />
            <LogoUploader
              label="Logoyu Güncelle"
              currentLogoUrl={logoUrl || null}
              onUploaded={(url) => setLogoUrl(url ?? '')}
            />
          </VStack>

          <VStack gap={3}>
            <Heading level={3}>Yazıcı Çıktısı Antet Önizlemesi</Heading>
            <Divider />
            <Card padding={4} variant="muted">
              <VStack gap={2}>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Avatar
                    name={name || 'Emlak Ofisi'}
                    src={logoUrl || undefined}
                    size="lg"
                    shape="rounded"
                  />
                  <VStack gap={0.5}>
                    <Heading level={4}>{name || 'İşletme Adı'}</Heading>
                    <Text color="secondary" size="sm">
                      {`Yetkili: ${authorizedPerson || '-'}`}
                    </Text>
                  </VStack>
                </HStack>
                <Divider />
                <Text size="sm">
                  {`${neighborhood ? `${neighborhood}, ` : ''}${address || '-'}${district || city ? ` (${district} / ${city})` : ''}`}
                </Text>
                <HStack gap={2} wrap="wrap">
                  <Text size="sm">{`Tel: ${phone || '-'}`}</Text>
                  {mobilePhone && <Text size="sm">{`Cep: ${mobilePhone}`}</Text>}
                  {fax && <Text size="sm">{`Fax: ${fax}`}</Text>}
                </HStack>
                <Text color="secondary" size="sm">
                  {[
                    taxOffice ? `Vergi Dairesi: ${taxOffice}` : '',
                    taxNumber ? `Vergi No: ${taxNumber}` : '',
                    agency ? `Yetki Belge No: ${agency.ttbs_document_no}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </VStack>
            </Card>
          </VStack>
        </VStack>
      </Grid>

      <VStack gap={3}>
        <Heading level={3}>Kayıtlı Emlak İşletmeleri</Heading>
        <Divider />
        <HStack isScrollable width="100%">
          <Table data={allAgencies} columns={agencyColumns} idKey="id" hasHover />
        </HStack>
      </VStack>
    </PageFrame>
  );
}
