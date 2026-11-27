import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { fetchAgencies } from '../api/agencies';
import { fetchAgencyReviews } from '../api/engagement';
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from '../api/favorites';
import { fetchProperties } from '../api/properties';
import {
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Modal,
  Select,
} from '../components/core';
import { DetailSplitLayout, PageContainer } from '../components/layout';
import PropertyHorizontalCard from '../components/property/PropertyHorizontalCard';
import {
  getAdvisorsForAgency,
  getPropertyAdvisor,
} from '../lib/advisors';
import type {
  AgencyRecord,
  AgencyReviewRecord,
  PropertyRecord,
  UserSession,
} from '../types';

export interface AgencyStorefrontPageProps {
  agencyId: number | null;
  initialAdvisorId: number | null;
  session: UserSession;
  onSelectProperty: (property: PropertyRecord) => void;
  onBackToDirectory: () => void;
  onBackToMarketplace: () => void;
  onRequireAuth: (reason: string) => void;
  onNotify: (msg: string) => void;
}

/**
 * Madde 2 & 8: Kurumsal Emlak Ofisi Vitrini ve Çoklu Danışman Portföy Sayfası.
 * - Sağ üstteki ofis seçme listbox'ı kaldırıldı (Emlak Ofisleri rehber sayfasından seçilir).
 * - Mavi tik, "Kurumsal Üye • 14. Yıl" ve gerçekte olmayan 4.9 yıldız puanı kaldırıldı.
 * - Soldaki yanıltıcı "Tümünü Gör" butonu ve sağdaki alakasız "Selim Karahan x" rozeti kaldırıldı;
 *   yerine filtre çubuğuna doğrudan "Danışman Seç" Select filtresi eklendi.
 */
