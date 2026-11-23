import { useEffect, useState } from 'react';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Section } from '@astryxdesign/core/Section';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { useToast } from '@astryxdesign/core/Toast';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import { z } from 'zod';
import {
  extractDigits,
  formatDigitsOnly,
  formatTurkishPhone,
  parseApiError,
  sanitizeNameInput,
  zodErrorsToMap,
} from '../utils/validation';
import type { SessionAgency, UserSession } from './AuthModule';
import { TurkishLocationPicker } from './TurkishLocationPicker';

interface AgencyDetailRecord {
  [key: string]: unknown;
  id: number;
  name: string;
  authorized_person: string;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  phone: string;
  mobile_phone: string;
  fax: string;
  tax_office: string;
  tax_number: string;
  ttbs_document_no: string;
  is_ttbs_verified: boolean;
  logo_url: string;
  description: string;
  stats: {
    property_count: number;
    active_property_count: number;
    customer_count: number;
    appointment_count: number;
  };
}

interface AgencyProfileModuleProps {
  currentUser: UserSession;
  onAgencyUpdated: (updatedAgency: SessionAgency) => void;
  onNavigateAuth: () => void;
}

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const agencyProfileSchema = z.object({
  name: z.string().trim().min(3, 'İşletme adı en az 3 karakter olmalıdır.'),
  authorized_person: z
    .string()
    .trim()
    .min(3, 'Yetkili kişi adı soyadı en az 3 karakter olmalıdır.'),
  city: z.string().trim().min(1, 'Lütfen il seçiniz.'),
  district: z.string().trim().min(1, 'Lütfen ilçe seçiniz.'),
  neighborhood: z.string().trim().min(1, 'Lütfen mahalle seçiniz.'),
  address: z
    .string()
    .trim()
    .min(5, 'Açık adres detayı en az 5 karakter olmalıdır.'),
  phone: z.string().refine((v) => {
    const d = extractDigits(v);
    return d.length === 11 && d.startsWith('0');
  }, 'Geçerli bir ofis sabit telefonu giriniz (Örn: 0 (312) 468 10 20).'),
  mobile_phone: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        const d = extractDigits(v);
        return d.length === 11 && d.startsWith('05');
      },
      'Geçerli bir cep telefonu giriniz (Örn: 0 (532) 411 22 33).',
    ),
  fax: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        const d = extractDigits(v);
        return d.length === 11 && d.startsWith('0');
      },
      'Fax numarası 11 haneli olmalıdır (Örn: 0 (312) 468 10 21).',
    ),
  tax_number: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        const d = extractDigits(v);
        return d.length === 10 || d.length === 11;
      },
      'Vergi Kimlik Numarası 10 haneli (şahıs işletmesi için 11 haneli TCKN) olmalıdır.',
    ),
});

