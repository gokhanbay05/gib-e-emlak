import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3,
  BedDouble,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  Heart,
  Info,
  Layers,
  ListChecks,
  MapPin,
  Maximize2,
  MessageSquare,
  Phone,
  Printer,
  Share2,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from '../api/favorites';
import {
  buildPropertyPrintSheetUrl,
  fetchProperties,
  fetchPropertyById,
} from '../api/properties';
import { checkPropertyChatAccess } from '../api/appointments';
import { ensureChatThread } from '../api/engagement';
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Skeleton,
  SpecGrid,
  Tabs,
  type SpecGridItem,
} from '../components/core';
import { DetailSplitLayout, PageContainer } from '../components/layout';
import PropertyMapView from '../components/map/PropertyMapView';
import AppointmentModal from '../components/modals/AppointmentModal';
import PropertyGallery from '../components/property/PropertyGallery';
import PropertyIndexChart from '../components/property/PropertyIndexChart';
import {
  buildAiSmartSummary,
  getPropertyAdvisor,
} from '../lib/advisors';
import { formatPriceTL, getPropertyGallery } from '../lib/utils';
import type { PropertyRecord, UserSession } from '../types';
import {
  formatDateTR,
  formatHeatingTypeLabel,
  formatListingTypeLabel,
  formatPropertyTypeLabel,
} from '../utils/formatters';
import '../css/pages/PropertyDetailPage.css';

export interface PropertyDetailPageProps {
  propertyId: number | null;
  initialProperty: PropertyRecord | null;
  session: UserSession;
  onSelectProperty: (property: PropertyRecord) => void;
  onSelectAgency: (agencyId: number, advisorId?: number) => void;
  onBackToMarketplace: (filters?: {
    listingType?: 'ALL' | 'SATILIK' | 'KIRALIK';
    city?: string;
    district?: string;
    neighborhood?: string;
  }) => void;
  onOpenMessages?: () => void;
  onRequireAuth: (reason: string) => void;
  onNotify: (msg: string) => void;
}

const DEFAULT_FEATURES = [
  'Çelik Kapı',
  'Ankastre Mutfak',
  'Ebeveyn Banyosu',
  'Balkon',
  'Görüntülü Diafon',
  'Fiber İnternet',
  'Parke & Seramik Zemin',
  'Açık & Kapalı Otopark',
  'Asansör',
  '7/24 Güvenlik & Kamera',
  'Isı Yalıtımı (Mantolama)',
];

/**
 * Madde 8 Güncellemeleri:
 * - Sağ karttaki mavi tik, "Kurumsal Üye • 14. Yıl", WhatsApp butonu, TTBS Yetki Belgesi ve İşletme Ünvanı kutuları kaldırıldı.
 * - Sağ sütun sticky olmaktan çıkarıldığı için üstteki sticky bar sağ kartın üstünü kapatmaz.
 * - İlan Bilgileri / İlan Açıklaması / Özellikler / Konum & Harita / Emlak Endeksi sekmeleri
 *   uzun kaydırma yerine tıklanan sekmeyi açan gerçek Tab menüsü olarak çalışır.
 * - Konum sekmesinde interaktif harita yer alır; Emlak Endeksi ve AI Özet doğrudan veritabanındaki gerçek ilan verilerini kullanır.
 */
