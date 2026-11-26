import { useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack } from '@astryxdesign/core/VStack';
import {
  loginAccount,
  registerAccount,
  verifyTtbsDocument,
} from '../api/auth';
import { ApiError } from '../api/client';
import { LocationPicker } from '../components/common/LocationPicker';
import { LogoUploader } from '../components/common/LogoUploader';
import type { TTBSVerifyResult, UserSession } from '../types';
import {
  formatDigitsOnly,
  formatTurkishPhone,
  sanitizeNameInput,
} from '../utils/formatters';
import {
  loginSchema,
  registerAgentSchema,
  registerCustomerSchema,
  zodErrorsToMap,
} from '../utils/validation';

interface AuthPageProps {
  onAuthenticated: (session: UserSession) => void;
  onContinueAsVisitor: () => void;
}

/**
 * Uygulamanın açılış giriş/kayıt ekranı.
 * Yan menü olmadan tam ekran, sade ve rol bazlı yönlendirmeli olarak çalışır.
 */
export function AuthPage({
  onAuthenticated,
  onContinueAsVisitor,
}: AuthPageProps) {
  const showToast = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [registerRole, setRegisterRole] = useState<'AGENT' | 'CUSTOMER'>('AGENT');

  // Giriş alanları
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Ortak kayıt alanları
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Emlakçıya özel kayıt alanları
  const [ttbsDocumentNo, setTtbsDocumentNo] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);

  const [ttbsResult, setTtbsResult] = useState<TTBSVerifyResult | null>(null);
  const [isVerifyingTtbs, setIsVerifyingTtbs] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleVerifyTtbs = async () => {
    const cleaned = formatDigitsOnly(ttbsDocumentNo, 7);
    if (cleaned.length !== 7) {
      const err = 'Yetki Belgesi numarası 7 haneli sayısal olmalıdır (Örn: 0609412).';
      setFieldErrors((prev) => ({ ...prev, ttbs_document_no: err }));
      showToast({ body: err, type: 'error' });
      return;
    }

    setIsVerifyingTtbs(true);
    try {
      const res = await verifyTtbsDocument(cleaned, agencyName);
      setTtbsResult(res);
      if (res.is_valid) {
        clearError('ttbs_document_no');
        showToast({ body: res.message, type: 'info' });
      } else {
        setFieldErrors((prev) => ({ ...prev, ttbs_document_no: res.message }));
        showToast({ body: res.message, type: 'error' });
      }
    } catch {
      showToast({ body: 'Belge doğrulama servisine ulaşılamadı.', type: 'error' });
    } finally {
      setIsVerifyingTtbs(false);
    }
  };

  const performLogin = async (emailVal: string, passwordVal: string) => {
    const parsed = loginSchema.safeParse({
      login_email: emailVal,
      login_password: passwordVal,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorsToMap(parsed.error));
      showToast({
        body: 'E-posta ve şifre alanlarını kontrol ediniz.',
        type: 'error',
      });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const res = await loginAccount(emailVal, passwordVal);
      showToast({ body: res.message, type: 'info' });
      onAuthenticated(res.user);
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

  const handleRegister = async () => {
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
            city,
            district,
            neighborhood,
            address_detail: addressDetail,
          }
        : {
            first_name: firstName,
            last_name: lastName,
            email,
            password,
            phone,
          };

    const parsed =
      registerRole === 'AGENT'
        ? registerAgentSchema.safeParse(payload)
        : registerCustomerSchema.safeParse(payload);

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
    setIsSubmitting(true);
    try {
      const res = await registerAccount({
        ...payload,
        role: registerRole,
        logo_url: registerRole === 'AGENT' ? uploadedLogoUrl : null,
      });
      showToast({ body: res.message, type: 'info' });
      onAuthenticated(res.user);
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

  return (
    <AppShell
      contentPadding={0}
      variant="surface"
      topNav={
        <TopNav
          heading={<Text weight="bold">GİB e-Emlak</Text>}
          endContent={
            <Button
              label="Giriş Yapmadan İlanlara Göz At"
              variant="secondary"
              size="sm"
              onClick={onContinueAsVisitor}
            />
          }
        />
      }
    >
      <Layout
        contentWidth={activeTab === 'login' ? 520 : 920}
        padding={4}
        content={
          <LayoutContent>
            <VStack gap={5}>
              <VStack gap={1}>
                <Heading level={1}>GİB e-Emlak Platformuna Hoş Geldiniz</Heading>
                <Text color="secondary">
                  Emlak işletmesi paneline veya bireysel müşteri portalına
                  erişmek için giriş yapın ya da yeni hesap oluşturun.
                </Text>
              </VStack>

              <TabList
                value={activeTab}
                onChange={(val) => {
                  setActiveTab(val as 'login' | 'register');
                  setFieldErrors({});
                }}
                hasDivider
              >
                <Tab value="login" label="Giriş Yap" />
                <Tab value="register" label="Yeni Kayıt Ol" />
              </TabList>

              {activeTab === 'login' ? (
                <VStack gap={4}>
                  <Card padding={4}>
                    <VStack gap={3}>
                      <TextInput
                        type="email"
                        label="E-Posta Adresi *"
                        placeholder="ornek@eposta.com"
                        value={loginEmail}
                        onChange={(val) => {
                          setLoginEmail(val);
                          clearError('login_email');
                        }}
                        status={
                          fieldErrors.login_email
                            ? { type: 'error', message: fieldErrors.login_email }
                            : undefined
                        }
                        width="100%"
                      />
                      <TextInput
                        type="password"
                        label="Şifre *"
                        placeholder="Şifreniz"
                        value={loginPassword}
                        onChange={(val) => {
                          setLoginPassword(val);
                          clearError('login_password');
                        }}
                        onEnter={() => void performLogin(loginEmail, loginPassword)}
                        status={
                          fieldErrors.login_password
                            ? {
                                type: 'error',
                                message: fieldErrors.login_password,
                              }
                            : undefined
                        }
                        width="100%"
                      />
                      <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                        <Text color="secondary" size="sm">
                          * işaretli alanlar zorunludur.
                        </Text>
                        <Button
                          label="Giriş Yap"
                          variant="primary"
                          isLoading={isSubmitting}
                          onClick={() => void performLogin(loginEmail, loginPassword)}
                        />
                      </HStack>
                    </VStack>
                  </Card>

                  <VStack gap={2}>
                    <Text color="secondary" size="sm" weight="medium">
                      Hızlı Demo Girişi
                    </Text>
                    <Grid columns={{ minWidth: 200, max: 3 }} gap={2}>
                      <Button
                        label="Emlakçı (Ankara)"
                        variant="secondary"
                        size="sm"
                        isLoading={isSubmitting}
                        onClick={() =>
                          void performLogin('selim@baskentvizyon.com.tr', '123456')
                        }
                      />
                      <Button
                        label="Emlakçı (İstanbul)"
                        variant="secondary"
                        size="sm"
                        isLoading={isSubmitting}
                        onClick={() =>
                          void performLogin('ayse@bogaziciprestij.com.tr', '123456')
                        }
                      />
                      <Button
                        label="Müşteri (Zeynep Kaya)"
                        variant="secondary"
                        size="sm"
                        isLoading={isSubmitting}
                        onClick={() =>
                          void performLogin('zeynep.kaya@ornekmail.com', '123456')
                        }
                      />
                    </Grid>
                  </VStack>
                </VStack>
              ) : (
                <VStack gap={4}>
                  <HStack gap={1.5} wrap="wrap">
                    <Button
                      label="Emlakçı Kaydı"
                      variant={registerRole === 'AGENT' ? 'primary' : 'secondary'}
                      onClick={() => {
                        setRegisterRole('AGENT');
                        setFieldErrors({});
                      }}
                    />
                    <Button
                      label="Müşteri Kaydı"
                      variant={
                        registerRole === 'CUSTOMER' ? 'primary' : 'secondary'
                      }
                      onClick={() => {
                        setRegisterRole('CUSTOMER');
                        setFieldErrors({});
                      }}
                    />
                  </HStack>

                  <Grid columns={{ minWidth: 280, max: 2 }} gap={4}>
                    <Card padding={4}>
                      <VStack gap={3}>
                        <Heading level={3}>Kişisel Bilgiler</Heading>
                        <Divider />

                        <Grid columns={{ minWidth: 140, max: 2 }} gap={2}>
                          <TextInput
                            label="Ad *"
                            placeholder="Örn: Kemal"
                            value={firstName}
                            onChange={(val) => {
                              setFirstName(sanitizeNameInput(val));
                              clearError('first_name');
                            }}
                            status={
                              fieldErrors.first_name
                                ? {
                                    type: 'error',
                                    message: fieldErrors.first_name,
                                  }
                                : undefined
                            }
                            width="100%"
                          />
                          <TextInput
                            label="Soyad *"
                            placeholder="Örn: Soylu"
                            value={lastName}
                            onChange={(val) => {
                              setLastName(sanitizeNameInput(val));
                              clearError('last_name');
                            }}
                            status={
                              fieldErrors.last_name
                                ? {
                                    type: 'error',
                                    message: fieldErrors.last_name,
                                  }
                                : undefined
                            }
                            width="100%"
                          />
                        </Grid>

                        <TextInput
                          type="email"
                          label="E-Posta Adresi *"
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
                          type="password"
                          label="Şifre *"
                          description="En az 8 karakter; harf, rakam ve sembol (!@#.) içermelidir."
                          placeholder="Güçlü şifre oluşturun"
                          value={password}
                          onChange={(val) => {
                            setPassword(val);
                            clearError('password');
                          }}
                          status={
                            fieldErrors.password
                              ? { type: 'error', message: fieldErrors.password }
                              : undefined
                          }
                          width="100%"
                        />

                        <TextInput
                          type="tel"
                          inputMode="tel"
                          label="Cep Telefonu *"
                          placeholder="0 (532) 123 45 67"
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
                      </VStack>
                    </Card>

                    {registerRole === 'AGENT' ? (
                      <Card padding={4}>
                        <VStack gap={3}>
                          <Heading level={3}>Emlak Ofisi Bilgileri</Heading>
                          <Divider />

                          <VStack gap={1.5}>
                            <TextInput
                              inputMode="numeric"
                              label="Taşınmaz Ticareti Yetki Belge No *"
                              description="Ticaret Bakanlığı 7 haneli il kodlu belge numarası (Örn: 0609412)."
                              placeholder="0609412"
                              value={ttbsDocumentNo}
                              onChange={(val) => {
                                setTtbsDocumentNo(formatDigitsOnly(val, 7));
                                setTtbsResult(null);
                                clearError('ttbs_document_no');
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
                              width="100%"
                            />
                            <HStack>
                              <Button
                                label="Belgeyi Doğrula"
                                variant="secondary"
                                size="sm"
                                isLoading={isVerifyingTtbs}
                                onClick={() => void handleVerifyTtbs()}
                              />
                            </HStack>
                          </VStack>

                          <TextInput
                            label="Emlak Ofisi İsmi *"
                            placeholder="Örn: Ankara Emlak Merkezi"
                            value={agencyName}
                            onChange={(val) => {
                              setAgencyName(val);
                              clearError('agency_name');
                            }}
                            status={
                              fieldErrors.agency_name
                                ? {
                                    type: 'error',
                                    message: fieldErrors.agency_name,
                                  }
                                : undefined
                            }
                            width="100%"
                          />

                          <TextInput
                            type="tel"
                            inputMode="tel"
                            label="Ofis Sabit Telefonu *"
                            placeholder="0 (312) 419 88 99"
                            value={officePhone}
                            onChange={(val) => {
                              setOfficePhone(formatTurkishPhone(val));
                              clearError('office_phone');
                            }}
                            status={
                              fieldErrors.office_phone
                                ? {
                                    type: 'error',
                                    message: fieldErrors.office_phone,
                                  }
                                : undefined
                            }
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
                            placeholder="Cadde, sokak ve kapı numarası"
                            value={addressDetail}
                            onChange={(val) => {
                              setAddressDetail(val);
                              clearError('address_detail');
                            }}
                            status={
                              fieldErrors.address_detail
                                ? {
                                    type: 'error',
                                    message: fieldErrors.address_detail,
                                  }
                                : undefined
                            }
                            width="100%"
                          />

                          <LogoUploader
                            currentLogoUrl={uploadedLogoUrl}
                            onUploaded={(url) => setUploadedLogoUrl(url)}
                          />
                        </VStack>
                      </Card>
                    ) : (
                      <Card padding={4}>
                        <VStack gap={2}>
                          <Heading level={3}>Bireysel Üyelik</Heading>
                          <Divider />
                          <Text color="secondary">
                            Kayıt olduktan sonra tüm ilanları filtreleyebilir,
                            doğal dille akıllı arama yapabilir, favori listenizi
                            oluşturabilir ve emlakçılardan fiziki veya telefon
                            randevusu alabilirsiniz.
                          </Text>
                        </VStack>
                      </Card>
                    )}
                  </Grid>

                  <HStack justify="between" vAlign="center" wrap="wrap" gap={2}>
                    <Text color="secondary" size="sm">
                      * işaretli alanlar zorunludur.
                    </Text>
                    <Button
                      label="Kaydı Tamamla"
                      variant="primary"
                      isLoading={isSubmitting}
                      onClick={() => void handleRegister()}
                    />
                  </HStack>
                </VStack>
              )}
            </VStack>
          </LayoutContent>
        }
      />
    </AppShell>
  );
}
