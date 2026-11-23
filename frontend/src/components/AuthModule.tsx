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
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { useToast } from '@astryxdesign/core/Toast';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import {
  formatDigitsOnly,
  formatTurkishPhone,
  loginSchema,
  parseApiError,
  registerAgentSchema,
  registerCustomerSchema,
  sanitizeNameInput,
  zodErrorsToMap,
} from '../utils/validation';
import { TurkishLocationPicker } from './TurkishLocationPicker';

export interface SessionAgency {
  id: number;
  name: string;
  authorized_person: string;
  phone: string;
  mobile_phone?: string | null;
  fax?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  address: string;
  ttbs_document_no: string;
  is_ttbs_verified: boolean;
  logo_url?: string | null;
}

export interface SessionCustomer {
  id: number;
  full_name: string;
  customer_type: string;
  mobile_phone: string;
}

export interface UserSession {
  [key: string]: unknown;
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: 'AGENT' | 'CUSTOMER' | 'VISITOR';
  agency: SessionAgency | null;
  customer: SessionCustomer | null;
}

interface TTBSVerifyResult {
  is_valid: boolean;
  ttbs_document_no: string;
  province: string;
  ministry: string;
  status: string;
  message: string;
}

interface AuthModuleProps {
  currentUser: UserSession;
  onSelectSession: (session: UserSession) => void;
  onDataChanged: () => void;
}

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export const VISITOR_SESSION: UserSession = {
  id: 0,
  full_name: 'Ziyaretçi Kullanıcı (Girişsiz Mod)',
  email: 'ziyaretci@gib-e-emlak.gov.tr',
  phone: '-',
  role: 'VISITOR',
  agency: null,
  customer: null,
};

