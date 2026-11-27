import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Home,
  MapPin,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  createAgencySellRequest,
  fetchAgencies,
} from '../api/agencies';
import {
  fetchDistricts,
  fetchNeighborhoods,
  fetchProvinces,
} from '../api/locations';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Select,
} from '../components/core';
import { PageContainer } from '../components/layout';
import { formatPriceTL } from '../lib/utils';
import type {
  AgencyRecord,
  ListingType,
  LocationOption,
  PropertyType,
  UserSession,
} from '../types';
import {
  formatDigitsOnly,
  formatListingTypeLabel,
  formatPropertyTypeLabel,
  formatTurkishPhone,
  sanitizeNameInput,
} from '../utils/formatters';

export interface SellRequestPageProps {
  session: UserSession;
  onSuccess: (msg: string) => void;
}

const STEPS = [
  { step: 1, title: '1. Emlak Ofisi Seçimi' },
  { step: 2, title: '2. İşlem & Gayrimenkul Türü' },
  { step: 3, title: '3. Konum & Teknik Özellikler' },
  { step: 4, title: '4. İletişim & Başvuru Onayı' },
];

/**
 * 720px ortalanmış, 4 kısa ve odaklı adıma bölünmüş "Evini Sat / Kiraya Ver" sihirbazı.
 */
