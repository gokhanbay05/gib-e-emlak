import { useEffect, useState } from 'react';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Section } from '@astryxdesign/core/Section';
import { Selector } from '@astryxdesign/core/Selector';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';

export interface SessionAgency {
  id: number;
  name: string;
  authorized_person: string;
  phone: string;
  mobile_phone?: string | null;
  fax?: string | null;
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

const PRESET_LOGOS = [
  {
    value: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200',
    label: 'Kurumsal Rezidans & Kule Logosu',
  },
  {
    value: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200',
    label: 'Modern Cam Plaza Ofis Logosu',
  },
  {
    value: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=200',
    label: 'Klasik Gayrimenkul & Anahtar Logosu',
  },
];

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
  const [activeTab, setActiveTab] = useState<string>('register');
  const [registerRole, setRegisterRole] = useState<'AGENT' | 'CUSTOMER'>('AGENT');

  // Ortak Kayıt Alanları
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  // Emlakçıya Özel (Farklı) Alanlar
  const [ttbsDocumentNo, setTtbsDocumentNo] = useState<string>('');
  const [officePhone, setOfficePhone] = useState<string>('');
  const [agencyName, setAgencyName] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>(PRESET_LOGOS[0].value);
  const [officeAddress, setOfficeAddress] = useState<string>('');

  // Müşteriye Özel Alan
  const [customerType, setCustomerType] = useState<string>('ALICI');

  // TTBS Doğrulama Durumu
  const [ttbsResult, setTtbsResult] = useState<TTBSVerifyResult | null>(null);
  const [isVerifyingTtbs, setIsVerifyingTtbs] = useState<boolean>(false);

  // Giriş Alanları
  const [loginEmail, setLoginEmail] = useState<string>('selim@baskentvizyon.com.tr');
  const [loginPassword, setLoginPassword] = useState<string>('123456');

  // Genel Mesaj & Kullanıcı Listesi
  const [feedback, setFeedback] = useState<{
    status: 'success' | 'error' | 'info' | 'warning';
    title: string;
    description: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registeredUsers, setRegisteredUsers] = useState<UserSession[]>([]);

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

  const handleVerifyTtbs = async (docNoToVerify?: string) => {
    const targetNo = (docNoToVerify ?? ttbsDocumentNo).trim();
    if (!targetNo) {
      setFeedback({
        status: 'warning',
        title: 'Taşınmaz Ticareti Yetki Belgesi No Boş',
        description:
          'Lütfen T.C. Ticaret Bakanlığı TTBS sorgulaması için 7 haneli belge numarasını giriniz.',
      });
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
      setFeedback({
        status: data.is_valid ? 'success' : 'error',
        title: data.is_valid
          ? 'T.C. Ticaret Bakanlığı TTBS Yetki Belgesi Doğrulandı'
          : 'Taşınmaz Ticareti Yetki Belgesi Doğrulanamadı (BR-01)',
        description: data.message,
      });
    } catch {
      setFeedback({
        status: 'error',
        title: 'TTBS Servis Bağlantı Hatası',
        description: 'Backend sunucusuna ulaşılamadı.',
      });
    } finally {
      setIsVerifyingTtbs(false);
    }
  };

  const handleFillSampleValidAgent = () => {
    setRegisterRole('AGENT');
    setFullName('Kemal Soylu');
    setEmail('kemal@ankaraemlakmerkezi.com.tr');
    setPassword('123456');
    setPhone('0532 654 32 10');
    setTtbsDocumentNo('0609412');
    setOfficePhone('0312 419 88 99');
    setAgencyName('Ankara Emlak Merkezi & Yatırım');
    setOfficeAddress('Tunalı Hilmi Cad. No:88/4 Çankaya / Ankara');
    setLogoUrl(PRESET_LOGOS[0].value);
    void handleVerifyTtbs('0609412');
  };

  const handleTestInvalidTtbs = () => {
    setRegisterRole('AGENT');
    setTtbsDocumentNo('9999999');
    void handleVerifyTtbs('9999999');
  };

