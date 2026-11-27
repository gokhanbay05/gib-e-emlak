import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  loginAccount,
  registerAccount,
  verifyTtbsDocument,
} from '../api/auth';
import {
  fetchDistricts,
  fetchNeighborhoods,
  fetchProvinces,
} from '../api/locations';
import { Badge, Button, Card, Input, Select, Tabs } from '../components/core';
import { PageContainer } from '../components/layout';
import type { AuthTabKey } from '../lib/router';
import type { LocationOption, TTBSVerifyResult, UserSession } from '../types';
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

export interface AuthPageProps {
  initialTab?: AuthTabKey;
  authPromptMessage?: string | null;
  onLoginSuccess: (user: UserSession) => void;
}

/**
 * Hepsiemlak Screenshot #11 (giris.hepsiemlak.com) birebir ortalanmış,
 * sade ve kompakt Üye Girişi / Kayıt Ekranı.
 */
export function AuthPage({
  initialTab = 'login',
  authPromptMessage,
  onLoginSuccess,
}: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<AuthTabKey>(initialTab);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Giriş
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Kayıt Ortak
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // Kurumsal Emlak Ofisi Kaydı
  const [ttbsNo, setTtbsNo] = useState('0609412');
  const [agencyName, setAgencyName] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [city, setCity] = useState('Ankara');
  const [district, setDistrict] = useState('Çankaya');
  const [neighborhood, setNeighborhood] = useState('Kızılırmak Mah.');
  const [addressDetail, setAddressDetail] = useState('');
  const [ttbsVerification, setTtbsVerification] =
    useState<TTBSVerifyResult | null>(null);

  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    void fetchProvinces()
      .then((res) => setProvinces(res.provinces))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const found = provinces.find((p) => p.name === city);
    if (!found) return;
    void fetchDistricts(found.id)
      .then((res) => setDistricts(res.districts))
      .catch(() => {});
  }, [city, provinces]);

  useEffect(() => {
    const found = districts.find((d) => d.name === district);
    if (!found) return;
    void fetchNeighborhoods(found.id)
      .then((res) => setNeighborhoods(res.neighborhoods))
      .catch(() => {});
  }, [district, districts]);

  const handleLogin = async (emailOverride?: string, passOverride?: string) => {
    const email = (emailOverride ?? loginEmail).trim();
    const password = passOverride ?? loginPassword;
    setFieldErrors({});
    setStatusMessage(null);

    const parsed = loginSchema.safeParse({
      login_email: email,
      login_password: password,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorsToMap(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const res = await loginAccount(email, password);
      onLoginSuccess(res.user);
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Giriş yapılamadı.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyTtbs = async () => {
    setStatusMessage(null);
    try {
      const res = await verifyTtbsDocument(ttbsNo, agencyName);
      setTtbsVerification(res);
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'TTBS doğrulaması yapılamadı.',
      );
    }
  };

  const handleRegister = async (role: 'CUSTOMER' | 'AGENT') => {
    setFieldErrors({});
    setStatusMessage(null);

    if (role === 'CUSTOMER') {
      const parsed = registerCustomerSchema.safeParse({
        first_name: firstName,
        last_name: lastName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
      });
      if (!parsed.success) {
        setFieldErrors(zodErrorsToMap(parsed.error));
        return;
      }
    } else {
      const parsed = registerAgentSchema.safeParse({
        first_name: firstName,
        last_name: lastName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        ttbs_document_no: ttbsNo,
        agency_name: agencyName,
        office_phone: officePhone,
        city,
        district,
        neighborhood,
        address_detail: addressDetail,
      });
      if (!parsed.success) {
        setFieldErrors(zodErrorsToMap(parsed.error));
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await registerAccount({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone: regPhone.trim(),
        role,
        ...(role === 'AGENT'
          ? {
              ttbs_document_no: ttbsNo.trim(),
              agency_name: agencyName.trim(),
              office_phone: officePhone.trim(),
              city,
              district,
              neighborhood,
              address_detail: addressDetail.trim(),
            }
          : {}),
      });
      onLoginSuccess(res.user);
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Kayıt işlemi başarısız.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isWideCorporate = activeTab === 'register-agent';

  return (
    <PageContainer size={isWideCorporate ? 'medium' : 'narrow'}>
      <Card padding="lg" variant="elevated">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: '0 0 6px', fontSize: '23px', fontWeight: 800 }}>
              {activeTab === 'login'
                ? 'Üye Girişi'
                : activeTab === 'register-customer'
                  ? 'Bireysel Üyelik Oluştur'
                  : 'Kurumsal Emlak Ofisi Üyeliği'}
            </h1>
            {authPromptMessage && (
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  marginTop: '4px',
                }}
              >
                {authPromptMessage}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Tabs
              variant="segmented"
              value={activeTab}
              onChange={(v) => {
                setActiveTab(v as AuthTabKey);
                setFieldErrors({});
                setStatusMessage(null);
              }}
              items={[
                { value: 'login', label: 'Üye Girişi' },
                { value: 'register-customer', label: 'Bireysel Üye Ol' },
                { value: 'register-agent', label: 'Kurumsal Ofis' },
              ]}
            />
          </div>

          {statusMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-danger-bg)',
                color: 'var(--color-danger-text)',
                fontSize: '12.5px',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {statusMessage}
            </div>
          )}

          {activeTab === 'login' && (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <Input
                  label="E-Posta Adresi"
                  type="email"
                  inputSize="lg"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  icon={<Mail size={16} />}
                  placeholder="ornek@eposta.com"
                  error={fieldErrors.login_email}
                />

                <Input
                  label="Şifre"
                  type="password"
                  inputSize="lg"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  icon={<Lock size={16} />}
                  placeholder="••••••••"
                  error={fieldErrors.login_password}
                />

                <Button
                  variant="primary"
                  size="lg"
                  pill
                  fullWidth
                  disabled={submitting}
                  onClick={() => void handleLogin()}
                >
                  {submitting ? 'Giriş Yapılıyor...' : 'Üye Girişi Yap'}
                </Button>
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: '13px',
                  color: 'var(--color-text-body)',
                  marginTop: '6px',
                }}
              >
                Üye Değil misiniz? Hızlıca{' '}
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveTab('register-customer')}
                >
                  Üye Olun
                </button>
              </div>
            </>
          )}

          {activeTab === 'register-customer' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '13px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
                  gap: '10px',
                }}
              >
                <Input
                  label="Adınız"
                  value={firstName}
                  onChange={(e) =>
                    setFirstName(sanitizeNameInput(e.target.value))
                  }
                  error={fieldErrors.first_name}
                  placeholder="Ad"
                />
                <Input
                  label="Soyadınız"
                  value={lastName}
                  onChange={(e) =>
                    setLastName(sanitizeNameInput(e.target.value))
                  }
                  error={fieldErrors.last_name}
                  placeholder="Soyad"
                />
              </div>

              <Input
                label="E-Posta Adresi"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                icon={<Mail size={15} />}
                error={fieldErrors.email}
                placeholder="eposta@ornek.com"
              />

              <Input
                label="Cep Telefonu"
                value={regPhone}
                onChange={(e) =>
                  setRegPhone(formatTurkishPhone(e.target.value))
                }
                icon={<Phone size={15} />}
                error={fieldErrors.phone}
                placeholder="0 (532) 123 45 67"
              />

              <Input
                label="Şifre (En az 8 karakter, harf, rakam ve sembol)"
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                icon={<Lock size={15} />}
                error={fieldErrors.password}
                placeholder="Güçlü şifre belirleyin"
              />

              <Button
                variant="primary"
                size="lg"
                pill
                fullWidth
                disabled={submitting}
                onClick={() => void handleRegister('CUSTOMER')}
              >
                {submitting ? 'Kaydediliyor...' : 'Bireysel Üyeliği Tamamla'}
              </Button>
            </div>
          )}

          {activeTab === 'register-agent' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-bg-surface-alt)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <Input
                    label="Taşınmaz Ticareti Yetki Belge No (7 Hane)"
                    value={ttbsNo}
                    onChange={(e) =>
                      setTtbsNo(formatDigitsOnly(e.target.value, 7))
                    }
                    icon={<ShieldCheck size={15} />}
                    error={fieldErrors.ttbs_document_no}
                    placeholder="Örn: 0609412"
                  />
                </div>
                <div style={{ alignSelf: 'flex-end' }}>
                  <Button
                    variant="outline-primary"
                    pill
                    onClick={() => void handleVerifyTtbs()}
                  >
                    Belgeyi Doğrula
                  </Button>
                </div>
              </div>

              {ttbsVerification && (
                <Badge
                  variant={ttbsVerification.is_valid ? 'success' : 'danger'}
                  icon={<CheckCircle2 size={13} />}
                >
                  {ttbsVerification.message}
                </Badge>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
                  gap: '12px',
                }}
              >
                <Input
                  label="Emlak İşletmesi Ünvanı"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  error={fieldErrors.agency_name}
                  placeholder="Örn: Başkent Vizyon Gayrimenkul"
                />
                <Input
                  label="Ofis Sabit Telefonu"
                  value={officePhone}
                  onChange={(e) =>
                    setOfficePhone(formatTurkishPhone(e.target.value))
                  }
                  error={fieldErrors.office_phone}
                  placeholder="0 (312) 419 88 99"
                />
                <Input
                  label="Yetkili Adı"
                  value={firstName}
                  onChange={(e) =>
                    setFirstName(sanitizeNameInput(e.target.value))
                  }
                  error={fieldErrors.first_name}
                />
                <Input
                  label="Yetkili Soyadı"
                  value={lastName}
                  onChange={(e) =>
                    setLastName(sanitizeNameInput(e.target.value))
                  }
                  error={fieldErrors.last_name}
                />
                <Input
                  label="Kurumsal E-Posta"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  error={fieldErrors.email}
                />
                <Input
                  label="Yetkili Cep Telefonu"
                  value={regPhone}
                  onChange={(e) =>
                    setRegPhone(formatTurkishPhone(e.target.value))
                  }
                  error={fieldErrors.phone}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
                  gap: '10px',
                }}
              >
                <Select
                  label="İl"
                  value={city}
                  onChange={setCity}
                  options={provinces.map((p) => ({
                    value: p.name,
                    label: p.name,
                  }))}
                />
                <Select
                  label="İlçe"
                  value={district}
                  onChange={setDistrict}
                  options={districts.map((d) => ({
                    value: d.name,
                    label: d.name,
                  }))}
                />
                <Select
                  label="Mahalle"
                  value={neighborhood}
                  onChange={setNeighborhood}
                  options={neighborhoods.map((n) => ({
                    value: n.name,
                    label: n.name,
                  }))}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
                  gap: '12px',
                }}
              >
                <Input
                  label="Açık Adres"
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                  error={fieldErrors.address_detail}
                  placeholder="Cadde, Sokak, Plaza No"
                />
                <Input
                  label="Şifre"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  error={fieldErrors.password}
                  placeholder="En az 8 karakter"
                />
              </div>

              <Button
                variant="primary"
                size="lg"
                pill
                fullWidth
                disabled={submitting}
                onClick={() => void handleRegister('AGENT')}
              >
                {submitting
                  ? 'Kurumsal Hesap Açılıyor...'
                  : 'Kurumsal Emlak Ofisi Kaydını Tamamla'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </PageContainer>
  );
}

export default AuthPage;
