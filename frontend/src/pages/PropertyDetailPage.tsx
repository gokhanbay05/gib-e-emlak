import React, { useEffect, useState } from 'react';
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
  MessageCircle,
  Phone,
  Printer,
  Share2,
  ShieldCheck,
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
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  SpecGrid,
  Tabs,
  type SpecGridItem,
} from '../components/core';
import { DetailSplitLayout, PageContainer } from '../components/layout';
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
  onBackToMarketplace: () => void;
  onRequireAuth: (reason: string) => void;
  onNotify: (msg: string) => void;
}

const INTERIOR_FEATURES = [
  'Çelik Kapı',
  'Ankastre Mutfak',
  'Ebeveyn Banyosu',
  'Balkon',
  'Görüntülü Diafon',
  'Fiber İnternet',
  'Parke & Seramik Zemin',
  'Vestiyer',
];

const EXTERIOR_FEATURES = [
  'Açık & Kapalı Otopark',
  '7/24 Güvenlik & Kamera',
  'Asansör',
  'Isı Yalıtımı (Mantolama)',
  'Çocuk Oyun Alanı',
  'Jeneratör & Hidrofor',
];

export function PropertyDetailPage({
  propertyId,
  initialProperty,
  session,
  onSelectProperty,
  onSelectAgency,
  onBackToMarketplace,
  onRequireAuth,
  onNotify,
}: PropertyDetailPageProps) {
  const [property, setProperty] = useState<PropertyRecord | null>(
    initialProperty,
  );
  const [allProperties, setAllProperties] = useState<PropertyRecord[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [activeSection, setActiveSection] = useState('specs');
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
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
    const onScroll = () => {
      setShowStickyBar(window.scrollY > 520);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!property) {
    return (
      <PageContainer>
        <Card padding="lg">
          <div style={{ textAlign: 'center' }}>İlan detayı yükleniyor...</div>
        </Card>
      </PageContainer>
    );
  }

  const gallery = getPropertyGallery(property);
  const advisor = getPropertyAdvisor(property);
  const aiSummaryText = buildAiSmartSummary(property);
  const agencyName =
    property.agency?.name ?? 'Başkent Vizyon Gayrimenkul A.Ş.';
  const phoneDisplay =
    property.agency?.phone || advisor.phone || '0 (312) 468 10 20';

  // Sonraki İlan ve Firmanın Diğer İlanları
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
      onRequireAuth('İlanı favorilerinize eklemek için lütfen üye girişi yapınız.');
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

  const scrollToSection = (sec: string) => {
    setActiveSection(sec);
    const el = document.getElementById(`detail-sec-${sec}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Hepsiemlak Screenshot #7: 2 Sütunlu İlan Bilgileri Tablosu
  const specItems: SpecGridItem[] = [
    {
      label: 'İlan No',
      value: `${150000 + property.id}-${property.agency_id}`,
      highlight: true,
    },
    { label: 'Mutfak Tipi', value: 'Kapalı' },
    {
      label: 'Son Güncelleme',
      value: formatDateTR(property.created_at),
    },
    { label: 'Balkon', value: 'Var' },
    {
      label: 'İlan Durumu',
      value: formatListingTypeLabel(property.listing_type),
    },
    { label: 'Otopark', value: 'Açık & Kapalı Otopark' },
    {
      label: 'Konut Tipi',
      value: formatPropertyTypeLabel(property.property_type),
    },
    {
      label: 'Asansör',
      value: property.building_floors >= 3 ? 'Var' : 'Yok',
    },
    { label: 'Oda Sayısı', value: property.room_count },
    {
      label: 'Isınma Tipi',
      value: formatHeatingTypeLabel(property.heating_type),
    },
    { label: 'Banyo Sayısı', value: property.gross_sqm >= 140 ? '2' : '1' },
    {
      label: 'Krediye Uygunluk',
      value: property.listing_type === 'SATILIK' ? 'Uygun' : '-',
    },
    {
      label: 'Brüt / Net m²',
      value: `${property.gross_sqm} m² / ${property.net_sqm} m²`,
    },
    { label: 'Tapu Durumu', value: 'Kat Mülkiyetli' },
    {
      label: 'Kat Sayısı',
      value: `${property.building_floors} Katlı`,
    },
    { label: 'Eşya Durumu', value: 'Eşyalı Değil' },
    {
      label: 'Bulunduğu Kat',
      value: `${property.floor_number}. Kat`,
    },
    { label: 'Kullanım Durumu', value: 'Boş / Hemen Teslim' },
  ];

  const sectionTabs = [
    { value: 'specs', label: 'İlan Bilgileri', icon: <Info size={14} /> },
    {
      value: 'description',
      label: 'İlan Açıklaması',
      icon: <FileText size={14} />,
    },
    { value: 'location', label: 'Konum', icon: <MapPin size={14} /> },
    {
      value: 'features',
      label: 'Özellikler',
      icon: <ListChecks size={14} />,
    },
    {
      value: 'index',
      label: 'Emlak Endeksi',
      icon: <BarChart3 size={14} />,
    },
  ];

  return (
    <PageContainer size="wide">
      {/* Screenshot #8: Aşağı kaydırınca üstte sabitlenen (Sticky) kompakt bar */}
      {showStickyBar && (
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
              value={activeSection}
              onChange={scrollToSection}
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
        </div>
      )}

      {/* Üst Breadcrumb & Sonraki İlan > Butonu (Screenshot #6) */}
      <Breadcrumb
        items={[
          { label: 'Ana Sayfa', onClick: onBackToMarketplace },
          {
            label: formatListingTypeLabel(property.listing_type),
            onClick: onBackToMarketplace,
          },
          {
            label: `${property.city} ${formatListingTypeLabel(property.listing_type)}`,
            onClick: onBackToMarketplace,
          },
          { label: property.district, onClick: onBackToMarketplace },
          { label: property.neighborhood },
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

      <DetailSplitLayout
        main={
          <>
            {/* 1. 5'li Fotoğraf Galerisi (Screenshot #6) */}
            <PropertyGallery
              images={gallery}
              title={property.title}
              propertyId={property.id}
              isFavorited={isFavorited}
              hideFavorite={isAgent}
              onToggleFavorite={() => void handleToggleFavorite()}
            />

            {/* 2. Başlık, Fiyat ve Hızlı Aksiyonlar Kartı (Screenshot #6, #7) */}
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
              </div>
            </Card>

            {/* 3. GİB AI Akıllı Özet Kutusu (Screenshot #7) */}
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
                    GİB <span style={{ color: 'var(--color-ai-accent)' }}>AI Akıllı Özet</span>
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

            {/* 4. Bölüm Gezinme Hap Sekmeleri (Screenshot #7) */}
            <Tabs
              variant="pills"
              items={sectionTabs}
              value={activeSection}
              onChange={scrollToSection}
            />

            {/* 5. İlan Bilgileri 2 Sütunlu Tablo (Screenshot #7) */}
            <div id="detail-sec-specs">
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
            </div>

            {/* 6. İlan Açıklaması (Screenshot #8) */}
            <div id="detail-sec-description">
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
            </div>

            {/* 7. İç & Dış Özellikler */}
            <div id="detail-sec-features">
              <Card>
                <h3
                  style={{
                    margin: '0 0 14px',
                    fontSize: '17px',
                    fontWeight: 700,
                  }}
                >
                  İç ve Dış Özellikler
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {[...INTERIOR_FEATURES, ...EXTERIOR_FEATURES].map((feat) => (
                    <div
                      key={feat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--color-bg-surface-alt)',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      <CheckCircle2 size={15} color="var(--color-whatsapp)" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* 8. Konum Bilgisi */}
            <div id="detail-sec-location">
              <Card>
                <h3
                  style={{
                    margin: '0 0 10px',
                    fontSize: '17px',
                    fontWeight: 700,
                  }}
                >
                  Konum ve Adres Bilgisi
                </h3>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13.5px',
                    color: 'var(--color-text-body)',
                    marginBottom: '12px',
                  }}
                >
                  <MapPin size={16} color="var(--color-primary)" />
                  <span>
                    {property.neighborhood}, {property.address_detail} —{' '}
                    <strong>
                      {property.district} / {property.city}
                    </strong>
                  </span>
                </div>
              </Card>
            </div>

            {/* 9. Bölge Emlak Endeksi ve 12 Aylık m² Fiyat Grafikleri (Screenshot #9 & #10) */}
            <div id="detail-sec-index">
              <Card>
                <PropertyIndexChart property={property} />
              </Card>
            </div>
          </>
        }
        sidebar={
          <>
            {/* Sağ Sabit Emlak Ofisi & Danışman Kartı (Screenshot #6) */}
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
                  onClick={() =>
                    onSelectAgency(property.agency_id || 1)
                  }
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
                      <CheckCircle2
                        size={16}
                        fill="var(--color-verified)"
                        color="#ffffff"
                      />
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                        marginTop: '2px',
                      }}
                    >
                      Kurumsal Üye • {advisor.experience_years}. Yıl
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

                {/* İletişim ve Randevu Butonları */}
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
                  )}

                  <Button
                    variant="whatsapp"
                    size="lg"
                    pill
                    fullWidth
                    leftIcon={<MessageCircle size={16} />}
                    onClick={() =>
                      onNotify(
                        `${advisor.full_name} (${advisor.phone}) ile WhatsApp bağlantısı başlatıldı.`,
                      )
                    }
                  >
                    WhatsApp
                  </Button>
                </div>

                {/* Taşınmaz Ticareti Yetki Belgesi & İşletme Ünvanı Kutuları (Screenshot #6) */}
                <div className="ttbs-gray-box">
                  <span className="ttbs-gray-label">
                    <ShieldCheck size={15} color="var(--color-whatsapp)" />
                    <span>Taşınmaz Ticareti Yetki Belgesi</span>
                  </span>
                  <span className="ttbs-gray-value">
                    {property.agency?.ttbs_document_no ?? '0600482'}
                  </span>
                </div>

                <div className="ttbs-gray-box">
                  <span className="ttbs-gray-label">İşletme Ünvanı</span>
                  <span
                    className="ttbs-gray-value"
                    style={{ textTransform: 'uppercase', fontSize: '11.5px' }}
                  >
                    {agencyName} GAYRİMENKUL VE DANIŞMANLIK TİCARET A.Ş.
                  </span>
                </div>
              </div>
            </Card>

            {/* Güvenlik Hatırlatmaları Kartı (Screenshot #6) */}
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

            {/* Firmanın Diğer İlanları Kartı (Screenshot #6 & #7) */}
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
        onBooked={onNotify}
        onRequireAuth={() =>
          onRequireAuth('Randevu oluşturmak için lütfen giriş yapınız.')
        }
      />
    </PageContainer>
  );
}

export default PropertyDetailPage;
