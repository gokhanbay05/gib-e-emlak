import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserCheck,
} from 'lucide-react';
import { fetchAgencies } from '../api/agencies';
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from '../api/favorites';
import { fetchProperties } from '../api/properties';
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Select,
} from '../components/core';
import { DetailSplitLayout, PageContainer } from '../components/layout';
import AppointmentModal from '../components/modals/AppointmentModal';
import PropertyHorizontalCard from '../components/property/PropertyHorizontalCard';
import {
  getAdvisorsForAgency,
  getPropertyAdvisor,
} from '../lib/advisors';
import type { AgencyRecord, PropertyRecord, UserSession } from '../types';

export interface AgencyStorefrontPageProps {
  agencyId: number | null;
  initialAdvisorId: number | null;
  session: UserSession;
  onSelectProperty: (property: PropertyRecord) => void;
  onSelectAgency: (agencyId: number, advisorId?: number) => void;
  onBackToMarketplace: () => void;
  onRequireAuth: (reason: string) => void;
  onNotify: (msg: string) => void;
}

/**
 * Hepsiemlak Screenshot #12 (Şahmeran Emlak Konut / Danışmanlarımız) birebir
 * Kurumsal Emlak Ofisi Vitrini ve Çoklu Danışman Portföy Sayfası.
 */
export function AgencyStorefrontPage({
  agencyId,
  initialAdvisorId,
  session,
  onSelectProperty,
  onSelectAgency,
  onBackToMarketplace,
  onRequireAuth,
  onNotify,
}: AgencyStorefrontPageProps) {
  const [agencies, setAgencies] = useState<AgencyRecord[]>([]);
  const [activeAgencyId, setActiveAgencyId] = useState<number>(agencyId || 1);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<number | null>(
    initialAdvisorId,
  );
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<string>('created_at:desc');
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [showOfficePhone, setShowOfficePhone] = useState(false);
  const [appointmentProperty, setAppointmentProperty] =
    useState<PropertyRecord | null>(null);

  const isAgent = session.role === 'AGENT';

  useEffect(() => {
    if (agencyId) setActiveAgencyId(agencyId);
    setSelectedAdvisorId(initialAdvisorId);
  }, [agencyId, initialAdvisorId]);

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
    } else {
      await addFavorite(session.id, propertyId);
      setFavoriteIds((prev) => new Set(prev).add(propertyId));
    }
  };

  return (
    <PageContainer size="wide">
      <Breadcrumb
        items={[
          { label: 'Ana Sayfa', onClick: onBackToMarketplace },
          {
            label: currentAgency?.name ?? 'Emlak Ofisi',
            onClick: () => setSelectedAdvisorId(null),
          },
          ...(selectedAdvisor ? [{ label: selectedAdvisor.full_name }] : []),
        ]}
        rightAction={
          agencies.length > 1 && (
            <Select
              selectSize="sm"
              pill
              value={String(activeAgencyId)}
              onChange={(val) => {
                const nextId = Number(val);
                setActiveAgencyId(nextId);
                setSelectedAdvisorId(null);
                onSelectAgency(nextId);
              }}
              options={agencies.map((a) => ({
                value: String(a.id),
                label: a.name,
              }))}
            />
          )
        }
      />

      {/* Üst Emlak Ofisi Kurumsal Kimlik Kartı (Screenshot #12) */}
      <Card padding="lg" style={{ marginBottom: '22px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 280px',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <Avatar
              src={currentAgency?.logo_url}
              name={currentAgency?.name ?? 'Ofis'}
              size="xl"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>
                  {currentAgency?.name ?? 'Başkent Vizyon Gayrimenkul A.Ş.'}
                </h1>
                <CheckCircle2
                  size={20}
                  fill="var(--color-verified)"
                  color="#ffffff"
                />
              </div>

              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Badge variant="primary">Kurumsal Üye • 14. Yıl</Badge>
                <span>
                  {currentAgency?.district ?? 'Çankaya'} /{' '}
                  {currentAgency?.city ?? 'Ankara'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#f59e0b',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                <span style={{ color: 'var(--color-text-dark)' }}>4.9</span>
                <Star size={14} fill="#f59e0b" />
                <Star size={14} fill="#f59e0b" />
                <Star size={14} fill="#f59e0b" />
                <Star size={14} fill="#f59e0b" />
                <Star size={14} fill="#f59e0b" />
                <span
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--color-text-muted)',
                    marginLeft: '4px',
                  }}
                >
                  GİB Doğrulanmış İşletme
                </span>
              </div>

              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: '13.5px',
                  color: 'var(--color-text-body)',
                }}
              >
                {currentAgency?.description ||
                  '1998 yılından bugüne Ticaret Bakanlığı Taşınmaz Ticareti Yetki Belgeli kurumsal gayrimenkul danışmanlığı hizmetinizdeyiz.'}
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              paddingLeft: '24px',
              borderLeft: '1px solid var(--color-border-default)',
            }}
          >
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

      {/* Alt 2 Sütun: Sol "Danışmanlarımız" | Sağ Danışman/Ofis İlanları (Screenshot #12) */}
      <DetailSplitLayout
        sidebarPosition="left"
        sidebar={
          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800 }}>
                Danışmanlarımız ({advisors.length})
              </h3>
              {selectedAdvisorId && (
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedAdvisorId(null)}
                >
                  Tümünü Gör
                </button>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
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
            <div className="results-header-card">
              <div className="results-count-text">
                <strong>
                  {selectedAdvisor
                    ? selectedAdvisor.full_name.toLocaleUpperCase('tr-TR')
                    : currentAgency?.name ?? 'Emlak Ofisi'}
                </strong>{' '}
                için <strong>{displayedProperties.length}</strong> ilan bulundu
              </div>

              <div className="results-toolbar-right">
                <Select
                  selectSize="sm"
                  pill
                  value={propertyTypeFilter}
                  onChange={setPropertyTypeFilter}
                  options={[
                    { value: 'ALL', label: 'Emlak Türüne Göre Filtrele (Tümü)' },
                    { value: 'DAIRE', label: 'Konut / Daire' },
                    { value: 'VILLA', label: 'Villa' },
                    { value: 'ISYERI', label: 'İşyeri' },
                    { value: 'ARSA', label: 'Arsa' },
                  ]}
                />

                {selectedAdvisor && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    pill
                    leftIcon={<UserCheck size={14} />}
                    onClick={() => setSelectedAdvisorId(null)}
                  >
                    {selectedAdvisor.full_name} ✕
                  </Button>
                )}

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
                  onSelectAgency={(agId, advId) => {
                    setActiveAgencyId(agId);
                    if (advId) setSelectedAdvisorId(advId);
                  }}
                  onRequestAppointment={(prop) => setAppointmentProperty(prop)}
                />
              ))}
            </div>
          </>
        }
      />

      <AppointmentModal
        property={appointmentProperty}
        session={session}
        onClose={() => setAppointmentProperty(null)}
        onBooked={onNotify}
        onRequireAuth={() =>
          onRequireAuth('Randevu oluşturmak için lütfen giriş yapınız.')
        }
      />
    </PageContainer>
  );
}

export default AgencyStorefrontPage;