export function AgencyProfileModule({
  currentUser,
  onAgencyUpdated,
  onNavigateAuth,
}: AgencyProfileModuleProps) {
  const showToast = useToast();

  const [allAgencies, setAllAgencies] = useState<AgencyDetailRecord[]>([]);
  const [agency, setAgency] = useState<AgencyDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form alanları (GİB 1. Madde: İşletme adı, Yetkili, Adres, Telefon, Fax, Vergi No, TTBS, Logo)
  const [name, setName] = useState<string>('');
  const [authorizedPerson, setAuthorizedPerson] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [mobilePhone, setMobilePhone] = useState<string>('');
  const [fax, setFax] = useState<string>('');
  const [taxOffice, setTaxOffice] = useState<string>('');
  const [taxNumber, setTaxNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');

  // Logo yükleme state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{
    status: 'success' | 'error' | 'info';
    title: string;
    description: string;
  } | null>(null);

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const populateForm = (rec: AgencyDetailRecord) => {
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

  const fetchAgencyData = async () => {
    setIsLoading(true);
    try {
      const listRes = await fetch('/api/agencies');
      if (listRes.ok) {
        const listData = (await listRes.json()) as {
          agencies: AgencyDetailRecord[];
        };
        setAllAgencies(listData.agencies);
      }

      if (currentUser.role === 'AGENT' && currentUser.agency) {
        const res = await fetch(`/api/agencies/${currentUser.agency.id}`);
        if (res.ok) {
          const data = (await res.json()) as { agency: AgencyDetailRecord };
          populateForm(data.agency);
        }
      }
    } catch {
      showToast({
        body: 'İşyeri bilgileri yüklenirken sunucuya ulaşılamadı.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAgencyData();
  }, [currentUser.agency?.id, currentUser.role]);

  const handleLogoUpload = async (files: File | File[] | null) => {
    const selected = Array.isArray(files) ? files[0] ?? null : files;
    setLogoError(null);
    if (!selected) {
      setLogoFile(null);
      return;
    }

    if (!ALLOWED_LOGO_TYPES.has(selected.type)) {
      const msg = 'Yalnızca PNG, JPG/JPEG veya WEBP formatında logo yükleyebilirsiniz.';
      setLogoError(msg);
      showToast({ body: msg, type: 'error' });
      return;
    }

    if (selected.size > MAX_LOGO_SIZE_BYTES) {
      const mb = (selected.size / (1024 * 1024)).toFixed(2);
      const msg = `Logo boyutu en fazla 5 MB olabilir (Seçilen: ${mb} MB).`;
      setLogoError(msg);
      showToast({ body: msg, type: 'error' });
      return;
    }

    setLogoFile(selected);
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', selected);
      const res = await fetch('/api/uploads/logo', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as { url?: string; detail?: string };
      if (!res.ok || !data.url) {
        const err = data.detail ?? 'Logo yüklenemedi.';
        setLogoError(err);
        showToast({ body: err, type: 'error' });
        return;
      }
      setLogoUrl(data.url);
      showToast({
        body: 'Yeni ofis logosu yüklendi. Kaydet butonuna basarak profili güncelleyebilirsiniz.',
        type: 'info',
      });
    } catch {
      showToast({ body: 'Logo yüklenirken bağlantı hatası oluştu.', type: 'error' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!agency) return;
    setFeedback(null);

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
      const msg = `Formda ${Object.keys(errs).length} alanda eksik veya hatalı bilgi var.`;
      setFeedback({ status: 'error', title: 'Doğrulama Hatası', description: msg });
      showToast({ body: msg, type: 'error' });
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    try {
      const res = await fetch(`/api/agencies/${agency.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        message?: string;
        detail?: unknown;
        agency?: AgencyDetailRecord;
      };

      if (!res.ok || !data.agency) {
        const apiErr = parseApiError(data);
        setFieldErrors(apiErr.fieldErrors);
        setFeedback({
          status: 'error',
          title: 'Güncelleme Engellendi',
          description: apiErr.message,
        });
        showToast({ body: apiErr.message, type: 'error' });
        return;
      }

      populateForm(data.agency);
      onAgencyUpdated({
        id: data.agency.id,
        name: data.agency.name,
        authorized_person: data.agency.authorized_person,
        phone: data.agency.phone,
        mobile_phone: data.agency.mobile_phone,
        fax: data.agency.fax,
        city: data.agency.city,
        district: data.agency.district,
        neighborhood: data.agency.neighborhood,
        address: data.agency.address,
        ttbs_document_no: data.agency.ttbs_document_no,
        is_ttbs_verified: data.agency.is_ttbs_verified,
        logo_url: data.agency.logo_url,
      });

      const okMsg = data.message ?? 'İşyeri bilgileri başarıyla kaydedildi.';
      setFeedback({
        status: 'success',
        title: 'İşyeri Tanımı Güncellendi',
        description: okMsg,
      });
      showToast({ body: okMsg, type: 'info' });
      await fetchAgencyData();
    } catch {
      showToast({
        body: 'Sunucuya bağlanılamadı.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const agencyColumns: TableColumn<AgencyDetailRecord>[] = [
    {
      key: 'name',
      header: 'Emlak İşletmesi',
      renderCell: (a) => (
        <HStack gap={1.5} vAlign="center">
          <Avatar name={a.name} src={a.logo_url || undefined} size="sm" shape="rounded" />
          <VStack gap={0}>
            <Text weight="semibold">{a.name}</Text>
            <Text color="secondary" size="sm">
              {`Yetkili: ${a.authorized_person}`}
            </Text>
          </VStack>
        </HStack>
      ),
    },
    {
      key: 'ttbs_document_no',
      header: 'TTBS Yetki Belgesi',
      renderCell: (a) => (
        <Token label={`TTBS: ${a.ttbs_document_no}`} color="green" />
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
      header: 'Ofis Telefonu / Fax',
      renderCell: (a) => (
        <VStack gap={0}>
          <Text size="sm">{a.phone}</Text>
          {a.fax && (
            <Text color="secondary" size="sm">
              {`Fax: ${a.fax}`}
            </Text>
          )}
        </VStack>
      ),
    },
    {
      key: 'stats',
      header: 'Portföy & Müşteri',
      renderCell: (a) => (
        <HStack gap={1}>
          <Token label={`${a.stats.active_property_count} Aktif İlan`} color="blue" size="sm" />
          <Token label={`${a.stats.customer_count} Müşteri`} color="teal" size="sm" />
        </HStack>
      ),
    },
  ];

  if (currentUser.role !== 'AGENT' || !currentUser.agency) {
    return (
      <VStack gap={4}>
        <Banner
          status="warning"
          title="İşyeri Tanımı Ekranı Yalnızca Emlak İşletmesi Yetkililerine Açıktır"
          description="Kendi emlak işletmenizin kurumsal bilgilerini düzenlemek için lütfen bir Emlakçı (AGENT) hesabıyla giriş yapınız."
          collapsible={false}
          endContent={
            <Button
              label="Emlakçı Oturumuna Geç"
              variant="primary"
              size="sm"
              onClick={onNavigateAuth}
            />
          }
        />

        <Section padding={4}>
          <VStack gap={3}>
            <Heading level={2}>
              Platformdaki Yetki Belgeli Emlak İşletmeleri
            </Heading>
            <Divider />
            <Table data={allAgencies} columns={agencyColumns} idKey="id" hasHover />
          </VStack>
        </Section>
      </VStack>
    );
  }

  return (
    <VStack gap={4}>
      <Section padding={4}>
        <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
          <VStack gap={0.5}>
            <HStack gap={1.5} vAlign="center" wrap="wrap">
              <Token label="GİB MADDE 1 · İŞYERİ TANIMI" color="blue" />
              {agency && (
                <Token
                  label={`T.C. Ticaret Bakanlığı TTBS Doğrulandı · ${agency.ttbs_document_no}`}
                  color="green"
                />
              )}
            </HStack>
            <Heading level={2}>İşyeri (Emlak İşletmesi) Kurumsal Profili</Heading>
            <Text color="secondary" size="sm">
              Emlak işletmenizin resmi unvanı, yetkilisi, vergi bilgileri,
              iletişim/fax bilgileri ve adresi burada yönetilir; arama
              sonuçlarındaki PDF Bilgi Fişi çıktılarında otomatik yer alır.
            </Text>
          </VStack>

          <Button
            label="Değişiklikleri Kaydet"
            variant="primary"
            isLoading={isSaving}
            onClick={() => void handleSave()}
          />
        </HStack>
      </Section>

      {feedback && (
        <Banner
          status={feedback.status}
          title={feedback.title}
          description={feedback.description}
          collapsible={false}
        />
      )}

      {agency && (
        <Grid columns={{ minWidth: 200, max: 4 }} gap={3}>
          <Card padding={3}>
            <VStack gap={0.5}>
              <Text color="secondary" size="sm">
                Aktif Portföy İlanı
              </Text>
              <Heading level={2}>{agency.stats.active_property_count}</Heading>
              <Text color="secondary" size="sm">
                {`Toplam ${agency.stats.property_count} taşınmaz kaydı`}
              </Text>
            </VStack>
          </Card>
          <Card padding={3}>
            <VStack gap={0.5}>
              <Text color="secondary" size="sm">
                Kayıtlı Müşteri Sayısı
              </Text>
              <Heading level={2}>{agency.stats.customer_count}</Heading>
              <Text color="secondary" size="sm">
                Alıcı, satıcı, kiralayan, kiracı
              </Text>
            </VStack>
          </Card>
          <Card padding={3}>
            <VStack gap={0.5}>
              <Text color="secondary" size="sm">
                Planlanan Randevular
              </Text>
              <Heading level={2}>{agency.stats.appointment_count}</Heading>
              <Text color="secondary" size="sm">
                Fiziki & telefon görüşmeleri
              </Text>
            </VStack>
          </Card>
          <Card padding={3}>
            <VStack gap={0.5}>
              <Text color="secondary" size="sm">
                TTBS Yetki Belgesi
              </Text>
              <Heading level={2}>{agency.ttbs_document_no}</Heading>
              <Token label="Ticaret Bakanlığı Aktif" color="green" size="sm" />
            </VStack>
          </Card>
        </Grid>
      )}

      <Grid columns={{ minWidth: 360, max: 2 }} gap={4}>
        <Section padding={4}>
          <VStack gap={3}>
            <Heading level={3}>Resmi İşletme ve İletişim Bilgileri</Heading>
            <Divider />

            <TextInput
              label="İşletme Adı (Emlak Ofisi Ünvanı)"
              value={name}
              onChange={(val) => {
                setName(val);
                clearFieldError('name');
              }}
              status={
                fieldErrors.name
                  ? { type: 'error', message: fieldErrors.name }
                  : undefined
              }
              isRequired
            />

            <TextInput
              label="Yetkili Kişi Adı Soyadı"
              value={authorizedPerson}
              onChange={(val) => {
                setAuthorizedPerson(sanitizeNameInput(val));
                clearFieldError('authorized_person');
              }}
              status={
                fieldErrors.authorized_person
                  ? { type: 'error', message: fieldErrors.authorized_person }
                  : undefined
              }
              isRequired
            />

            <Grid columns={{ minWidth: 180, max: 2 }} gap={2}>
              <TextInput
                label="Vergi Dairesi"
                placeholder="Örn: Çankaya Vergi Dairesi"
                value={taxOffice}
                onChange={(val) => setTaxOffice(val)}
                isOptional
              />
              <TextInput
                inputMode="numeric"
                label="Vergi Kimlik No (VKN / TCKN)"
                placeholder="10 haneli Vergi No"
                value={taxNumber}
                onChange={(val) => {
                  setTaxNumber(formatDigitsOnly(val, 11));
                  clearFieldError('tax_number');
                }}
                status={
                  fieldErrors.tax_number
                    ? { type: 'error', message: fieldErrors.tax_number }
                    : undefined
                }
                isOptional
              />
            </Grid>

            <Grid columns={{ minWidth: 160, max: 3 }} gap={2}>
              <TextInput
                type="tel"
                inputMode="tel"
                label="Ofis Sabit Telefonu"
                placeholder="0 (312) 468 10 20"
                value={phone}
                onChange={(val) => {
                  setPhone(formatTurkishPhone(val));
                  clearFieldError('phone');
                }}
                status={
                  fieldErrors.phone
                    ? { type: 'error', message: fieldErrors.phone }
                    : undefined
                }
                isRequired
              />
              <TextInput
                type="tel"
                inputMode="tel"
                label="Yetkili Cep Telefonu"
                placeholder="0 (532) 411 22 33"
                value={mobilePhone}
                onChange={(val) => {
                  setMobilePhone(formatTurkishPhone(val));
                  clearFieldError('mobile_phone');
                }}
                status={
                  fieldErrors.mobile_phone
                    ? { type: 'error', message: fieldErrors.mobile_phone }
                    : undefined
                }
                isOptional
              />
              <TextInput
                type="tel"
                inputMode="tel"
                label="Fax Numarası"
                placeholder="0 (312) 468 10 21"
                value={fax}
                onChange={(val) => {
                  setFax(formatTurkishPhone(val));
                  clearFieldError('fax');
                }}
                status={
                  fieldErrors.fax
                    ? { type: 'error', message: fieldErrors.fax }
                    : undefined
                }
                isOptional
              />
            </Grid>

            <TurkishLocationPicker
              city={city}
              district={district}
              neighborhood={neighborhood}
              onChange={(next) => {
                setCity(next.city);
                setDistrict(next.district);
                setNeighborhood(next.neighborhood);
                clearFieldError('city');
                clearFieldError('district');
                clearFieldError('neighborhood');
              }}
              errors={{
                city: fieldErrors.city,
                district: fieldErrors.district,
                neighborhood: fieldErrors.neighborhood,
              }}
            />

            <TextInput
              label="Açık Adres (Cadde / Sokak / Bina / Kat)"
              value={address}
              onChange={(val) => {
                setAddress(val);
                clearFieldError('address');
              }}
              status={
                fieldErrors.address
                  ? { type: 'error', message: fieldErrors.address }
                  : undefined
              }
              isRequired
            />

            <TextArea
              label="Kurumsal İşletme Açıklaması"
              placeholder="Hizmet verilen bölgeler ve uzmanlık alanları..."
              value={description}
              onChange={(val) => setDescription(val)}
              isOptional
            />
          </VStack>
        </Section>

        <VStack gap={4}>
          <Section padding={4}>
            <VStack gap={3}>
              <Heading level={3}>Emlak Ofisi Kurumsal Logosu</Heading>
              <Divider />
              <HStack gap={3} vAlign="center" wrap="wrap">
                {logoUrl ? (
                  <Thumbnail
                    src={logoUrl}
                    alt={name || 'Ofis Logosu'}
                    label={name || 'Ofis Logosu'}
                  />
                ) : (
                  <Avatar name={name || 'Emlak Ofisi'} size="lg" shape="rounded" />
                )}
                <VStack gap={0.5}>
                  <Text weight="semibold">{name || 'Emlak İşletmesi'}</Text>
                  <Text color="secondary" size="sm">
                    Aktif kurumsal logo (PDF Bilgi Fişlerinde ve vitrin
                    kartlarında görünür)
                  </Text>
                </VStack>
              </HStack>

              <FileInput
                mode="dropzone"
                label="Logoyu Değiştir"
                description="PNG, JPG/JPEG veya WEBP formatında, en fazla 5 MB boyutunda dosya yükleyebilirsiniz."
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                maxSize={MAX_LOGO_SIZE_BYTES}
                value={logoFile}
                isLoading={isUploadingLogo}
                isOptional
                placeholder="Yeni logo dosyasını sürükleyin veya seçin (Max 5 MB)"
                onChange={(files) => void handleLogoUpload(files)}
                status={
                  logoError
                    ? { type: 'error', message: logoError }
                    : undefined
                }
              />
            </VStack>
          </Section>

          <Section padding={4}>
            <VStack gap={3}>
              <HStack justify="between" vAlign="center">
                <Heading level={3}>
                  Canlı Kurumsal Antet & PDF Başlık Önizlemesi
                </Heading>
                <Token label="GİB Yazıcı Çıktısı Şablonu" color="purple" size="sm" />
              </HStack>
              <Divider />

              <Card padding={4} variant="muted">
                <VStack gap={2}>
                  <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                    <HStack gap={2} vAlign="center">
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
                    {agency && (
                      <Token
                        label={`TTBS Yetki Belge No: ${agency.ttbs_document_no}`}
                        color="green"
                      />
                    )}
                  </HStack>
                  <Divider />
                  <Text size="sm">
                    {`Adres: ${neighborhood ? `${neighborhood}, ` : ''}${address || '-'}${district || city ? ` (${district} / ${city})` : ''}`}
                  </Text>
                  <HStack gap={3} wrap="wrap">
                    <Text size="sm">{`Tel: ${phone || '-'}`}</Text>
                    {mobilePhone && <Text size="sm">{`Cep: ${mobilePhone}`}</Text>}
                    {fax && <Text size="sm">{`Fax: ${fax}`}</Text>}
                  </HStack>
                  {(taxOffice || taxNumber) && (
                    <Text color="secondary" size="sm">
                      {`Vergi Dairesi: ${taxOffice || '-'} · Vergi No: ${taxNumber || '-'}`}
                    </Text>
                  )}
                </VStack>
              </Card>
            </VStack>
          </Section>
        </VStack>
      </Grid>

      <Section padding={4}>
        <VStack gap={3}>
          <HStack justify="between" vAlign="center">
            <Heading level={3}>
              Sistemde Kayıtlı Tüm Yetki Belgeli Emlak İşletmeleri
            </Heading>
            <Button
              label="Listeyi Yenile"
              variant="secondary"
              size="sm"
              isLoading={isLoading}
              onClick={() => void fetchAgencyData()}
            />
          </HStack>
          <Divider />
          <Table data={allAgencies} columns={agencyColumns} idKey="id" hasHover />
        </VStack>
      </Section>
    </VStack>
  );
}
