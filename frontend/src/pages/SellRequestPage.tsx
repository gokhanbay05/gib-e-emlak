import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  Home,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  UserCheck,
} from 'lucide-react';
import {
  createAgencySellRequest,
  fetchAgencies,
} from '../api/agencies';
import { verifyTcIdentity } from '../api/engagement';
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
  Modal,
  Select,
} from '../components/core';
import { PageContainer } from '../components/layout';
import { getAdvisorsForAgency } from '../lib/advisors';
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
  normalizeTurkish,
  sanitizeNameInput,
} from '../utils/formatters';
import { isValidTcIdentityNo } from '../utils/validation';

export interface SellRequestPageProps {
  session: UserSession;
  onInspectAgency?: (agencyId: number) => void;
  onSuccess: (msg: string) => void;
}

const STEPS = [
  { step: 1, title: '1. Emlak Ofisi Seçimi' },
  { step: 2, title: '2. İşlem & Gayrimenkul Türü' },
  { step: 3, title: '3. Konum & Teknik Özellikler' },
  { step: 4, title: '4. Kimlik, İletişim & Onay' },
];

/**
 * Madde 1 + T.C. Kimlik Doğrulaması:
 * - Adım 1'de emlak ofisi arama, il/ilçe filtreleme ve "Ofisi İncele" detay modalı bulunur.
 * - Adım 4'te mülk sahibinden 11 haneli T.C. Kimlik Numarası zorunlu alınır ve NVİ ile doğrulanır.
 */