export function SellRequestPage({
  session,
  onSuccess,
}: SellRequestPageProps) {
  const [step, setStep] = useState(1);
  const [agencies, setAgencies] = useState<AgencyRecord[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number>(1);

  // Adım 2: İşlem & Tür
  const [listingType, setListingType] = useState<ListingType>('SATILIK');
  const [propertyType, setPropertyType] = useState<PropertyType>('DAIRE');
  const [roomCount, setRoomCount] = useState('3+1');

  // Adım 3: Konum, Alan & Fiyat
  const [city, setCity] = useState('Ankara');
  const [district, setDistrict] = useState('Çankaya');
  const [neighborhood, setNeighborhood] = useState('Ayrancı Mah.');
  const [addressDetail, setAddressDetail] = useState('');
  const [grossSqm, setGrossSqm] = useState('135');
  const [expectedPrice, setExpectedPrice] = useState('5450000');

  // Adım 4: İletişim & Onay
  const nameParts =
    session.role !== 'VISITOR' ? session.full_name.split(' ') : [];
  const [firstName, setFirstName] = useState(nameParts[0] ?? '');
  const [lastName, setLastName] = useState(
    nameParts.slice(1).join(' ') || '',
  );
  const [phone, setPhone] = useState(
    session.role !== 'VISITOR' ? session.phone : '',
  );
  const [email, setEmail] = useState(
    session.role !== 'VISITOR' ? session.email : '',
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);

  useEffect(() => {
    void fetchAgencies()
      .then((res) => {
        setAgencies(res.agencies);
        if (res.agencies[0]) setSelectedAgencyId(res.agencies[0].id);
      })
      .catch(() => {});
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

  const selectedAgency =
    agencies.find((a) => a.id === selectedAgencyId) ?? agencies[0];

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('Lütfen ad, soyad ve cep telefonu bilgilerinizi eksiksiz giriniz.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await createAgencySellRequest(selectedAgencyId, {
        owner_first_name: firstName.trim(),
        owner_last_name: lastName.trim(),
        mobile_phone: phone.trim(),
        email: email.trim() || undefined,
        listing_type: listingType,
        property_type: propertyType,
        room_count: roomCount,
        gross_sqm: Number(grossSqm) || 120,
        expected_price: Number(expectedPrice) || 1000000,
        city,
        district,
        neighborhood,
        address_detail: addressDetail.trim() || undefined,
        property_notes: notes.trim() || undefined,
      });
      onSuccess(
        `${res.message} (Takip No: ${res.sell_request.reference_no})`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Başvuru gönderilemedi.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer size="medium" title="Evini Sat veya Kiraya Ver">
      {/* 4 Adımlı İlerleme Çubuğu */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        {STEPS.map((s) => {
          const active = s.step === step;
          const done = s.step < step;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => {
                if (s.step <= step) setStep(s.step);
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                border: active
                  ? '1.5px solid var(--color-primary)'
                  : '1px solid var(--color-border-default)',
                backgroundColor: active
                  ? 'var(--color-primary-soft)'
                  : done
                    ? 'var(--color-success-bg)'
                    : 'var(--color-bg-surface)',
                color: active
                  ? 'var(--color-primary)'
                  : done
                    ? 'var(--color-success-text)'
                    : 'var(--color-text-muted)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: s.step <= step ? 'pointer' : 'default',
                textAlign: 'left',
              }}
            >
              {s.title}
            </button>
          );
        })}
      </div>

      <Card padding="lg">
        {/* Adım 1: Yetkili Emlak Ofisi Seçimi */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
              Gayrimenkulünüz İçin Yetki Vereceğiniz Emlak Ofisini Seçin
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {agencies.map((ag) => {
                const isSelected = ag.id === selectedAgencyId;
                return (
                  <div
                    key={ag.id}
                    onClick={() => setSelectedAgencyId(ag.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      border: isSelected
                        ? '2px solid var(--color-primary)'
                        : '1px solid var(--color-border-default)',
                      backgroundColor: isSelected
                        ? 'var(--color-primary-soft)'
                        : 'var(--color-bg-surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <Avatar
                        src={ag.logo_url}
                        name={ag.name}
                        size="lg"
                        shape="rounded"
                      />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '15px' }}>
                          {ag.name}
                        </div>
                        <div
                          style={{
                            fontSize: '12.5px',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {ag.district} / {ag.city} • Yetkili:{' '}
                          {ag.authorized_person}
                        </div>
                        <div style={{ marginTop: '4px' }}>
                          <Badge
                            variant="verified"
                            icon={<ShieldCheck size={12} />}
                          >
                            TTBS Belge No: {ag.ttbs_document_no}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 size={22} color="var(--color-primary)" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Adım 2: İşlem & Gayrimenkul Türü */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
              İşlem Türü ve Gayrimenkul Kategorisi
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              {(['SATILIK', 'KIRALIK'] as ListingType[]).map((tx) => (
                <button
                  key={tx}
                  type="button"
                  onClick={() => setListingType(tx)}
                  style={{
                    padding: '18px',
                    borderRadius: '14px',
                    border:
                      listingType === tx
                        ? '2px solid var(--color-primary)'
                        : '1px solid var(--color-border-default)',
                    backgroundColor:
                      listingType === tx
                        ? 'var(--color-primary-soft)'
                        : 'var(--color-bg-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Home
                    size={22}
                    color={
                      listingType === tx
                        ? 'var(--color-primary)'
                        : 'var(--color-text-muted)'
                    }
                  />
                  <span style={{ fontWeight: 800, fontSize: '15px' }}>
                    {tx === 'SATILIK'
                      ? 'Evimi Satmak İstiyorum'
                      : 'Kiraya Vermek İstiyorum'}
                  </span>
                </button>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
              }}
            >
              <Select
                label="Gayrimenkul Tipi"
                value={propertyType}
                onChange={(v) => setPropertyType(v as PropertyType)}
                options={[
                  { value: 'DAIRE', label: 'Konut / Daire' },
                  { value: 'VILLA', label: 'Müstakil Ev / Villa' },
                  { value: 'ISYERI', label: 'Ticari Ofis / İşyeri' },
                  { value: 'ARSA', label: 'Arsa / Arazi' },
                ]}
              />

              <Select
                label="Oda Sayısı"
                value={roomCount}
                onChange={setRoomCount}
                options={['1+0', '1+1', '2+1', '3+1', '4+1', '5+1'].map(
                  (r) => ({ value: r, label: r }),
                )}
              />
            </div>
          </div>
        )}

        {/* Adım 3: Konum, Alan & Fiyat */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
              Konum, Metrekare ve Beklenen Fiyat
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
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
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
              }}
            >
              <Input
                label="Brüt Kullanım Alanı (m²)"
                value={grossSqm}
                onChange={(e) =>
                  setGrossSqm(formatDigitsOnly(e.target.value, 5))
                }
                placeholder="Örn: 135"
              />
              <Input
                label={
                  listingType === 'SATILIK'
                    ? 'Beklenen Satış Fiyatı (TL)'
                    : 'Beklenen Aylık Kira (TL)'
                }
                value={expectedPrice}
                onChange={(e) =>
                  setExpectedPrice(formatDigitsOnly(e.target.value, 10))
                }
                placeholder="Örn: 5450000"
              />
            </div>

            <Input
              label="Açık Adres / Site Adı (Opsiyonel)"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              icon={<MapPin size={15} />}
              placeholder="Örn: Hoşdere Cad. Çamlık Apt. No:14"
            />
          </div>
        )}

        {/* Adım 4: İletişim & Başvuru Onayı */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
              Mülk Sahibi İletişim Bilgileri ve Özet Onayı
            </h3>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-bg-surface-alt)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>
                  {formatListingTypeLabel(listingType)}{' '}
                  {formatPropertyTypeLabel(propertyType)} • {roomCount} (
                  {grossSqm} m²)
                </div>
                <div
                  style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}
                >
                  {neighborhood}, {district} / {city} →{' '}
                  <strong>{selectedAgency?.name}</strong>
                </div>
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--color-primary)',
                }}
              >
                {formatPriceTL(Number(expectedPrice))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              <Input
                label="Mülk Sahibi Adı"
                value={firstName}
                onChange={(e) =>
                  setFirstName(sanitizeNameInput(e.target.value))
                }
              />
              <Input
                label="Mülk Sahibi Soyadı"
                value={lastName}
                onChange={(e) =>
                  setLastName(sanitizeNameInput(e.target.value))
                }
              />
              <Input
                label="Cep Telefonu"
                value={phone}
                onChange={(e) =>
                  setPhone(formatTurkishPhone(e.target.value))
                }
              />
              <Input
                label="E-Posta Adresi (Opsiyonel)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Input
              label="Emlak Danışmanına Notunuz"
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Taşınmazın durumu, ekspertiz veya uygun ziyaret saatleri..."
            />

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger-text)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}
          </div>
        )}

        {/* Alt Gezinme Butonları */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border-default)',
          }}
        >
          {step > 1 ? (
            <Button
              variant="outline"
              pill
              leftIcon={<ArrowLeft size={15} />}
              onClick={() => setStep((s) => s - 1)}
            >
              Önceki Adım
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              variant="primary"
              pill
              rightIcon={<ArrowRight size={15} />}
              onClick={() => setStep((s) => s + 1)}
            >
              Devam Et
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              pill
              leftIcon={<UserCheck size={16} />}
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? 'Gönderiliyor...' : 'Satış / Kiralama Başvurusunu Gönder'}
            </Button>
          )}
        </div>
      </Card>
    </PageContainer>
  );
}

export default SellRequestPage;