  const handleRegister = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          phone,
          role: registerRole,
          ttbs_document_no: registerRole === 'AGENT' ? ttbsDocumentNo : null,
          office_phone: registerRole === 'AGENT' ? officePhone : null,
          agency_name: registerRole === 'AGENT' ? agencyName : null,
          logo_url: registerRole === 'AGENT' ? logoUrl : null,
          office_address: registerRole === 'AGENT' ? officeAddress : null,
          customer_type: registerRole === 'CUSTOMER' ? customerType : null,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        detail?: string;
        user?: UserSession;
      };

      if (!response.ok) {
        setFeedback({
          status: 'error',
          title: 'Kayıt İşlemi Engellendi (İş Kuralı Denetimi)',
          description: data.detail ?? 'Kayıt sırasında bir hata oluştu.',
        });
        return;
      }

      if (data.user) {
        onSelectSession(data.user);
      }
      setFeedback({
        status: 'success',
        title: 'Kayıt Başarıyla Oluşturuldu ve Oturum Açıldı',
        description: data.message ?? 'Hesabınız aktif edildi.',
      });
      await fetchRegisteredUsers();
      onDataChanged();
    } catch {
      setFeedback({
        status: 'error',
        title: 'Sunucu Bağlantı Hatası',
        description: 'FastAPI sunucusuna bağlanılamadı.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setIsSubmitting(true);
    setFeedback(null);
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
        detail?: string;
        user?: UserSession;
      };

      if (!response.ok || !data.user) {
        setFeedback({
          status: 'error',
          title: 'Giriş Başarısız',
          description: data.detail ?? 'E-posta veya şifre hatalı.',
        });
        return;
      }

      onSelectSession(data.user);
      setFeedback({
        status: 'success',
        title: 'Oturum Açıldı',
        description: `${data.message} Aktif Rol: ${data.user.role === 'AGENT' ? 'Emlakçı (İşletme Yetkilisi)' : 'Kayıtlı Müşteri'}`,
      });
    } catch {
      setFeedback({
        status: 'error',
        title: 'Sunucu Bağlantı Hatası',
        description: 'FastAPI sunucusuna bağlanılamadı.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      header: 'Emlak Ofisi & TTBS Belge No (BR-01)',
      renderCell: (u) =>
        u.agency ? (
          <HStack gap={1} vAlign="center" wrap="wrap">
            <Text weight="medium">{u.agency.name}</Text>
            <Token
              label={`TTBS: ${u.agency.ttbs_document_no}`}
              color="green"
              size="sm"
            />
          </HStack>
        ) : (
          <Text color="secondary">
            {u.customer
              ? `Bireysel Müşteri (${u.customer.customer_type})`
              : 'Bireysel Müşteri'}
          </Text>
        ),
    },
    {
      key: 'id',
      header: 'Hızlı Oturum Geçişi',
      renderCell: (u) => (
        <Button
          label={
            currentUser.id === u.id ? 'Aktif Oturum' : 'Bu Hesaba Geç'
          }
          variant={currentUser.id === u.id ? 'secondary' : 'primary'}
          size="sm"
          isDisabled={currentUser.id === u.id}
          onClick={() => {
            onSelectSession(u);
            setFeedback({
              status: 'info',
              title: `Aktif Hesap Değiştirildi: ${u.full_name}`,
              description:
                u.role === 'AGENT' && u.agency
                  ? `${u.agency.name} (Yetki Belge No: ${u.agency.ttbs_document_no}) olarak emlakçı panelini yönetiyorsunuz.`
                  : 'Kayıtlı müşteri oturumuna geçildi.',
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
              <HStack gap={1.5} vAlign="center">
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
                Ortak kayıt alanları (Ad/Soyad, Tekil E-posta, Şifre, Cep Tel)
                ve Emlakçıya özel alanlar (Taşınmaz Ticareti Yetki Belge No,
                Ofis Telefonu, Ofis İsmi ve Logosu).
              </Text>
            </VStack>

            <HStack gap={1.5} wrap="wrap">
              <Button
                label="Kayıt Olmadan Ziyaretçi Moduna Geç (BR-08)"
                variant={currentUser.role === 'VISITOR' ? 'primary' : 'secondary'}
                onClick={() => {
                  onSelectSession(VISITOR_SESSION);
                  setFeedback({
                    status: 'info',
                    title: 'Ziyaretçi (Girişsiz) Modu Aktif (BR-08)',
                    description:
                      'Kayıt olmadan tüm emlakçı ilanlarını görebilir ve klasik filtreleme yapabilirsiniz. Randevu alma, favorilere ekleme ve AI doğal dil arama için giriş yapılmalıdır.',
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
            onChange={(val) => setActiveTab(val)}
            hasDivider
          >
            <Tab
              value="register"
              label="Yeni Kayıt Ol (Emlakçı / Müşteri)"
            />
            <Tab
              value="login"
              label="Giriş Yap (Mevcut Hesap)"
            />
          </TabList>

          {activeTab === 'register' ? (
            <VStack gap={4}>
              <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                <HStack gap={1.5} wrap="wrap">
                  <Button
                    label="Emlakçı Kaydı (Yetki Belgeli İşletme)"
                    variant={registerRole === 'AGENT' ? 'primary' : 'secondary'}
                    onClick={() => setRegisterRole('AGENT')}
                  />
                  <Button
                    label="Müşteri Kaydı (Alıcı / Kiracı / Mülk Sahibi)"
                    variant={registerRole === 'CUSTOMER' ? 'primary' : 'secondary'}
                    onClick={() => setRegisterRole('CUSTOMER')}
                  />
                </HStack>

                {registerRole === 'AGENT' && (
                  <HStack gap={1} wrap="wrap">
                    <Button
                      label="Örnek Geçerli Emlakçı Doldur (0609412)"
                      variant="ghost"
                      size="sm"
                      onClick={handleFillSampleValidAgent}
                    />
                    <Button
                      label="Geçersiz Belge Test Et (İstisnai Senaryo)"
                      variant="ghost"
                      size="sm"
                      onClick={handleTestInvalidTtbs}
                    />
                  </HStack>
                )}
              </HStack>

              <Grid columns={{ minWidth: 320, max: 2 }} gap={4}>
                <Card padding={4}>
                  <VStack gap={3}>
                    <HStack gap={1} vAlign="center">
                      <Token label="ORTAK ALANLAR" color="blue" />
                      <Heading level={3}>
                        Temel Kullanıcı Bilgileri (Emlakçı & Müşteri Ortak)
                      </Heading>
                    </HStack>
                    <Divider />

                    <TextInput
                      label="Ad ve Soyad"
                      placeholder="Örn: Kemal Soylu"
                      value={fullName}
                      onChange={(val) => setFullName(val)}
                      isRequired
                    />

                    <TextInput
                      type="email"
                      label="E-Posta Adresi (Tek Kayıt Kuralı - BR-02)"
                      description="Her e-posta adresi ile sistemde yalnızca tek bir hesap açılabilir."
                      placeholder="ornek@eposta.com"
                      value={email}
                      onChange={(val) => setEmail(val)}
                      isRequired
                    />

                    <TextInput
                      type="password"
                      label="Şifre Oluştur"
                      placeholder="En az 4 karakterli şifre"
                      value={password}
                      onChange={(val) => setPassword(val)}
                      isRequired
                    />

                    <TextInput
                      type="tel"
                      label="Cep Telefonu Numarası"
                      placeholder="0532 000 00 00"
                      value={phone}
                      onChange={(val) => setPhone(val)}
                      isRequired
                    />

                    {registerRole === 'CUSTOMER' && (
                      <Selector
                        label="Müşteri Profil Grubu"
                        description="Arama ve randevu tercihleriniz için varsayılan müşteri grubunuz."
                        value={customerType}
                        onChange={(val) => setCustomerType(val ?? 'ALICI')}
                        options={[
                          {
                            value: 'ALICI',
                            label: 'Alıcı Müşteri (Satılık Ev Arayan)',
                          },
                          {
                            value: 'KIRACI',
                            label: 'Kiracı Müşteri (Kiralık Ev Arayan)',
                          },
                          {
                            value: 'SATICI',
                            label: 'Satıcı (Evini Satmak İsteyen Mülk Sahibi)',
                          },
                          {
                            value: 'KIRALAYAN',
                            label: 'Kiralık Mülk Sahibi (Evini Kiraya Veren)',
                          },
                        ]}
                      />
                    )}
                  </VStack>
                </Card>

                {registerRole === 'AGENT' ? (
                  <Card padding={4}>
                    <VStack gap={3}>
                      <HStack gap={1} vAlign="center">
                        <Token label="EMLAKÇIYA ÖZEL ALANLAR" color="purple" />
                        <Heading level={3}>
                          Yetki Belgesi & Emlak Ofisi Bilgileri
                        </Heading>
                      </HStack>
                      <Divider />

                      <VStack gap={1.5}>
                        <TextInput
                          label="Taşınmaz Ticareti Yetki Belgesi No (BR-01)"
                          description="T.C. Ticaret Bakanlığı TTBS üzerinden 7 haneli il kodlu belge numarası çekilerek doğrulanır."
                          placeholder="Örn: 0609412"
                          value={ttbsDocumentNo}
                          onChange={(val) => {
                            setTtbsDocumentNo(val);
                            setTtbsResult(null);
                          }}
                          status={
                            ttbsResult
                              ? {
                                  type: ttbsResult.is_valid ? 'success' : 'error',
                                  message: ttbsResult.message,
                                }
                              : undefined
                          }
                          isRequired
                        />
                        <HStack>
                          <Button
                            label="Ticaret Bakanlığı TTBS Yetki Belgesini Doğrula"
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
                        onChange={(val) => setAgencyName(val)}
                        isRequired
                      />

                      <TextInput
                        type="tel"
                        label="Emlak Ofisi Sabit Telefon No"
                        placeholder="Örn: 0312 419 88 99"
                        value={officePhone}
                        onChange={(val) => setOfficePhone(val)}
                        isRequired
                      />

                      <Selector
                        label="Emlak Ofisi Kurumsal Logosu Seçimi"
                        value={logoUrl}
                        onChange={(val) =>
                          setLogoUrl(val ?? PRESET_LOGOS[0].value)
                        }
                        options={PRESET_LOGOS}
                      />

                      <HStack gap={2} vAlign="center">
                        <Avatar
                          name={agencyName || 'Emlak Ofisi'}
                          src={logoUrl}
                          size="lg"
                          shape="rounded"
                        />
                        <TextInput
                          label="Veya Özel Ofis Logo Görsel URL"
                          placeholder="https://..."
                          value={logoUrl}
                          onChange={(val) => setLogoUrl(val)}
                        />
                      </HStack>

                      <TextInput
                        label="Emlak Ofisi Açık Adresi"
                        placeholder="Örn: Tunalı Hilmi Cad. No:88/4 Çankaya / Ankara"
                        value={officeAddress}
                        onChange={(val) => setOfficeAddress(val)}
                        isOptional
                      />
                    </VStack>
                  </Card>
                ) : (
                  <Card padding={4}>
                    <VStack gap={3}>
                      <Token label="MÜŞTERİ YETKİLERİ (BR-08)" color="teal" />
                      <Heading level={3}>
                        Kayıtlı Müşteri Avantajları vs Ziyaretçi Modu
                      </Heading>
                      <Divider />
                      <Text color="secondary">
                        • Giriş yapmadan (Ziyaretçi modunda) tüm emlakçıların
                        aktif ilanlarını görebilir ve klasik filtreleme
                        yapabilirsiniz.
                      </Text>
                      <Text color="secondary">
                        • Kayıt olup giriş yaptığınızda hayalinizdeki evi doğal
                        dille tasvir ederek Yapay Zeka (AI) Akıllı Arama
                        yapabilirsiniz.
                      </Text>
                      <Text color="secondary">
                        • Beğendiğiniz ilanları Favorilerinize ekleyebilir,
                        emlakçının müsait saatlerini görerek Fiziki veya Telefon
                        randevusu alabilirsiniz.
                      </Text>
                      <Text color="secondary">
                        • Evinizi satmak veya kiraya vermek istediğinizde yetki
                        belgeli emlak ofislerini listeleyip başvuru
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
                    onChange={(val) => setLoginEmail(val)}
                    isRequired
                  />
                  <TextInput
                    type="password"
                    label="Şifre"
                    value={loginPassword}
                    onChange={(val) => setLoginPassword(val)}
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
                      }}
                    />
                    <Button
                      label="Emlakçı 2: Ayşe Demirci (Boğaziçi Prestij - TTBS: 3401925)"
                      variant="secondary"
                      onClick={() => {
                        setLoginEmail('ayse@bogaziciprestij.com.tr');
                        setLoginPassword('123456');
                      }}
                    />
                    <Button
                      label="Kayıtlı Müşteri: Zeynep Kaya (Kiralık Arayan Kiracı)"
                      variant="secondary"
                      onClick={() => {
                        setLoginEmail('zeynep.kaya@ornekmail.com');
                        setLoginPassword('123456');
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
              agencies tablolarına eklenir. Tablodan tek tıkla aktif oturumu
              değiştirebilirsiniz.
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