export function SellRequestPage({
  session,
  onInspectAgency,
  onSuccess,
}: SellRequestPageProps) {
  const [step, setStep] = useState(1);
  const [agencies, setAgencies] = useState<AgencyRecord[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number>(1);

  // Adım 1 Ofis Arama & Filtre & Sıralama & Önizleme Modalı
  const [agencySearch, setAgencySearch] = useState('');
  const [agencyCityFilter, setAgencyCityFilter] = useState('');
  const [agencySortBy, setAgencySortBy] = useState<'default' | 'rating_desc'>('default');
  const [inspectAgencyModal, setInspectAgencyModal] =
    useState<AgencyRecord | null>(null);

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

  // Adım 4: İletişim, Zorunlu T.C. Kimlik Doğrulaması & Onay
  const nameParts =
    session.role !== 'VISITOR' ? session.full_name.split(' ') : [];
  const [firstName, setFirstName] = useState(nameParts[0] ?? '');
  const [lastName, setLastName] = useState(
    nameParts.slice(1).join(' ') || '',
  );
  const [tcIdentityNo, setTcIdentityNo] = useState('');
  const [tcVerifyMsg, setTcVerifyMsg] = useState<string | null>(null);
  const [tcVerified, setTcVerified] = useState(false);
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

  const filteredAgencies = useMemo(() => {
    const q = normalizeTurkish(agencySearch.trim());
    const list = agencies.filter((ag) => {
      if (agencyCityFilter && ag.city !== agencyCityFilter) return false;
      if (q) {
        const hay = normalizeTurkish(
          `${ag.name} ${ag.authorized_person} ${ag.city} ${ag.district} ${ag.ttbs_document_no}`,
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (agencySortBy === 'rating_desc') {
      return [...list].sort((a, b) => {
        const rA = a.review_stats?.average ?? 0;
        const rB = b.review_stats?.average ?? 0;
        if (rB !== rA) return rB - rA;
        return (b.review_stats?.count ?? 0) - (a.review_stats?.count ?? 0);
      });
    }
    return list;
  }, [agencies, agencySearch, agencyCityFilter, agencySortBy]);

  const selectedAgency =
    agencies.find((a) => a.id === selectedAgencyId) ?? agencies[0];

  const handleVerifyTc = async () => {
    setError(null);
    setTcVerifyMsg(null);
    if (!isValidTcIdentityNo(tcIdentityNo)) {
      setTcVerified(false);
      setTcVerifyMsg(
        'Geçerli bir 11 haneli T.C. Kimlik Numarası giriniz (0 ile başlayamaz ve çift rakamla bitmelidir).',
      );
      return;
    }
    try {
      const res = await verifyTcIdentity(tcIdentityNo);
      setTcVerified(res.is_valid);
      setTcVerifyMsg(res.message);
    } catch {
      setTcVerified(false);
    }
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError(
        'Lütfen ad, soyad ve cep telefonu bilgilerinizi eksiksiz giriniz.',
      );
      return;
    }
    if (!isValidTcIdentityNo(tcIdentityNo)) {
      setError(
        'BR-04: İlan/satış başvurusu için geçerli 11 haneli T.C. Kimlik Numarası girilmesi zorunludur.',
      );
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
        tc_identity_no: tcIdentityNo.trim(),
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))',
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
        {/* Adım 1: Filtrelenebilir & İncelenebilir Emlak Ofisi Seçimi */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
              Gayrimenkulünüz İçin Yetki Vereceğiniz Emlak Ofisini Seçin
            </h3>

            {/* Ofis Arama & İl Filtresi */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
                gap: '10px',
              }}
            >
              <Input
                inputSize="sm"
                pill
                icon={<Search size={14} />}
                placeholder="Ofis adı, yetkili veya TTBS belge no ile arayın..."
                value={agencySearch}
                onChange={(e) => setAgencySearch(e.target.value)}
              />
              <Select
                selectSize="sm"
                pill
                value={agencyCityFilter}
                onChange={setAgencyCityFilter}
                placeholder="Tüm İller"
                options={provinces.map((p) => ({
                  value: p.name,
                  label: p.name,
                }))}
              />
              <Select
                selectSize="sm"
                pill
                value={agencySortBy}
                onChange={(v) => setAgencySortBy(v as 'default' | 'rating_desc')}
                options={[
                  { value: 'default', label: 'Sırala: Önerilen' },
                  { value: 'rating_desc', label: 'Puana Göre (Yüksek)' },
                ]}
              />
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {filteredAgencies.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Aramanıza uygun emlak ofisi bulunamadı.
                </div>
              ) : (
                filteredAgencies.map((ag) => {
                  const isSelected = ag.id === selectedAgencyId;
                  return (
                    <div
                      key={ag.id}
                      className="sell-agency-card"
                      onClick={() => setSelectedAgencyId(ag.id)}
                      style={{
                        border: isSelected
                          ? '2px solid var(--color-primary)'
                          : '1px solid var(--color-border-default)',
                        backgroundColor: isSelected
                          ? 'var(--color-primary-soft)'
                          : 'var(--color-bg-surface)',
                      }}
                    >
                      <div className="sell-agency-identity">
                        <Avatar
                          src={ag.logo_url}
                          name={ag.name}
                          size="lg"
                          shape="rounded"
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: '15px' }}>
                            {ag.name}
                          </div>
                          <div
                            style={{
                              fontSize: '12.5px',
                              color: 'var(--color-text-muted)',
                              marginTop: '2px',
                            }}
                          >
                            {ag.district} / {ag.city} • Yetkili:{' '}
                            {ag.authorized_person}
                          </div>
                          <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <Badge
                              variant="warning"
                              icon={<Star size={12} fill="#f59e0b" color="#f59e0b" />}
                            >
                              {(ag.review_stats?.average ?? 0).toFixed(1)} (
                              {ag.review_stats?.count ?? 0})
                            </Badge>
                            <Badge
                              variant="verified"
                              icon={<ShieldCheck size={12} />}
                            >
                              TTBS: {ag.ttbs_document_no}
                            </Badge>
                            <Badge variant="neutral">
                              {ag.stats.active_property_count} İlan
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div
                        className="sell-agency-actions"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <Button
                          variant="outline"
                          size="xs"
                          pill
                          rightIcon={<ExternalLink size={12} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectAgencyModal(ag);
                          }}
                        >
                          Ofisi İncele
                        </Button>
                        {isSelected && (
                          <CheckCircle2
                            size={22}
                            color="var(--color-primary)"
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
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

            <div className="resp-grid-3">
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
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

        {/* Adım 4: Zorunlu Mülk Sahibi T.C. Kimlik Doğrulaması & İletişim */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
              Mülk Sahibi Kimlik Doğrulaması (BR-04) ve Başvuru Onayı
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
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--color-text-muted)',
                  }}
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

            {/* Zorunlu 11 Haneli T.C. Kimlik Numarası + NVİ Doğrulama Butonu */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid var(--color-border-default)',
                backgroundColor: 'var(--color-bg-surface-alt)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <Input
                    label="Mülk Sahibi T.C. Kimlik Numarası (Zorunlu - 11 Hane)"
                    value={tcIdentityNo}
                    onChange={(e) => {
                      setTcIdentityNo(formatDigitsOnly(e.target.value, 11));
                      setTcVerified(false);
                      setTcVerifyMsg(null);
                    }}
                    icon={<ShieldCheck size={15} />}
                    placeholder="Örn: 29481029384"
                  />
                </div>
                <Button
                  variant="outline-primary"
                  pill
                  className="sell-nvi-btn"
                  onClick={() => void handleVerifyTc()}
                >
                  NVİ ile Doğrula
                </Button>
              </div>
              {tcVerifyMsg && (
                <Badge
                  variant={tcVerified ? 'success' : 'danger'}
                  icon={<CheckCircle2 size={13} />}
                >
                  {tcVerifyMsg}
                </Badge>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
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
                onChange={(e) => setPhone(formatTurkishPhone(e.target.value))}
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
          className="sell-step-footer"
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
              {submitting
                ? 'Gönderiliyor...'
                : 'Satış / Kiralama Başvurusunu Gönder'}
            </Button>
          )}
        </div>
      </Card>

      {/* Seçmeden İncelemek İçin "Ofisi İncele" Modalı (Madde 1) */}
      <Modal
        isOpen={Boolean(inspectAgencyModal)}
        onClose={() => setInspectAgencyModal(null)}
        title={inspectAgencyModal?.name ?? 'Emlak Ofisi Detayı'}
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              pill
              onClick={() => setInspectAgencyModal(null)}
            >
              Kapat
            </Button>
            {inspectAgencyModal && onInspectAgency && (
              <Button
                variant="outline-primary"
                pill
                rightIcon={<ExternalLink size={14} />}
                onClick={() => {
                  const id = inspectAgencyModal.id;
                  setInspectAgencyModal(null);
                  onInspectAgency(id);
                }}
              >
                Tüm İlanlarını Gör
              </Button>
            )}
            {inspectAgencyModal && (
              <Button
                variant="primary"
                pill
                onClick={() => {
                  setSelectedAgencyId(inspectAgencyModal.id);
                  setInspectAgencyModal(null);
                }}
              >
                Bu Ofisi Seç
              </Button>
            )}
          </>
        }
      >
        {inspectAgencyModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <Avatar
                src={inspectAgencyModal.logo_url}
                name={inspectAgencyModal.name}
                size="lg"
                shape="rounded"
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: '16px' }}>
                  {inspectAgencyModal.name}
                </div>
                <div
                  style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}
                >
                  Yetkili: {inspectAgencyModal.authorized_person} •{' '}
                  {inspectAgencyModal.district} / {inspectAgencyModal.city}
                </div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55 }}>
              {inspectAgencyModal.description}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                gap: '10px',
                fontSize: '13px',
              }}
            >
              <div className="ttbs-gray-box">
                <span className="ttbs-gray-label">
                  <Phone size={13} /> Sabit Telefon
                </span>
                <span className="ttbs-gray-value">
                  {inspectAgencyModal.phone}
                </span>
              </div>
              <div className="ttbs-gray-box">
                <span className="ttbs-gray-label">
                  <ShieldCheck size={13} /> TTBS Belge No
                </span>
                <span className="ttbs-gray-value">
                  {inspectAgencyModal.ttbs_document_no}
                </span>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                Ofis Danışmanları ({getAdvisorsForAgency(inspectAgencyModal.id).length})
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {getAdvisorsForAgency(inspectAgencyModal.id).map((adv) => (
                  <Badge key={adv.id} variant="neutral">
                    {adv.full_name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}

export default SellRequestPage;
