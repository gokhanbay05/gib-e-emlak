import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  Edit3,
  Mail,
  Phone,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  createCustomer,
  fetchCustomerDetail,
  fetchCustomers,
  updateCustomer,
} from '../api/customers';
import {
  buildPropertyPrintSheetUrl,
  createSearchRequest,
  fetchAiPropertyRecommendations,
  type AiRecommendationItem,
} from '../api/properties';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Tabs,
} from '../components/core';
import { PageContainer } from '../components/layout';
import type {
  CustomerCategoryCounts,
  CustomerDetailRecord,
  CustomerRecord,
  CustomerType,
  UserSession,
} from '../types';
import {
  formatPriceTL,
  getPropertyGallery,
} from '../lib/utils';
import {
  formatAppointmentStatusLabel,
  formatCustomerTypeLabel,
  formatDateTimeTR,
  formatDigitsOnly,
  formatTurkishPhone,
  normalizeTurkish,
  sanitizeNameInput,
} from '../utils/formatters';
import { customerSchema, zodErrorsToMap } from '../utils/validation';

export interface CustomersPageProps {
  session: UserSession;
  globalSearchQuery: string;
  onNotify: (msg: string) => void;
}

/**
 * Yan çekmecesiz (Drawer olmadan), ortalanmış Modal kullanan Müşteri Yönetimi sayfası.
 */