export function PropertyDetailPage({
  propertyId,
  initialProperty,
  session,
  onSelectProperty,
  onSelectAgency,
  onBackToMarketplace,
  onOpenMessages,
  onRequireAuth,
  onNotify,
}: PropertyDetailPageProps) {
  const [property, setProperty] = useState<PropertyRecord | null>(
    initialProperty,
  );
  const [allProperties, setAllProperties] = useState<PropertyRecord[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [activeTab, setActiveTab] = useState('specs');
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [hasChatAccess, setHasChatAccess] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const isAgent = session.role === 'AGENT';

  useEffect(() => {
    const targetId = propertyId ?? initialProperty?.id;
    if (!targetId) return;
    void fetchPropertyById(targetId)
      .then((res) => setProperty(res.property))
      .catch(() => {});
  }, [propertyId, initialProperty]);

  useEffect(() => {
    void fetchProperties({ status: 'AKTIF' })
      .then((res) => setAllProperties(res.properties))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (session.role === 'VISITOR' || !session.id || !property) {
      setIsFavorited(false);
      return;
    }
    void fetchFavorites(session.id)
      .then((res) =>
        setIsFavorited(res.favorite_property_ids.includes(property.id)),
      )
      .catch(() => {});
  }, [session, property]);

  useEffect(() => {
    if (session.role !== 'CUSTOMER' || !session.customer?.id || !property) {
      setHasChatAccess(false);
      return;
    }
    void checkPropertyChatAccess(property.id, session.customer.id)
      .then((res) => setHasChatAccess(res.has_access))
      .catch(() => setHasChatAccess(false));
  }, [session.role, session.customer?.id, property]);

  useEffect(() => {
    const onScroll = () => {
      setShowStickyBar(window.scrollY > 480);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!property) {
    return (
      <PageContainer size="wide">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Skeleton width="35%" height="22px" />
          <Skeleton height="380px" borderRadius="16px" />
          <div className="detail-split-layout">
            <Skeleton height="220px" borderRadius="16px" />
            <Skeleton height="220px" borderRadius="16px" />
          </div>
        </div>
      </PageContainer>
    );
  }

  const gallery = getPropertyGallery(property);
  const advisor = getPropertyAdvisor(property);
  const aiSummaryText = buildAiSmartSummary(property, allProperties);
  const agencyName =
    property.agency?.name ?? 'Başkent Vizyon Gayrimenkul A.Ş.';
  const phoneDisplay =
    property.agency?.phone || advisor.phone || '0 (312) 468 10 20';

  const currentIdx = allProperties.findIndex((p) => p.id === property.id);
  const nextProperty =
    allProperties.length > 1
      ? allProperties[(currentIdx + 1) % allProperties.length]
      : null;

  const agencyOtherListings = allProperties
    .filter(
      (p) => p.agency_id === property.agency_id && p.id !== property.id,
    )
    .slice(0, 3);

  const handleToggleFavorite = async () => {
    if (session.role === 'VISITOR') {
      onRequireAuth(
        'İlanı favorilerinize eklemek için lütfen üye girişi yapınız.',
      );
      return;
    }
    if (isAgent) return;
    try {
      if (isFavorited) {
        await removeFavorite(session.id, property.id);
        setIsFavorited(false);
        onNotify('İlan favorilerinizden çıkarıldı.');
      } else {
        await addFavorite(session.id, property.id);
        setIsFavorited(true);
        onNotify('İlan favorilerinize eklendi.');
      }
    } catch {
      // ignore
    }
  };

  const handleSpeakSummary = () => {
    if (!('speechSynthesis' in window)) {
      onNotify('Tarayıcınız sesli okuma özelliğini desteklemiyor.');
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(aiSummaryText);
    utter.lang = 'tr-TR';
    utter.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const handleOpenChat = async () => {
    if (session.role === 'VISITOR' || !session.customer?.id) {
      onRequireAuth('Danışmana uygulama içi mesaj göndermek için giriş yapmalısınız.');
      return;
    }
    try {
      await ensureChatThread({
        agency_id: property.agency_id || 1,
        customer_id: session.customer.id,
        property_id: property.id,
        advisor_name: advisor.full_name,
      });
      onNotify(`${advisor.full_name} ile mesajlaşma açılıyor...`);
      onOpenMessages?.();
    } catch (err) {
      onNotify(
        err instanceof Error
          ? err.message
          : 'Alıcı olarak mesaj göndermek için önce randevu oluşturmalısınız.',
      );
    }
  };

  const buildingAge =
    property.building_age !== undefined
      ? property.building_age
      : (property.id % 8) + 1;
  const bathroomCount =
    property.bathroom_count !== undefined
      ? property.bathroom_count
      : property.gross_sqm >= 140
        ? 2
        : 1;
  const isCreditEligible =
    property.is_credit_eligible !== undefined
      ? property.is_credit_eligible
      : property.listing_type === 'SATILIK';
  const isFurnished = Boolean(property.is_furnished);
  const deedStatus = property.deed_status || 'Kat Mülkiyetli';
  const usageStatus = property.usage_status || 'Boş / Hemen Teslim';
  const propertyFeatures =
    property.features && property.features.length > 0
      ? property.features
      : DEFAULT_FEATURES;

  const specItems: SpecGridItem[] = [
    {
      label: 'İlan No',
      value: `${150000 + property.id}-${property.agency_id}`,
      highlight: true,
    },
    {
      label: 'Son Güncelleme',
      value: formatDateTR(property.created_at),
    },
    {
      label: 'İlan Durumu',
      value: formatListingTypeLabel(property.listing_type),
    },
    {
      label: 'Gayrimenkul Tipi',
      value: formatPropertyTypeLabel(property.property_type),
    },
    { label: 'Oda Sayısı', value: property.room_count },
    { label: 'Banyo Sayısı', value: String(bathroomCount) },
    {
      label: 'Brüt / Net m²',
      value: `${property.gross_sqm} m² / ${property.net_sqm} m²`,
    },
    {
      label: 'Bina Yaşı',
      value: buildingAge === 0 ? 'Sıfır Bina' : `${buildingAge} Yaşında`,
    },
    {
      label: 'Bulunduğu Kat',
      value: `${property.floor_number}. Kat`,
    },
    {
      label: 'Bina Kat Sayısı',
      value: `${property.building_floors} Katlı`,
    },
    {
      label: 'Isınma Tipi',
      value: formatHeatingTypeLabel(property.heating_type),
    },
    {
      label: 'Krediye Uygunluk',
      value: isCreditEligible ? 'Krediye Uygun' : 'Uygun Değil',
    },
    { label: 'Tapu Durumu', value: deedStatus },
    {
      label: 'Eşya Durumu',
      value: isFurnished ? 'Eşyalı' : 'Eşyalı Değil',
    },
    { label: 'Kullanım Durumu', value: usageStatus },
    { label: 'Sorumlu Danışman', value: advisor.full_name },
  ];

  const sectionTabs = [
    { value: 'specs', label: 'İlan Bilgileri', icon: <Info size={14} /> },
    {
      value: 'description',
      label: 'İlan Açıklaması',
      icon: <FileText size={14} />,
    },
    {
      value: 'features',
      label: `İç & Dış Özellikler (${propertyFeatures.length})`,
      icon: <ListChecks size={14} />,
    },
    {
      value: 'location',
      label: 'Konum & Harita',
      icon: <MapPin size={14} />,
    },
    {
      value: 'index',
      label: 'Bölge Emlak Endeksi',
      icon: <BarChart3 size={14} />,
    },
  ];

  return (
    <PageContainer size="wide">
      {/* Aşağı kaydırınca üstte sabitlenen kompakt bar (Portal sayesinde sayfa geçiş animasyonundan etkilenmez) */}
      {showStickyBar &&
        createPortal(
          <div className="detail-sticky-scroll-bar">
            <div className="detail-sticky-scroll-inner">
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>
                  {property.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {formatPropertyTypeLabel(property.property_type)} •{' '}
                  {property.room_count} • {property.gross_sqm} m² •{' '}
                  {property.floor_number}. Kat
                </div>
              </div>

              <Tabs
                variant="underline"
                items={sectionTabs}
                value={activeTab}
                onChange={setActiveTab}
                className="sticky-tabs-inline"
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    fontSize: '19px',
                    fontWeight: 800,
                    color: 'var(--color-primary)',
                  }}
                >
                  {formatPriceTL(property.price)}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  pill
                  leftIcon={<Phone size={14} />}
                  onClick={() => setShowPhone((v) => !v)}
                >
                  {showPhone ? phoneDisplay : 'Telefonu Göster'}
                </Button>
                {!isAgent && (
                  <Button
                    variant="outline"
                    size="sm"
                    pill
                    leftIcon={<Calendar size={14} />}
                    onClick={() => setAppointmentModalOpen(true)}
                  >
                    Randevu Al
                  </Button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Üst Breadcrumb & Sonraki İlan > Butonu (Mobilde gizlenir) */}
      <div className="detail-breadcrumb-hide-mobile">
        <Breadcrumb
        items={[
          {
            label: 'Ana Sayfa',
            onClick: () =>
              onBackToMarketplace({
                listingType: 'ALL',
                city: '',
                district: '',
                neighborhood: '',
              }),
          },
          {
            label: formatListingTypeLabel(property.listing_type),
            onClick: () =>
              onBackToMarketplace({
                listingType: property.listing_type,
                city: '',
                district: '',
                neighborhood: '',
              }),
          },
          {
            label: `${property.city} ${formatListingTypeLabel(property.listing_type)}`,
            onClick: () =>
              onBackToMarketplace({
                listingType: property.listing_type,
                city: property.city,
                district: '',
                neighborhood: '',
              }),
          },
          {
            label: property.district,
            onClick: () =>
              onBackToMarketplace({
                listingType: property.listing_type,
                city: property.city,
                district: property.district,
                neighborhood: '',
              }),
          },
          {
            label: property.neighborhood,
            onClick: () =>
              onBackToMarketplace({
                listingType: property.listing_type,
                city: property.city,
                district: property.district,
                neighborhood: property.neighborhood,
              }),
          },
          { label: `${150000 + property.id}-${property.agency_id}` },
        ]}
        rightAction={
          nextProperty && (
            <Button
              variant="outline"
              size="sm"
              pill
              rightIcon={<ChevronRight size={14} />}
              onClick={() => onSelectProperty(nextProperty)}
            >
              Sonraki İlan
            </Button>
          )
        }
        />
      </div>

      <DetailSplitLayout
        main={
          <>
            {/* 1. Oran Korumalı (contain) Fotoğraf Galerisi */}
            <PropertyGallery
              images={gallery}
              title={property.title}
              propertyId={property.id}
              isFavorited={isFavorited}
              hideFavorite={isAgent}
              onToggleFavorite={() => void handleToggleFavorite()}
            />

            {/* 2. Başlık, Fiyat ve Hızlı Aksiyonlar Kartı */}
            <Card className="detail-title-card">
              <div className="detail-title-row">
                <div>
                  <h1 className="detail-main-heading">{property.title}</h1>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '6px',
                      color: 'var(--color-text-muted)',
                      fontSize: '13.5px',
                    }}
                  >
                    <MapPin size={15} color="var(--color-primary)" />
                    <span>
                      {property.city} / {property.district} /{' '}
                      {property.neighborhood}
                    </span>
                  </div>
                </div>
                <div className="detail-main-price">
                  {formatPriceTL(property.price)}
                </div>
              </div>

              <div className="detail-quick-bar">
                <div className="detail-quick-specs">
                  <span>{formatPropertyTypeLabel(property.property_type)}</span>
                  <span className="detail-quick-spec-item">
                    <BedDouble size={16} color="var(--color-text-muted)" />
                    <span>{property.room_count}</span>
                  </span>
                  <span className="detail-quick-spec-item">
                    <Maximize2 size={15} color="var(--color-text-muted)" />
                    <span>{property.gross_sqm} m²</span>
                  </span>
                  {property.property_type !== 'ARSA' && (
                    <span className="detail-quick-spec-item">
                      <Layers size={16} color="var(--color-text-muted)" />
                      <span>{property.floor_number}. Kat</span>
                    </span>
                  )}
                </div>

                <div className="detail-quick-actions">
                  {!isAgent && (
                    <Button
                      variant={isFavorited ? 'outline-primary' : 'outline'}
                      size="sm"
                      pill
                      leftIcon={
                        <Heart
                          size={14}
                          fill={isFavorited ? 'currentColor' : 'none'}
                        />
                      }
                      onClick={() => void handleToggleFavorite()}
                    >
                      {isFavorited ? 'Favorilerimde' : 'Favoriye Ekle'}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    pill
                    leftIcon={<Printer size={14} />}
                    onClick={() =>
                      window.open(
                        buildPropertyPrintSheetUrl(property.id, null, true),
                        '_blank',
                      )
                    }
                  >
                    A4 Bilgi Fişi
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    pill
                    leftIcon={<Share2 size={14} />}
                    onClick={() => {
                      void navigator.clipboard?.writeText(window.location.href);
                      onNotify('İlan bağlantısı panoya kopyalandı.');
                    }}
                  >
                    Paylaş
                  </Button>
                </div>

                {/* Yalnızca Mobilde Üst Kartta Görünen Hızlı İletişim & Randevu Butonları */}
                <div className="detail-mobile-contact-row">
                  <Button
                    variant="primary"
                    size="sm"
                    pill
                    fullWidth
                    leftIcon={<Phone size={14} />}
                    onClick={() => setShowPhone((v) => !v)}
                  >
                    {showPhone ? phoneDisplay : 'Telefonu Göster'}
                  </Button>
                  {!isAgent && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      pill
                      fullWidth
                      leftIcon={<Calendar size={14} />}
                      onClick={() => setAppointmentModalOpen(true)}
                    >
                      Randevu Al
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* 3. GİB AI Akıllı Özet Kutusu (Açıklama, Özellikler ve Veritabanı Endeksi ile Üretilir) */}
            <Card variant="ai-summary" padding="md">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    fontWeight: 800,
                    fontSize: '14.5px',
                  }}
                >
                  <Sparkles size={16} color="var(--color-ai-accent)" />
                  <span>
                    GİB{' '}
                    <span style={{ color: 'var(--color-ai-accent)' }}>
                      AI Akıllı Özet
                    </span>
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="xs"
                  pill
                  leftIcon={<Volume2 size={14} />}
                  onClick={handleSpeakSummary}
                >
                  {speaking ? 'Okumayı Durdur' : 'Sesli Oku'}
                </Button>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '13.5px',
                  lineHeight: 1.6,
                  color: 'var(--color-text-body)',
                }}
              >
                {aiSummaryText}
              </p>
            </Card>

            {/* 4. Tıklananı Açan Sekmeli (Tab Menü) İçerik */}
            <Tabs
              variant="pills"
              items={sectionTabs}
              value={activeTab}
              onChange={setActiveTab}
            />

            {activeTab === 'specs' && (
              <Card>
                <h3
                  style={{
                    margin: '0 0 16px',
                    fontSize: '17px',
                    fontWeight: 700,
                  }}
                >
                  İlan Bilgileri
                </h3>
                <SpecGrid items={specItems} />
              </Card>
            )}

            {activeTab === 'description' && (
              <Card>
                <h3
                  style={{
                    margin: '0 0 12px',
                    fontSize: '17px',
                    fontWeight: 700,
                  }}
                >
                  İlan Açıklaması
                </h3>
                <div
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.7,
                    color: 'var(--color-text-body)',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {property.agent_description}
                </div>
              </Card>
            )}

            {activeTab === 'features' && (
              <Card>
                <h3
                  style={{
                    margin: '0 0 14px',
                    fontSize: '17px',
                    fontWeight: 700,
                  }}
                >
                  Seçili İç ve Dış Özellikler
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(210px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {propertyFeatures.map((feat) => (
                    <div
                      key={feat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--color-bg-surface-alt)',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={15} color="var(--color-whatsapp)" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'location' && (
              <Card>
                <h3
                  style={{
                    margin: '0 0 10px',
                    fontSize: '17px',
                    fontWeight: 700,
                  }}
                >
                  Konum ve Harita Görünümü
                </h3>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13.5px',
                    color: 'var(--color-text-body)',
                    marginBottom: '14px',
                  }}
                >
                  <MapPin size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      property.latitude && property.longitude
                        ? `${property.latitude},${property.longitude}`
                        : `${property.address_detail}, ${property.neighborhood}, ${property.district}, ${property.city}`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--color-primary)',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                    title="Google Haritalar'da aç"
                  >
                    <span>
                      {property.neighborhood}, {property.address_detail} —{' '}
                      <strong>
                        {property.district} / {property.city}
                      </strong>
                    </span>
                    <ExternalLink size={14} style={{ flexShrink: 0 }} />
                  </a>
                </div>
                <div
                  style={{
                    height: '380px',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border-default)',
                  }}
                >
                  <PropertyMapView
                    properties={[property]}
                    favoriteIds={
                      isFavorited ? new Set([property.id]) : new Set()
                    }
                    hideCustomerActions={isAgent}
                    initialFocusSingle
                    onSelectProperty={() => {}}
                    onToggleFavorite={() => void handleToggleFavorite()}
                  />
                </div>
              </Card>
            )}

            {activeTab === 'index' && (
              <Card>
                <PropertyIndexChart
                  property={property}
                  allProperties={allProperties}
                />
              </Card>
            )}
          </>
        }
        sidebar={
          <>
            {/* Sağ Emlak Ofisi & Danışman Kartı (Sadeleştirilmiş: Mavi tik, WhatsApp, TTBS ve İşletme Ünvanı kaldırıldı) */}
            <Card>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div
                  className="agency-side-header"
                  onClick={() => onSelectAgency(property.agency_id || 1)}
                >
                  <Avatar
                    src={property.agency?.logo_url}
                    name={agencyName}
                    size="lg"
                    shape="rounded"
                  />
                  <div>
                    <div className="agency-side-title">
                      <span>{agencyName}</span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                        marginTop: '2px',
                      }}
                    >
                      {property.agency?.district ?? property.district} /{' '}
                      {property.agency?.city ?? property.city}
                    </div>
                  </div>
                </div>

                {/* Sorumlu Danışman Satırı */}
                <div className="advisor-side-row">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                      {advisor.full_name}
                    </div>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        marginTop: '3px',
                        color: 'var(--color-primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      onClick={() =>
                        onSelectAgency(property.agency_id || 1, advisor.id)
                      }
                    >
                      <span>Danışmanın Diğer İlanları</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                  <Avatar
                    src={advisor.avatar_url}
                    name={advisor.full_name}
                    size="md"
                    shape="rounded"
                  />
                </div>

                {/* İletişim ve Randevu Butonları (WhatsApp kaldırıldı) */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px',
                  }}
                >
                  <Button
                    variant="primary"
                    size="lg"
                    pill
                    fullWidth
                    leftIcon={<Phone size={16} />}
                    onClick={() => setShowPhone((v) => !v)}
                  >
                    {showPhone ? phoneDisplay : 'Telefonu Göster'}
                  </Button>

                  {!isAgent && (
                    <>
                      <Button
                        variant="outline"
                        size="lg"
                        pill
                        fullWidth
                        leftIcon={<Calendar size={16} />}
                        onClick={() => setAppointmentModalOpen(true)}
                      >
                        Yerinde Gösterim Randevusu Al
                      </Button>

                      {hasChatAccess && (
                        <Button
                          variant="outline-primary"
                          size="lg"
                          pill
                          fullWidth
                          leftIcon={<MessageSquare size={16} />}
                          onClick={() => void handleOpenChat()}
                        >
                          Danışmana Mesaj Gönder
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* Güvenlik Hatırlatmaları Kartı */}
            <Card>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '8px',
                }}
              >
                <Badge variant="primary">i</Badge>
                <span style={{ fontWeight: 700, fontSize: '13.5px' }}>
                  Güvenlik Hatırlatmaları
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '12.5px',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.5,
                }}
              >
                Kiralama veya satın alma sürecinde, taşınmazı yerinde görmeden
                ve resmi sözleşme imzalamadan kapora ya da ön ödeme
                göndermeyiniz.
              </p>
            </Card>

            {/* Firmanın Diğer İlanları Kartı */}
            {agencyOtherListings.length > 0 && (
              <Card>
                <h4
                  style={{
                    margin: '0 0 12px',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  Firmanın Diğer İlanları
                </h4>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {agencyOtherListings.map((other) => (
                    <div
                      key={other.id}
                      className="other-listing-mini-item"
                      onClick={() => onSelectProperty(other)}
                    >
                      <img
                        src={getPropertyGallery(other)[0]}
                        alt={other.title}
                        className="other-listing-mini-img"
                      />
                      <div>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {other.title}
                        </div>
                        <div
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 800,
                            marginTop: '3px',
                          }}
                        >
                          {formatPriceTL(other.price)}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {other.district}, {other.neighborhood}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        }
      />

      <AppointmentModal
        property={appointmentModalOpen ? property : null}
        session={session}
        onClose={() => setAppointmentModalOpen(false)}
        onBooked={(msg) => {
          setHasChatAccess(true);
          onNotify(msg);
        }}
        onRequireAuth={() =>
          onRequireAuth('Randevu oluşturmak için lütfen giriş yapınız.')
        }
      />
    </PageContainer>
  );
}

export default PropertyDetailPage;