export function AgencyStorefrontPage({
  agencyId,
  initialAdvisorId,
  session,
  onSelectProperty,
  onBackToDirectory,
  onBackToMarketplace,
  onRequireAuth,
  onNotify,
}: AgencyStorefrontPageProps) {
  const [agencies, setAgencies] = useState<AgencyRecord[]>([]);
  const activeAgencyId = agencyId || 1;
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<number | null>(
    initialAdvisorId,
  );
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<string>('created_at:desc');
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [showOfficePhone, setShowOfficePhone] = useState(false);
  const [reviews, setReviews] = useState<AgencyReviewRecord[]>([]);
  const [reviewStats, setReviewStats] = useState<{ average: number; count: number }>({
    average: 0,
    count: 0,
  });
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);

  const commentCount = useMemo(
    () => reviews.filter((r) => Boolean(r.comment && r.comment.trim())).length,
    [reviews],
  );

  const isAgent = session.role === 'AGENT';

  useEffect(() => {
    setSelectedAdvisorId(initialAdvisorId);
  }, [initialAdvisorId]);

  useEffect(() => {
    void fetchAgencyReviews(activeAgencyId)
      .then((res) => {
        setReviews(res.reviews);
        setReviewStats({ average: res.average, count: res.count });
      })
      .catch(() => {});
  }, [activeAgencyId]);

  useEffect(() => {
    void fetchAgencies()
      .then((res) => setAgencies(res.agencies))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const [sortBy, sortDir] = sortKey.split(':');
    void fetchProperties({
      agency_id: activeAgencyId,
      status: 'AKTIF',
      property_type:
        propertyTypeFilter !== 'ALL' ? propertyTypeFilter : undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
    })
      .then((res) => setProperties(res.properties))
      .catch(() => {});
  }, [activeAgencyId, propertyTypeFilter, sortKey]);

  useEffect(() => {
    if (session.role === 'VISITOR' || !session.id) return;
    void fetchFavorites(session.id)
      .then((res) => setFavoriteIds(new Set(res.favorite_property_ids)))
      .catch(() => {});
  }, [session]);

  const currentAgency =
    agencies.find((a) => a.id === activeAgencyId) ?? agencies[0];
  const advisors = useMemo(
    () => getAdvisorsForAgency(activeAgencyId),
    [activeAgencyId],
  );
  const selectedAdvisor =
    advisors.find((a) => a.id === selectedAdvisorId) ?? null;

  const displayedProperties = useMemo(() => {
    if (!selectedAdvisorId) return properties;
    return properties.filter(
      (p) => getPropertyAdvisor(p).id === selectedAdvisorId,
    );
  }, [properties, selectedAdvisorId]);

  const handleToggleFavorite = async (propertyId: number) => {
    if (session.role === 'VISITOR') {
      onRequireAuth('Favorilere eklemek için lütfen giriş yapınız.');
      return;
    }
    if (isAgent) return;
    const currentlyFav = favoriteIds.has(propertyId);
    if (currentlyFav) {
      await removeFavorite(session.id, propertyId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(propertyId);
        return next;
      });
      onNotify('İlan favorilerinizden çıkarıldı.');
    } else {
      await addFavorite(session.id, propertyId);
      setFavoriteIds((prev) => new Set(prev).add(propertyId));
      onNotify('İlan favorilerinize eklendi.');
    }
  };

  return (
    <PageContainer size="wide">
      <Breadcrumb
        items={[
          { label: 'Ana Sayfa', onClick: onBackToMarketplace },
          { label: 'Emlak Ofisleri', onClick: onBackToDirectory },
          {
            label: currentAgency?.name ?? 'Emlak Ofisi',
            onClick: () => setSelectedAdvisorId(null),
          },
          ...(selectedAdvisor ? [{ label: selectedAdvisor.full_name }] : []),
        ]}
      />

      {/* Üst Emlak Ofisi Kurumsal Kimlik Kartı (Mobilde 1 sütuna iner, taşma yok) */}
      <Card padding="lg" style={{ marginBottom: '22px' }}>
        <div className="agency-hero-card-grid">
          <div className="agency-hero-identity">
            <Avatar
              src={currentAgency?.logo_url}
              name={currentAgency?.name ?? 'Ofis'}
              size="xl"
              shape="rounded"
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                minWidth: 0,
              }}
            >
              <h1 style={{ margin: 0, fontSize: '21px', fontWeight: 800 }}>
                {currentAgency?.name ?? 'Başkent Vizyon Gayrimenkul A.Ş.'}
              </h1>

              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-body)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <MapPin size={14} color="var(--color-primary)" />
                  <strong>
                    {currentAgency?.district ?? 'Çankaya'} /{' '}
                    {currentAgency?.city ?? 'Ankara'}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Yetkili:{' '}
                  <strong>
                    {currentAgency?.authorized_person ?? 'Selim Karahan'}
                  </strong>
                </span>
                <span>•</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Building2 size={14} color="var(--color-primary)" />
                  <strong>{properties.length} Aktif İlan</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setReviewsModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--color-border-default)',
                    backgroundColor: 'var(--color-bg-surface-alt)',
                    color: 'var(--color-text-primary)',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                  }}
                  title="Tüm değerlendirme ve yorumları aç"
                >
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <span>
                    {reviewStats.average.toFixed(1)} • {reviewStats.count}{' '}
                    Değerlendirme • {commentCount} Yorum
                  </span>
                </button>
              </div>

              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '13.5px',
                  color: 'var(--color-text-muted)',
                }}
              >
                {currentAgency?.description ||
                  'Ticaret Bakanlığı Taşınmaz Ticareti Yetki Belgeli kurumsal gayrimenkul danışmanlığı.'}
              </p>
            </div>
          </div>

          <div className="agency-hero-ttbs-col">
            <div className="ttbs-gray-box" style={{ textAlign: 'center' }}>
              <span
                className="ttbs-gray-label"
                style={{ justifyContent: 'center' }}
              >
                <ShieldCheck size={15} color="var(--color-whatsapp)" />
                <span>Taşınmaz Ticareti Yetki Belgesi</span>
              </span>
              <span
                className="ttbs-gray-value"
                style={{ fontSize: '14px', fontWeight: 700 }}
              >
                {currentAgency?.ttbs_document_no ?? '0600482'}
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              pill
              fullWidth
              leftIcon={<Phone size={16} />}
              onClick={() => setShowOfficePhone((v) => !v)}
            >
              {showOfficePhone
                ? currentAgency?.phone ?? '0 (312) 468 10 20'
                : 'Telefonu Göster'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Alt 2 Sütun: Sol "Danışmanlarımız" | Sağ Danışman/Ofis İlanları */}
      <DetailSplitLayout
        sidebarPosition="left"
        sidebar={
          <Card>
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800 }}>
                Danışmanlarımız ({advisors.length})
              </h3>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {advisors.map((adv) => {
                const isSelected = selectedAdvisorId === adv.id;
                return (
                  <div
                    key={adv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px',
                      borderRadius: '12px',
                      backgroundColor: isSelected
                        ? 'var(--color-primary-soft)'
                        : 'transparent',
                      border: isSelected
                        ? '1px solid var(--color-primary-border)'
                        : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() =>
                      setSelectedAdvisorId(isSelected ? null : adv.id)
                    }
                  >
                    <Avatar
                      src={adv.avatar_url}
                      name={adv.full_name}
                      size="lg"
                      shape="rounded"
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>
                        {adv.full_name}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {adv.title}
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--color-primary)',
                          fontSize: '12px',
                          fontWeight: 700,
                          marginTop: '4px',
                        }}
                      >
                        <span>Danışmanın İlanları</span>
                        <ArrowRight size={12} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        }
        main={
          <>
            {/* Sağ Üst Filtre Çubuğu: Danışman Seç + Emlak Türü + Sırala (Tek Satırda) */}
            <div className="results-header-card">
              <div className="results-count-text">
                <strong>
                  {selectedAdvisor
                    ? selectedAdvisor.full_name.toLocaleUpperCase('tr-TR')
                    : currentAgency?.name ?? 'Emlak Ofisi'}
                </strong>{' '}
                için <strong>{displayedProperties.length}</strong> ilan bulundu
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))',
                  gap: '8px',
                  width: '100%',
                }}
              >
                <Select
                  selectSize="sm"
                  pill
                  value={selectedAdvisorId ? String(selectedAdvisorId) : 'ALL'}
                  onChange={(val) =>
                    setSelectedAdvisorId(val === 'ALL' ? null : Number(val))
                  }
                  options={[
                    { value: 'ALL', label: 'Danışman: Tümü' },
                    ...advisors.map((a) => ({
                      value: String(a.id),
                      label: `Danışman: ${a.full_name}`,
                    })),
                  ]}
                />

                <Select
                  selectSize="sm"
                  pill
                  value={propertyTypeFilter}
                  onChange={setPropertyTypeFilter}
                  options={[
                    { value: 'ALL', label: 'Emlak Türü: Tümü' },
                    { value: 'DAIRE', label: 'Konut / Daire' },
                    { value: 'VILLA', label: 'Villa' },
                    { value: 'ISYERI', label: 'İşyeri' },
                    { value: 'ARSA', label: 'Arsa' },
                  ]}
                />

                <Select
                  selectSize="sm"
                  pill
                  value={sortKey}
                  onChange={setSortKey}
                  options={[
                    { value: 'created_at:desc', label: 'Sırala: En Yeni' },
                    { value: 'price:asc', label: 'Fiyat (Artan)' },
                    { value: 'price:desc', label: 'Fiyat (Azalan)' },
                  ]}
                />
              </div>
            </div>

            <div className="property-cards-stack">
              {displayedProperties.map((p) => (
                <PropertyHorizontalCard
                  key={p.id}
                  property={p}
                  isFavorited={favoriteIds.has(p.id)}
                  hideCustomerActions={isAgent}
                  onSelect={onSelectProperty}
                  onToggleFavorite={(id) => void handleToggleFavorite(id)}
                  onSelectAgency={(_agId, advId) => {
                    if (advId) setSelectedAdvisorId(advId);
                  }}
                />
              ))}
            </div>

            {/* Doğrulanmış Randevu Değerlendirmeleri ve Müşteri Yorumları */}
            <Card padding="lg" style={{ marginTop: '22px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                    Müşteri Yorumları ve Değerlendirmeler
                  </h3>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '12.5px',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Yalnızca bu ofisle yerinde gösterim randevusu tamamlanan müşteriler yorum bırakabilir.
                  </p>
                </div>

                {reviewStats.count > 0 && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--color-warning-bg, rgba(245,158,11,0.12))',
                      fontWeight: 800,
                      fontSize: '14px',
                    }}
                  >
                    <Star size={16} fill="#f59e0b" color="#f59e0b" />
                    <span>{reviewStats.average.toFixed(1)}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                      ({reviewStats.count} yorum)
                    </span>
                  </div>
                )}
              </div>

              {reviews.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--color-bg-surface-alt)',
                    color: 'var(--color-text-muted)',
                    fontSize: '13px',
                    textAlign: 'center',
                  }}
                >
                  Henüz doğrulanmış müşteri değerlendirmesi bulunmuyor.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '1px solid var(--color-border-default)',
                        backgroundColor: 'var(--color-bg-surface-alt)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          marginBottom: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13.5px' }}>
                            {rev.reviewer_name}
                          </span>
                          {rev.advisor_name && (
                            <span
                              style={{
                                fontSize: '11.5px',
                                color: 'var(--color-text-muted)',
                              }}
                            >
                              • Danışman: {rev.advisor_name}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={13}
                              fill={star <= rev.rating ? '#f59e0b' : 'transparent'}
                              color={star <= rev.rating ? '#f59e0b' : 'var(--color-text-muted)'}
                            />
                          ))}
                        </div>
                      </div>
                      {rev.comment && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: '13px',
                            lineHeight: 1.55,
                            color: 'var(--color-text-body)',
                          }}
                        >
                          {rev.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        }
      />

      {/* Değerlendirme & Yorumlar Pop-up Modalı */}
      <Modal
        isOpen={reviewsModalOpen}
        onClose={() => setReviewsModalOpen(false)}
        title={`${currentAgency?.name ?? 'Emlak Ofisi'} — Müşteri Değerlendirmeleri (${reviewStats.count})`}
        size="md"
        footer={
          <Button
            variant="primary"
            pill
            onClick={() => setReviewsModalOpen(false)}
          >
            Kapat
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-bg-surface-alt)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '15px' }}>
              <Star size={18} fill="#f59e0b" color="#f59e0b" />
              <span>Ortalama Puan: {reviewStats.average.toFixed(1)} / 5.0</span>
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              {reviewStats.count} Değerlendirme • {commentCount} Yorum
            </div>
          </div>

          {reviews.map((rev) => (
            <div
              key={`modal-rev-${rev.id}`}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid var(--color-border-default)',
                backgroundColor: 'var(--color-bg-surface)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  marginBottom: '6px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, fontSize: '13.5px' }}>
                    {rev.reviewer_name}
                  </span>
                  {rev.advisor_name && (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                      • Danışman: {rev.advisor_name}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={13}
                      fill={star <= rev.rating ? '#f59e0b' : 'transparent'}
                      color={star <= rev.rating ? '#f59e0b' : 'var(--color-text-muted)'}
                    />
                  ))}
                </div>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  lineHeight: 1.55,
                  color: rev.comment ? 'var(--color-text-body)' : 'var(--color-text-muted)',
                  fontStyle: rev.comment ? 'normal' : 'italic',
                }}
              >
                {rev.comment || 'Yalnızca yıldız puanı bırakıldı.'}
              </p>
            </div>
          ))}
        </div>
      </Modal>
    </PageContainer>
  );
}

export default AgencyStorefrontPage;