export function AuthModule({
  currentUser,
  onSelectSession,
  onDataChanged,
}: AuthModuleProps) {
  const showToast = useToast();

  const [activeTab, setActiveTab] = useState<string>('register');
  const [registerRole, setRegisterRole] = useState<'AGENT' | 'CUSTOMER'>('AGENT');

  // Ortak Kayıt Alanları (Ad ve Soyad ayrı!)
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  // Emlakçıya Özel Alanlar
  const [ttbsDocumentNo, setTtbsDocumentNo] = useState<string>('');
  const [officePhone, setOfficePhone] = useState<string>('');
  const [agencyName, setAgencyName] = useState<string>('');

  // Yapısal Adres (İl -> İlçe -> Mahalle -> Açık Adres Detayı)
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [addressDetail, setAddressDetail] = useState<string>('');

  // Logo Dosya Yükleme (Max 5 MB, PNG/JPG/WEBP, yüklenmezse backend random atar)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

  // TTBS Doğrulama Durumu
  const [ttbsResult, setTtbsResult] = useState<TTBSVerifyResult | null>(null);
  const [isVerifyingTtbs, setIsVerifyingTtbs] = useState<boolean>(false);

  // Giriş Alanları
  const [loginEmail, setLoginEmail] = useState<string>('selim@baskentvizyon.com.tr');
  const [loginPassword, setLoginPassword] = useState<string>('123456');

  // Alan Bazlı Validasyon Hataları (Kırmızı Inputlar) ve Genel Banner
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{
    status: 'success' | 'error' | 'info' | 'warning';
    title: string;
    description: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registeredUsers, setRegisteredUsers] = useState<UserSession[]>([]);

  const clearFieldError = (fieldKey: string) => {
    setFieldErrors((prev) => {
      if (!prev[fieldKey]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  };

  const fetchRegisteredUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = (await res.json()) as { users: UserSession[] };
        setRegisteredUsers(data.users);
      }
    } catch {
      // ignore offline error
    }
  };

  useEffect(() => {
    void fetchRegisteredUsers();
  }, []);

  const handleLogoFileChange = async (files: File | File[] | null) => {
    const selected = Array.isArray(files) ? files[0] ?? null : files;
    setLogoError(null);

    if (!selected) {
      setLogoFile(null);
      setUploadedLogoUrl(null);
      return;
    }

    if (!ALLOWED_LOGO_TYPES.has(selected.type)) {
      const msg =
        'Desteklenmeyen dosya formatı. Yalnızca PNG, JPG/JPEG veya WEBP yükleyebilirsiniz.';
      setLogoError(msg);
      setLogoFile(null);
      setUploadedLogoUrl(null);
      showToast({ body: msg, type: 'error' });
      return;
    }

    if (selected.size > MAX_LOGO_SIZE_BYTES) {
      const mb = (selected.size / (1024 * 1024)).toFixed(2);
      const msg = `Dosya boyutu maksimum 5 MB olabilir (Seçilen dosya: ${mb} MB).`;
      setLogoError(msg);
      setLogoFile(null);
      setUploadedLogoUrl(null);
      showToast({ body: msg, type: 'error' });
      return;
    }

    setLogoFile(selected);
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', selected);
      const response = await fetch('/api/uploads/logo', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json()) as {
        url?: string;
        detail?: string;
      };
      if (!response.ok || !data.url) {
        const errMsg = data.detail ?? 'Logo yüklenemedi.';
        setLogoError(errMsg);
        setLogoFile(null);
        setUploadedLogoUrl(null);
        showToast({ body: errMsg, type: 'error' });
        return;
      }

      setUploadedLogoUrl(data.url);
      showToast({
        body: `Emlak ofisi logosu yüklendi (${selected.name}).`,
        type: 'info',
      });
    } catch {
      const errMsg = 'Logo yüklenirken sunucuya ulaşılamadı.';
      setLogoError(errMsg);
      setLogoFile(null);
      setUploadedLogoUrl(null);
      showToast({ body: errMsg, type: 'error' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleVerifyTtbs = async (docNoToVerify?: string) => {
    const targetNo = formatDigitsOnly(docNoToVerify ?? ttbsDocumentNo, 7);
    if (targetNo.length !== 7) {
      const err =
        'BR-01: Taşınmaz Ticareti Yetki Belgesi numarası 7 haneli sayısal olmalıdır (Örn: 0609412).';
      setFieldErrors((prev) => ({ ...prev, ttbs_document_no: err }));
      showToast({ body: err, type: 'error' });
      return;
    }

    setIsVerifyingTtbs(true);
    try {
      const response = await fetch('/api/verify/ttbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ttbs_document_no: targetNo,
          agency_name: agencyName || undefined,
          check_duplicate: true,
        }),
      });
      const data = (await response.json()) as TTBSVerifyResult;
      setTtbsResult(data);
      if (data.is_valid) {
        clearFieldError('ttbs_document_no');
        showToast({
          body: `TTBS Doğrulandı: ${data.ttbs_document_no} (${data.province})`,
          type: 'info',
        });
      } else {
        setFieldErrors((prev) => ({ ...prev, ttbs_document_no: data.message }));
        showToast({ body: data.message, type: 'error' });
      }
      setFeedback({
        status: data.is_valid ? 'success' : 'error',
        title: data.is_valid
          ? 'T.C. Ticaret Bakanlığı TTBS Yetki Belgesi Doğrulandı'
          : 'Taşınmaz Ticareti Yetki Belgesi Doğrulanamadı (BR-01)',
        description: data.message,
      });
    } catch {
      showToast({
        body: 'TTBS doğrulama servisine ulaşılamadı.',
        type: 'error',
      });
    } finally {
      setIsVerifyingTtbs(false);
    }
  };

  const handleFillSampleValidAgent = () => {
    setRegisterRole('AGENT');
    setFieldErrors({});
    setFirstName('Kemal');
    setLastName('Soylu');
    setEmail('kemal@ankaraemlakmerkezi.com.tr');
    setPassword('GibEmlak!2026');
    setPhone('0 (532) 654 32 10');
    setTtbsDocumentNo('0609412');
    setOfficePhone('0 (312) 419 88 99');
    setAgencyName('Ankara Emlak Merkezi & Yatırım');
    setSelectedCity('Ankara');
    setSelectedDistrict('Çankaya');
    setSelectedNeighborhood('Kızılırmak Mah.');
    setAddressDetail('Tunalı Hilmi Cad. No:88 Kat:2 Daire:4');
    void handleVerifyTtbs('0609412');
  };

  const handleTestInvalidTtbs = () => {
    setRegisterRole('AGENT');
    setTtbsDocumentNo('9999999');
    void handleVerifyTtbs('9999999');
  };

  const handleRegister = async () => {
    setFeedback(null);

    const payload =
      registerRole === 'AGENT'
        ? {
            first_name: firstName,
            last_name: lastName,
            email,
            password,
            phone,
            ttbs_document_no: ttbsDocumentNo,
            agency_name: agencyName,
            office_phone: officePhone,
            city: selectedCity,
            district: selectedDistrict,
            neighborhood: selectedNeighborhood,
            address_detail: addressDetail,
          }
        : {
            first_name: firstName,
            last_name: lastName,
            email,
            password,
            phone,
          };

    // 1. İstemci (Zod) Form Doğrulaması — tüm eksik/hatalı inputlar kırmızıya döner
    const parsed =
      registerRole === 'AGENT'
        ? registerAgentSchema.safeParse(payload)
        : registerCustomerSchema.safeParse(payload);

    if (!parsed.success) {
      const errs = zodErrorsToMap(parsed.error);
      setFieldErrors(errs);
      const count = Object.keys(errs).length;
      const summaryMsg = `Formda ${count} alanda eksik veya hatalı bilgi var. Kırmızı ile işaretlenen alanları düzeltiniz.`;
      setFeedback({
        status: 'error',
        title: 'Form Doğrulama Hatası',
        description: summaryMsg,
      });
      showToast({ body: summaryMsg, type: 'error' });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          role: registerRole,
          logo_url: registerRole === 'AGENT' ? uploadedLogoUrl : null,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        detail?: unknown;
        user?: UserSession;
      };

      if (!response.ok) {
        const apiErr = parseApiError(data);
        setFieldErrors(apiErr.fieldErrors);
        setFeedback({
          status: 'error',
          title: 'Kayıt İşlemi Engellendi (İş Kuralı Denetimi)',
          description: apiErr.message,
        });
        showToast({ body: apiErr.message, type: 'error' });
        return;
      }

      if (data.user) {
        onSelectSession(data.user);
      }
      const okMsg = data.message ?? 'Hesabınız başarıyla oluşturuldu.';
      setFeedback({
        status: 'success',
        title: 'Kayıt Başarıyla Oluşturuldu ve Oturum Açıldı',
        description: okMsg,
      });
      showToast({ body: okMsg, type: 'info' });
      await fetchRegisteredUsers();
      onDataChanged();
    } catch {
      const netErr = 'Sunucuya bağlanılamadı. Backend servisinin çalıştığından emin olun.';
      setFeedback({
        status: 'error',
        title: 'Bağlantı Hatası',
        description: netErr,
      });
      showToast({ body: netErr, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setFeedback(null);
    const parsed = loginSchema.safeParse({
      login_email: loginEmail,
      login_password: loginPassword,
    });
    if (!parsed.success) {
      const errs = zodErrorsToMap(parsed.error);
      setFieldErrors(errs);
      showToast({
        body: 'Lütfen geçerli bir e-posta ve şifre giriniz.',
        type: 'error',
      });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        detail?: unknown;
        user?: UserSession;
      };

      if (!response.ok || !data.user) {
        const apiErr = parseApiError(data);
        setFieldErrors(apiErr.fieldErrors);
        setFeedback({
          status: 'error',
          title: 'Giriş Başarısız',
          description: apiErr.message,
        });
        showToast({ body: apiErr.message, type: 'error' });
        return;
      }

      onSelectSession(data.user);
      const okMsg = `${data.message ?? 'Giriş yapıldı.'}`;
      setFeedback({
        status: 'success',
        title: 'Oturum Açıldı',
        description: okMsg,
      });
      showToast({ body: okMsg, type: 'info' });
    } catch {
      const netErr = 'Sunucuya bağlanılamadı.';
      setFeedback({
        status: 'error',
        title: 'Bağlantı Hatası',
        description: netErr,
      });
      showToast({ body: netErr, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Şifre kuralı canlı göstergeleri
  const hasMinLen = password.length >= 8;
  const hasLetter = /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9ÇĞİÖŞÜçğıöşü\s]/.test(password);

  const userColumns: TableColumn<UserSession>[] = [
    {
      key: 'full_name',
      header: 'Ad Soyad',
      renderCell: (u) => (
        <HStack gap={1.5} vAlign="center">
          <Avatar
            name={u.full_name}
            src={u.agency?.logo_url ?? undefined}
            size="sm"
          />
          <Text weight="semibold">{u.full_name}</Text>
        </HStack>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      renderCell: (u) => (
        <Token
          label={u.role === 'AGENT' ? 'EMLAKÇI' : 'MÜŞTERİ'}
          color={u.role === 'AGENT' ? 'blue' : 'teal'}
        />
      ),
    },
    {
      key: 'email',
      header: 'Tekil E-Posta (BR-02)',
      renderCell: (u) => <Text type="code">{u.email}</Text>,
    },
    {
      key: 'phone',
      header: 'Cep Telefonu',
    },
    {
      key: 'agency',
      header: 'Emlak Ofisi, Konum & TTBS Belge No',
      renderCell: (u) =>
        u.agency ? (
          <HStack gap={1} vAlign="center" wrap="wrap">
            <Text weight="medium">{u.agency.name}</Text>
            {u.agency.city && (
              <Token
                label={`${u.agency.district ?? ''} / ${u.agency.city}`}
                color="gray"
                size="sm"
              />
            )}
            <Token
              label={`TTBS: ${u.agency.ttbs_document_no}`}
              color="green"
              size="sm"
            />
          </HStack>
        ) : (
          <Text color="secondary">Bireysel Müşteri</Text>
        ),
    },
    {
      key: 'id',
      header: 'Hızlı Oturum Geçişi',
      renderCell: (u) => (
        <Button
          label={currentUser.id === u.id ? 'Aktif Oturum' : 'Bu Hesaba Geç'}
          variant={currentUser.id === u.id ? 'secondary' : 'primary'}
          size="sm"
          isDisabled={currentUser.id === u.id}
          onClick={() => {
            onSelectSession(u);
            showToast({
              body: `Aktif hesap değiştirildi: ${u.full_name}`,
              type: 'info',
            });
          }}
        />
      ),
    },
  ];

  return (
    <VStack gap={4}>
      <Section padding={4}>
        <VStack gap={3}>
          <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
            <VStack gap={0.5}>
              <HStack gap={1.5} vAlign="center" wrap="wrap">
                <Token label="PARÇA P2" color="blue" />
                <Token
                  label={
                    currentUser.role === 'AGENT'
                      ? `AKTİF ROL: EMLAKÇI (${currentUser.agency?.name ?? ''})`
                      : currentUser.role === 'CUSTOMER'
                        ? 'AKTİF ROL: KAYITLI MÜŞTERİ'
                        : 'AKTİF ROL: ZİYARETÇİ (GİRİŞSİZ MOD)'
                  }
                  color={
                    currentUser.role === 'AGENT'
                      ? 'green'
                      : currentUser.role === 'CUSTOMER'
                        ? 'teal'
                        : 'orange'
                  }
                />
              </HStack>
              <Heading level={2}>
                Kullanıcı Kayıt / Giriş ve Taşınmaz Ticareti Yetki Belgesi
                Doğrulama
              </Heading>
              <Text color="secondary" size="sm">
                Zod form doğrulama, telefon maskeleme, 8+ karakter güçlü şifre,
                Türkiye İl–İlçe–Mahalle seçimi ve 5 MB kurumsal logo yükleme.
              </Text>
            </VStack>

            <HStack gap={1.5} wrap="wrap">
              <Button
                label="Kayıt Olmadan Ziyaretçi Moduna Geç (BR-08)"
                variant={currentUser.role === 'VISITOR' ? 'primary' : 'secondary'}
                onClick={() => {
                  onSelectSession(VISITOR_SESSION);
                  showToast({
                    body: 'Ziyaretçi (girişsiz) moduna geçildi.',
                    type: 'info',
                  });
                }}
              />
            </HStack>
          </HStack>

          {feedback && (
            <Banner
              status={feedback.status}
              title={feedback.title}
              description={feedback.description}
              collapsible={false}
            />
          )}
        </VStack>
      </Section>

      <Section padding={4}>
        <VStack gap={4}>
          <TabList
            value={activeTab}
            onChange={(val) => {
              setActiveTab(val);
              setFieldErrors({});
              setFeedback(null);
            }}
            hasDivider
          >
            <Tab value="register" label="Yeni Kayıt Ol (Emlakçı / Müşteri)" />
            <Tab value="login" label="Giriş Yap (Mevcut Hesap)" />
          </TabList>

          {activeTab === 'register' ? (
            <VStack gap={4}>
              <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                <HStack gap={1.5} wrap="wrap">
                  <Button
                    label="Emlakçı Kaydı (Yetki Belgeli İşletme)"
                    variant={registerRole === 'AGENT' ? 'primary' : 'secondary'}
                    onClick={() => {
                      setRegisterRole('AGENT');
                      setFieldErrors({});
                    }}
                  />
                  <Button
                    label="Müşteri Kaydı (Bireysel Üyelik)"
                    variant={registerRole === 'CUSTOMER' ? 'primary' : 'secondary'}
                    onClick={() => {
                      setRegisterRole('CUSTOMER');
                      setFieldErrors({});
                    }}
                  />
                </HStack>

                {registerRole === 'AGENT' && (
                  <HStack gap={1} wrap="wrap">
                    <Button
                      label="Örnek Geçerli Emlakçı Doldur (0609412)"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleFillSampleValidAgent()}
                    />
                    <Button
                      label="Geçersiz Belge Test Et (9999999)"
                      variant="ghost"
                      size="sm"
                      onClick={handleTestInvalidTtbs}
                    />
                  </HStack>
                )}
              </HStack>

              <Grid columns={{ minWidth: 340, max: 2 }} gap={4}>
                <Card padding={4}>
                  <VStack gap={3}>
                    <HStack gap={1} vAlign="center">
                      <Token label="ORTAK ALANLAR" color="blue" />
                      <Heading level={3}>Temel Kullanıcı Bilgileri</Heading>
                    </HStack>
                    <Divider />

                    <Grid columns={{ minWidth: 160, max: 2 }} gap={2}>
                      <TextInput
                        label="Ad"
                        placeholder="Örn: Kemal"
                        value={firstName}
                        onChange={(val) => {
                          setFirstName(sanitizeNameInput(val));
                          clearFieldError('first_name');
                        }}
                        status={
                          fieldErrors.first_name
                            ? { type: 'error', message: fieldErrors.first_name }
                            : undefined
                        }
                        isRequired
                      />

                      <TextInput
                        label="Soyad"
                        placeholder="Örn: Soylu"
                        value={lastName}
                        onChange={(val) => {
                          setLastName(sanitizeNameInput(val));
                          clearFieldError('last_name');
                        }}
                        status={
                          fieldErrors.last_name
                            ? { type: 'error', message: fieldErrors.last_name }
                            : undefined
                        }
                        isRequired
                      />
                    </Grid>

                    <TextInput
                      type="email"
                      label="E-Posta Adresi (Tek Kayıt - BR-02)"
                      description="Her e-posta adresi ile sistemde yalnızca tek kayıt açılabilir."
                      placeholder="ornek@eposta.com"
                      value={email}
                      onChange={(val) => {
                        setEmail(val);
                        clearFieldError('email');
                      }}
                      status={
                        fieldErrors.email
                          ? { type: 'error', message: fieldErrors.email }
                          : undefined
                      }
                      isRequired
                    />

                    <VStack gap={1}>
                      <TextInput
                        type="password"
                        label="Şifre Oluştur"
                        description="En az 8 karakter; en az 1 harf, 1 rakam ve 1 sembol içermelidir."
                        placeholder="Örn: GibEmlak!2026"
                        value={password}
                        onChange={(val) => {
                          setPassword(val);
                          clearFieldError('password');
                        }}
                        status={
                          fieldErrors.password
                            ? { type: 'error', message: fieldErrors.password }
                            : undefined
                        }
                        isRequired
                      />
                      <HStack gap={1} wrap="wrap">
                        <Token
                          label="8+ Karakter"
                          size="sm"
                          color={hasMinLen ? 'green' : 'gray'}
                        />
                        <Token
                          label="Harf"
                          size="sm"
                          color={hasLetter ? 'green' : 'gray'}
                        />
                        <Token
                          label="Rakam"
                          size="sm"
                          color={hasDigit ? 'green' : 'gray'}
                        />
                        <Token
                          label="Sembol (!@#.)"
                          size="sm"
                          color={hasSymbol ? 'green' : 'gray'}
                        />
                      </HStack>
                    </VStack>

                    <TextInput
                      type="tel"
                      inputMode="tel"
                      label="Cep Telefonu Numarası"
                      description="Yalnızca rakam kabul eder ve otomatik formatlanır."
                      placeholder="0 (532) 123 45 67"
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
                  </VStack>
                </Card>

                {registerRole === 'AGENT' ? (
                  <Card padding={4}>
                    <VStack gap={3}>
                      <HStack gap={1} vAlign="center">
                        <Token label="EMLAKÇIYA ÖZEL" color="purple" />
                        <Heading level={3}>
                          TTBS Yetki Belgesi, Ofis Adresi & Logo
                        </Heading>
                      </HStack>
                      <Divider />

                      <VStack gap={1.5}>
                        <TextInput
                          inputMode="numeric"
                          label="Taşınmaz Ticareti Yetki Belgesi No (7 Haneli - BR-01)"
                          description="T.C. Ticaret Bakanlığı TTBS resmi formatı: İlk 2 hane il plaka kodu olmak üzere 7 haneli sayısal belge no."
                          placeholder="Örn: 0609412"
                          value={ttbsDocumentNo}
                          onChange={(val) => {
                            setTtbsDocumentNo(formatDigitsOnly(val, 7));
                            setTtbsResult(null);
                            clearFieldError('ttbs_document_no');
                          }}
                          status={
                            fieldErrors.ttbs_document_no
                              ? {
                                  type: 'error',
                                  message: fieldErrors.ttbs_document_no,
                                }
                              : ttbsResult
                                ? {
                                    type: ttbsResult.is_valid
                                      ? 'success'
                                      : 'error',
                                    message: ttbsResult.message,
                                  }
                                : undefined
                          }
                          isRequired
                        />
                        <HStack>
                          <Button
                            label="Ticaret Bakanlığı TTBS Doğrula"
                            variant="secondary"
                            size="sm"
                            isLoading={isVerifyingTtbs}
                            onClick={() => void handleVerifyTtbs()}
                          />
                        </HStack>
                      </VStack>

                      <TextInput
                        label="Emlak Ofisi İsmi (İşletme Adı)"
                        placeholder="Örn: Ankara Emlak Merkezi & Yatırım"
                        value={agencyName}
                        onChange={(val) => {
                          setAgencyName(val);
                          clearFieldError('agency_name');
                        }}
                        status={
                          fieldErrors.agency_name
                            ? {
                                type: 'error',
                                message: fieldErrors.agency_name,
                              }
                            : undefined
                        }
                        isRequired
                      />

                      <TextInput
                        type="tel"
                        inputMode="tel"
                        label="Emlak Ofisi Sabit Telefon No"
                        placeholder="0 (312) 419 88 99"
                        value={officePhone}
                        onChange={(val) => {
                          setOfficePhone(formatTurkishPhone(val));
                          clearFieldError('office_phone');
                        }}
                        status={
                          fieldErrors.office_phone
                            ? {
                                type: 'error',
                                message: fieldErrors.office_phone,
                              }
                            : undefined
                        }
                        isRequired
                      />

                      <TurkishLocationPicker
                        city={selectedCity}
                        district={selectedDistrict}
                        neighborhood={selectedNeighborhood}
                        onChange={(next) => {
                          setSelectedCity(next.city);
                          setSelectedDistrict(next.district);
                          setSelectedNeighborhood(next.neighborhood);
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
                        label="Açık Adres Detayı (Cadde / Sokak / Kapı No)"
                        placeholder="Örn: Tunalı Hilmi Cad. No:88 Kat:2 Daire:4"
                        value={addressDetail}
                        onChange={(val) => {
                          setAddressDetail(val);
                          clearFieldError('address_detail');
                        }}
                        status={
                          fieldErrors.address_detail
                            ? {
                                type: 'error',
                                message: fieldErrors.address_detail,
                              }
                            : undefined
                        }
                        isRequired
                      />

                      <VStack gap={2}>
                        <FileInput
                          mode="dropzone"
                          label="Emlak Ofisi Logosu Yükle"
                          description="Kabul edilen formatlar: PNG, JPG/JPEG, WEBP · Maksimum dosya boyutu: 5 MB. Görsel yüklemezseniz kurumsal varsayılan logolardan biri rastgele atanır."
                          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                          maxSize={MAX_LOGO_SIZE_BYTES}
                          value={logoFile}
                          isLoading={isUploadingLogo}
                          isOptional
                          placeholder="Logo dosyasını sürükleyip bırakın veya seçin (PNG, JPG, WEBP · Max 5 MB)"
                          onChange={(files) => void handleLogoFileChange(files)}
                          status={
                            logoError
                              ? { type: 'error', message: logoError }
                              : uploadedLogoUrl
                                ? {
                                    type: 'success',
                                    message:
                                      'Logo yüklendi. İsterseniz önizleme üzerinden kaldırıp değiştirebilirsiniz.',
                                  }
                                : undefined
                          }
                        />

                        {uploadedLogoUrl && (
                          <HStack gap={2} vAlign="center">
                            <Thumbnail
                              src={uploadedLogoUrl}
                              alt={agencyName || 'Emlak Ofisi Logosu'}
                              label={logoFile?.name ?? 'Ofis Logosu'}
                              showRemoveOn="always"
                              onRemove={() => {
                                setLogoFile(null);
                                setUploadedLogoUrl(null);
                                setLogoError(null);
                              }}
                            />
                            <VStack gap={0.5}>
                              <Text weight="semibold" size="sm">
                                Yüklenen Ofis Logosu Önizlemesi
                              </Text>
                              <Text color="secondary" size="sm">
                                {logoFile
                                  ? `${logoFile.name} (${(logoFile.size / 1024).toFixed(0)} KB)`
                                  : 'Özel kurumsal logo aktif'}
                              </Text>
                            </VStack>
                          </HStack>
                        )}
                      </VStack>
                    </VStack>
                  </Card>
                ) : (
                  <Card padding={4}>
                    <VStack gap={3}>
                      <Token label="BİREYSEL MÜŞTERİ ÜYELİĞİ" color="teal" />
                      <Heading level={3}>
                        Tek Hesapla Tüm İşlemler (BR-08)
                      </Heading>
                      <Divider />
                      <Text color="secondary">
                        • Kayıt olurken kategori seçmenize gerek yoktur; giriş
                        yaptıktan sonra dilediğiniz gibi satılık veya kiralık
                        ilanları filtreleyebilirsiniz.
                      </Text>
                      <Text color="secondary">
                        • Hayalinizdeki evi doğal dille tasvir ederek Yapay Zeka
                        (AI) Akıllı Arama özelliğini kullanabilirsiniz.
                      </Text>
                      <Text color="secondary">
                        • Beğendiğiniz ilanları Favorilere ekleyebilir,
                        emlakçıların müsait saatlerini görerek Fiziki veya
                        Telefon randevusu oluşturabilirsiniz.
                      </Text>
                      <Text color="secondary">
                        • Evinizi satmak veya kiraya vermek istediğinizde yetki
                        belgeli emlak ofislerini listeleyip doğrudan başvuru
                        yapabilirsiniz.
                      </Text>
                    </VStack>
                  </Card>
                )}
              </Grid>

              <HStack justify="end" gap={2}>
                <Button
                  label={
                    registerRole === 'AGENT'
                      ? 'Yetki Belgesini Doğrula ve Emlakçı Kaydını Tamamla'
                      : 'Müşteri Kaydını Tamamla'
                  }
                  variant="primary"
                  isLoading={isSubmitting}
                  onClick={() => void handleRegister()}
                />
              </HStack>
            </VStack>
          ) : (
            <Grid columns={{ minWidth: 320, max: 2 }} gap={4}>
              <Card padding={4}>
                <VStack gap={3}>
                  <Heading level={3}>Kayıtlı Hesap ile Giriş Yap</Heading>
                  <Divider />
                  <TextInput
                    type="email"
                    label="E-Posta Adresi"
                    value={loginEmail}
                    onChange={(val) => {
                      setLoginEmail(val);
                      clearFieldError('login_email');
                    }}
                    status={
                      fieldErrors.login_email
                        ? { type: 'error', message: fieldErrors.login_email }
                        : undefined
                    }
                    isRequired
                  />
                  <TextInput
                    type="password"
                    label="Şifre"
                    value={loginPassword}
                    onChange={(val) => {
                      setLoginPassword(val);
                      clearFieldError('login_password');
                    }}
                    status={
                      fieldErrors.login_password
                        ? { type: 'error', message: fieldErrors.login_password }
                        : undefined
                    }
                    isRequired
                  />
                  <HStack gap={1.5} wrap="wrap">
                    <Button
                      label="Giriş Yap"
                      variant="primary"
                      isLoading={isSubmitting}
                      onClick={() => void handleLogin()}
                    />
                    <Button
                      label="Kayıt Olmadan Ziyaretçi Olarak Bak"
                      variant="secondary"
                      onClick={() => onSelectSession(VISITOR_SESSION)}
                    />
                  </HStack>
                </VStack>
              </Card>

              <Card padding={4}>
                <VStack gap={3}>
                  <Heading level={3}>Hızlı Demo Giriş Kısayolları</Heading>
                  <Divider />
                  <Text color="secondary" size="sm">
                    Test ve sunum sırasında şifre yazmadan tek tıkla farklı
                    emlak işletmesi veya müşteri hesaplarına geçebilirsiniz:
                  </Text>
                  <VStack gap={1.5}>
                    <Button
                      label="Emlakçı 1: Selim Karahan (Başkent Vizyon - TTBS: 0600482)"
                      variant="secondary"
                      onClick={() => {
                        setLoginEmail('selim@baskentvizyon.com.tr');
                        setLoginPassword('123456');
                        setFieldErrors({});
                      }}
                    />
                    <Button
                      label="Emlakçı 2: Ayşe Demirci (Boğaziçi Prestij - TTBS: 3401925)"
                      variant="secondary"
                      onClick={() => {
                        setLoginEmail('ayse@bogaziciprestij.com.tr');
                        setLoginPassword('123456');
                        setFieldErrors({});
                      }}
                    />
                    <Button
                      label="Kayıtlı Müşteri: Zeynep Kaya"
                      variant="secondary"
                      onClick={() => {
                        setLoginEmail('zeynep.kaya@ornekmail.com');
                        setLoginPassword('123456');
                        setFieldErrors({});
                      }}
                    />
                  </VStack>
                </VStack>
              </Card>
            </Grid>
          )}
        </VStack>
      </Section>

      <Section padding={4}>
        <VStack gap={3}>
          <VStack gap={0.5}>
            <Heading level={2}>
              PostgreSQL Kayıtlı Kullanıcılar ve Yetki Belgeli Emlak İşletmeleri
            </Heading>
            <Text color="secondary" size="sm">
              Yeni kayıt olduğunuzda hesabınız anında PostgreSQL users ve
              agencies tablolarına eklenir.
            </Text>
          </VStack>
          <Divider />
          <Table
            data={registeredUsers}
            columns={userColumns}
            idKey="id"
            hasHover
          />
        </VStack>
      </Section>
    </VStack>
  );
}