export function CustomersPage({
  session,
  globalSearchQuery,
  onNotify,
}: CustomersPageProps) {
  const agencyId = session.agency?.id ?? 1;
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [counts, setCounts] = useState<CustomerCategoryCounts>({
    ALL: 0,
    ALICI: 0,
    SATICI: 0,
    KIRALAYAN: 0,
    KIRACI: 0,
  });
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [localSearch, setLocalSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('created_at:desc');

  // Müşteri Detay & AI Ev Eşleştirme Modalı
  const [detailCustomer, setDetailCustomer] =
    useState<CustomerDetailRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [matchPrompt, setMatchPrompt] = useState('');
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResults, setMatchResults] = useState<AiRecommendationItem[]>([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<CustomerRecord | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [email, setEmail] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('ALICI');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadCustomers = async () => {
    try {
      const [sortBy, sortDir] = sortKey.split(':');
      const res = await fetchCustomers({
        agency_id: agencyId,
        customer_type: typeFilter !== 'ALL' ? typeFilter : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setCustomers(res.customers);
      setCounts(res.counts);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadCustomers();
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        void loadCustomers();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [agencyId, typeFilter, sortKey]);

  const openCustomerDetail = async (c: CustomerRecord) => {
    setDetailLoading(true);
    setMatchResults([]);
    setMatchPrompt('');
    try {
      const res = await fetchCustomerDetail(c.id);
      setDetailCustomer(res.customer);
      const lastPrompt = res.customer.search_requests?.[0]?.natural_language_prompt;
      if (lastPrompt) {
        setMatchPrompt(lastPrompt);
      }
    } catch {
      onNotify('Müşteri detayları yüklenemedi.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRunCustomerMatch = async () => {
    if (!detailCustomer || !matchPrompt.trim()) {
      onNotify('Lütfen müşterinin aradığı ev kriterini veya cümlesini yazınız.');
      return;
    }
    setMatchLoading(true);
    try {
      const q = matchPrompt.trim();
      await createSearchRequest({
        agency_id: agencyId,
        customer_id: detailCustomer.id,
        listing_type: q.toLowerCase().includes('kiral') ? 'KIRALIK' : 'SATILIK',
        property_type: q.toLowerCase().includes('villa')
          ? 'VILLA'
          : q.toLowerCase().includes('işyeri') || q.toLowerCase().includes('ofis')
            ? 'ISYERI'
            : q.toLowerCase().includes('arsa')
              ? 'ARSA'
              : 'DAIRE',
        natural_language_prompt: q,
      });
      const recRes = await fetchAiPropertyRecommendations(q);
      setMatchResults(recRes.recommendations);
      const refreshed = await fetchCustomerDetail(detailCustomer.id);
      setDetailCustomer(refreshed.customer);
      onNotify(
        `${detailCustomer.full_name} için talep kaydedildi ve ${recRes.recommendations.length} ilan eşleştirildi.`,
      );
    } catch {
      onNotify('Ev eşleştirme sırasında bir hata oluştu.');
    } finally {
      setMatchLoading(false);
    }
  };

  const filteredList = useMemo(() => {
    const q = normalizeTurkish(`${globalSearchQuery} ${localSearch}`.trim());
    if (!q) return customers;
    return customers.filter((c) => {
      const hay = normalizeTurkish(
        `${c.full_name} ${c.mobile_phone} ${c.email} ${c.tc_identity_no} ${c.notes}`,
      );
      return hay.includes(q);
    });
  }, [customers, globalSearchQuery, localSearch]);

  const openNewCustomer = () => {
    setEditingCustomer(null);
    setFirstName('');
    setLastName('');
    setMobilePhone('');
    setEmail('');
    setTcNo('');
    setCustomerType('ALICI');
    setNotes('');
    setErrors({});
    setModalOpen(true);
  };

  const openEditCustomer = (c: CustomerRecord) => {
    setEditingCustomer(c);
    setFirstName(c.first_name);
    setLastName(c.last_name);
    setMobilePhone(c.mobile_phone);
    setEmail(c.email || '');
    setTcNo(c.tc_identity_no || '');
    setCustomerType(c.customer_type);
    setNotes(c.notes || '');
    setErrors({});
    setModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    setErrors({});
    const payload = {
      agency_id: agencyId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      mobile_phone: mobilePhone.trim(),
      email: email.trim(),
      tc_identity_no: tcNo.trim(),
      customer_type: customerType,
      notes: notes.trim(),
    };

    const parsed = customerSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(zodErrorsToMap(parsed.error));
      return;
    }

    setSaving(true);
    try {
      if (editingCustomer) {
        const res = await updateCustomer(editingCustomer.id, payload);
        onNotify(res.message);
      } else {
        const res = await createCustomer(payload);
        onNotify(res.message);
      }
      setModalOpen(false);
      await loadCustomers();
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Müşteri kaydedilemedi.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      size="wide"
      title="Müşteri Yönetimi"
      actions={
        <Button
          variant="primary"
          pill
          leftIcon={<Plus size={16} />}
          onClick={openNewCustomer}
        >
          Yeni Müşteri Ekle
        </Button>
      }
    >
      <Card style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <Tabs
            variant="pills"
            value={typeFilter}
            onChange={setTypeFilter}
            items={[
              { value: 'ALL', label: 'Tüm Müşteriler', count: counts.ALL },
              { value: 'ALICI', label: 'Alıcı', count: counts.ALICI },
              { value: 'SATICI', label: 'Satıcı', count: counts.SATICI },
              {
                value: 'KIRALAYAN',
                label: 'Kiraya Veren',
                count: counts.KIRALAYAN,
              },
              { value: 'KIRACI', label: 'Kiracı', count: counts.KIRACI },
            ]}
          />

          <div style={{ flex: '1 1 200px', minWidth: '160px' }}>
            <Input
              inputSize="sm"
              pill
              icon={<Search size={14} />}
              placeholder="Ad, telefon veya T.C. ile ara..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          <Select
            selectSize="sm"
            pill
            inline
            value={sortKey}
            onChange={setSortKey}
            options={[
              { value: 'created_at:desc', label: 'Sırala: En Yeni' },
              { value: 'name:asc', label: 'Ad Soyad (A-Z)' },
              { value: 'property_count:desc', label: 'Mülk Sayısı' },
            ]}
          />
        </div>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 310px), 1fr))',
          gap: '14px',
        }}
      >
        {filteredList.map((c) => (
          <Card key={c.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Avatar name={c.full_name} size="md" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>
                    {c.full_name}
                  </div>
                  <div style={{ marginTop: '3px' }}>
                    <Badge variant="primary">
                      {formatCustomerTypeLabel(c.customer_type)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <Button
                  variant="outline-primary"
                  size="sm"
                  pill
                  leftIcon={<Sparkles size={13} />}
                  onClick={() => void openCustomerDetail(c)}
                >
                  Detay & Eşleştir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  pill
                  leftIcon={<Edit3 size={13} />}
                  onClick={() => openEditCustomer(c)}
                >
                  Düzenle
                </Button>
              </div>
            </div>

            <div
              style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--color-border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '12.5px',
                color: 'var(--color-text-body)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={13} color="var(--color-primary)" />
                <span>{c.mobile_phone}</span>
              </div>
              {c.email && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Mail size={13} color="var(--color-text-muted)" />
                  <span>{c.email}</span>
                </div>
              )}
              {c.tc_identity_no && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ShieldCheck size={13} color="var(--color-whatsapp)" />
                  <span>T.C. Kimlik: {c.tc_identity_no}</span>
                </div>
              )}
              {c.notes && (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    marginTop: '2px',
                  }}
                >
                  Not: {c.notes}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingCustomer ? 'Müşteri Bilgilerini Düzenle' : 'Yeni Müşteri Kaydı'
        }
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              pill
              onClick={() => setModalOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              variant="primary"
              pill
              disabled={saving}
              onClick={() => void handleSaveCustomer()}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '12px',
            }}
          >
            <Input
              label="Ad"
              value={firstName}
              onChange={(e) => setFirstName(sanitizeNameInput(e.target.value))}
              error={errors.first_name}
            />
            <Input
              label="Soyad"
              value={lastName}
              onChange={(e) => setLastName(sanitizeNameInput(e.target.value))}
              error={errors.last_name}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '12px',
            }}
          >
            <Select
              label="Müşteri Tipi"
              value={customerType}
              onChange={(v) => setCustomerType(v as CustomerType)}
              options={[
                { value: 'ALICI', label: 'Alıcı' },
                { value: 'SATICI', label: 'Satıcı (Mülk Sahibi)' },
                { value: 'KIRALAYAN', label: 'Kiralık Mülk Sahibi' },
                { value: 'KIRACI', label: 'Kiracı Adayı' },
              ]}
            />
            <Input
              label="T.C. Kimlik Numarası (11 Hane)"
              value={tcNo}
              onChange={(e) => setTcNo(formatDigitsOnly(e.target.value, 11))}
              error={errors.tc_identity_no}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '12px',
            }}
          >
            <Input
              label="Cep Telefonu"
              value={mobilePhone}
              onChange={(e) =>
                setMobilePhone(formatTurkishPhone(e.target.value))
              }
              error={errors.mobile_phone}
            />
            <Input
              label="E-Posta Adresi"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
          </div>

          <Input
            label="Danışman Notu"
            multiline
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </Modal>

      {/* Müşteri Detay, Sahip Olunan Mülkler & AI Ev Eşleştirme Paneli */}
      <Modal
        isOpen={Boolean(detailCustomer) || detailLoading}
        onClose={() => setDetailCustomer(null)}
        title={
          detailCustomer
            ? `${detailCustomer.full_name} — Detay & AI Ev Eşleştirme`
            : 'Müşteri Detayı Yükleniyor...'
        }
        size="lg"
        footer={
          <Button
            variant="outline"
            pill
            onClick={() => setDetailCustomer(null)}
          >
            Kapat
          </Button>
        }
      >
        {detailLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Müşteri portföyü ve talepleri yükleniyor...
          </div>
        ) : detailCustomer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Özet Bilgi */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-bg-surface-alt)',
                border: '1px solid var(--color-border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>
                  {detailCustomer.full_name} •{' '}
                  <span style={{ color: 'var(--color-primary)' }}>
                    {formatCustomerTypeLabel(detailCustomer.customer_type)}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                  Tel: {detailCustomer.mobile_phone}
                  {detailCustomer.tc_identity_no
                    ? ` • T.C.: ${detailCustomer.tc_identity_no}`
                    : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Badge variant="neutral">
                  {detailCustomer.owned_properties.length} Mülk
                </Badge>
                <Badge variant="primary">
                  {detailCustomer.appointments.length} Randevu
                </Badge>
              </div>
            </div>

            {/* Sahibi Olduğu Gayrimenkuller */}
            {detailCustomer.owned_properties.length > 0 && (
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '13.5px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Building2 size={15} color="var(--color-primary)" />
                  <span>Kayıtlı Gayrimenkulleri</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detailCustomer.owned_properties.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--color-border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>
                          {p.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {p.room_count} • {p.gross_sqm} m² • {p.district} / {p.city} •{' '}
                          <strong>{formatPriceTL(p.price)}</strong>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="xs"
                        pill
                        leftIcon={<Printer size={12} />}
                        onClick={() =>
                          window.open(
                            buildPropertyPrintSheetUrl(p.id, detailCustomer.id, true),
                            '_blank',
                          )
                        }
                      >
                        A4 Bilgi Fişi
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Randevu Geçmişi */}
            {detailCustomer.appointments.length > 0 && (
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '13.5px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Calendar size={15} color="var(--color-primary)" />
                  <span>Randevuları</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {detailCustomer.appointments.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--color-bg-surface-alt)',
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>
                        <strong>{formatDateTimeTR(String(a.start_time))}</strong> —{' '}
                        {String(a.property_title || a.advisor_name || 'Randevu')}
                      </span>
                      <Badge
                        variant={
                          a.status === 'AKTIF'
                            ? 'success'
                            : a.status === 'IPTAL_EDILDI'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {formatAppointmentStatusLabel(a.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emlakçı İçin AI Müşteri–Ev Eşleştirme & Talep Kaydı */}
            <div
              style={{
                padding: '14px',
                borderRadius: '14px',
                border: '1px solid var(--color-primary-border)',
                background: 'var(--gradient-ai-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 800,
                  fontSize: '14px',
                  color: 'var(--color-ai-accent)',
                }}
              >
                <Sparkles size={16} />
                <span>AI Destekli Müşteri–Ev Eşleştirme & Talep Sorgulama</span>
              </div>

              <Input
                value={matchPrompt}
                onChange={(e) => setMatchPrompt(e.target.value)}
                placeholder="Örn: Çankaya'da metroya yakın 3+1 kiralık daire, max 30.000 TL"
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="ai"
                  size="sm"
                  pill
                  disabled={matchLoading || !matchPrompt.trim()}
                  leftIcon={<Sparkles size={14} />}
                  onClick={() => void handleRunCustomerMatch()}
                >
                  {matchLoading ? 'Eşleştiriliyor...' : 'Talep Kaydet & Uygun Evleri Bul'}
                </Button>
              </div>

              {matchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {matchResults.map((rec) => {
                    const thumb = getPropertyGallery(rec.property)[0];
                    return (
                      <div
                        key={rec.property.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--color-bg-surface)',
                          border: '1px solid var(--color-border-default)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 200px' }}>
                          <img
                            src={thumb}
                            alt={rec.property.title}
                            style={{
                              width: '56px',
                              height: '44px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <Badge variant="ai">%{rec.score} Uyum</Badge>
                              <strong style={{ fontSize: '13px', color: 'var(--color-primary)' }}>
                                {formatPriceTL(rec.property.price)}
                              </strong>
                            </div>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: '12.5px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {rec.property.title}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                              {rec.property.room_count} • {rec.property.gross_sqm} m² • {rec.property.district}/{rec.property.city}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline-primary"
                          size="xs"
                          pill
                          leftIcon={<Printer size={12} />}
                          onClick={() =>
                            window.open(
                              buildPropertyPrintSheetUrl(
                                rec.property.id,
                                detailCustomer.id,
                                true,
                              ),
                              '_blank',
                            )
                          }
                        >
                          Müşteriye Özel A4 Fiş
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </PageContainer>
  );
}

export default CustomersPage;
