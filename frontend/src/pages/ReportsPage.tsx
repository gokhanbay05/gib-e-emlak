import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-react';
import { fetchAgencySellRequests } from '../api/agencies';
import { fetchCalendarOverview } from '../api/appointments';
import { fetchCustomers } from '../api/customers';
import { fetchProperties } from '../api/properties';
import { Avatar, Badge, Card } from '../components/core';
import { PageContainer } from '../components/layout';
import {
  getAdvisorsForAgency,
  getPropertyAdvisor,
} from '../lib/advisors';
import { formatPriceTL } from '../lib/utils';
import type {
  AgencySellRequestSummary,
  CalendarCounts,
  CustomerCategoryCounts,
  PropertyCounts,
  PropertyRecord,
  UserSession,
} from '../types';
import {
  formatListingTypeLabel,
  formatPropertyTypeLabel,
} from '../utils/formatters';

export interface ReportsPageProps {
  session: UserSession;
}

/**
 * Madde 10: Gerçek veritabanı verileriyle doldurulmuş kapsamlı Kurumsal Performans & Analitik Sayfası.
 * - Danışman Bazlı Portföy & Hacim Performans Tablosu
 * - İl & İlçe Bazlı Canlı m² Birim Fiyat Analizi
 * - Gayrimenkul Kategorisi ve Randevu Dönüşüm Oranı Çubukları
 * - Gelen Ev Satış & Kiralama Başvuruları
 */
export function ReportsPage({ session }: ReportsPageProps) {
  const agencyId = session.agency?.id ?? 1;
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [counts, setCounts] = useState<PropertyCounts>({
    ALL: 0,
    AKTIF: 0,
    SATILDI: 0,
    KIRALANDI: 0,
    PASIF: 0,
  });
  const [customerCounts, setCustomerCounts] = useState<CustomerCategoryCounts>({
    ALL: 0,
    ALICI: 0,
    SATICI: 0,
    KIRALAYAN: 0,
    KIRACI: 0,
  });
  const [calendarCounts, setCalendarCounts] = useState<CalendarCounts>({
    total_appointments: 0,
    active_appointments: 0,
    completed_appointments: 0,
    cancelled_appointments: 0,
    blocked_slots_count: 0,
  });
  const [sellRequests, setSellRequests] = useState<AgencySellRequestSummary[]>(
    [],
  );

  useEffect(() => {
    void fetchProperties({ agency_id: agencyId })
      .then((res) => {
        setProperties(res.properties);
        setCounts(res.counts);
      })
      .catch(() => {});
    void fetchCustomers({ agency_id: agencyId })
      .then((res) => setCustomerCounts(res.counts))
      .catch(() => {});
    void fetchCalendarOverview({ agency_id: agencyId })
      .then((res) => setCalendarCounts(res.counts))
      .catch(() => {});
    void fetchAgencySellRequests(agencyId)
      .then((res) => setSellRequests(res.sell_requests))
      .catch(() => {});
  }, [agencyId]);

  const advisors = useMemo(() => getAdvisorsForAgency(agencyId), [agencyId]);

  const totalSaleVolume = useMemo(
    () =>
      properties
        .filter((p) => p.listing_type === 'SATILIK')
        .reduce((acc, p) => acc + Number(p.price || 0), 0),
    [properties],
  );

  const totalMonthlyRentVolume = useMemo(
    () =>
      properties
        .filter((p) => p.listing_type === 'KIRALIK')
        .reduce((acc, p) => acc + Number(p.price || 0), 0),
    [properties],
  );

  // Danışman bazlı performans metrikleri
  const advisorMetrics = useMemo(() => {
    return advisors.map((adv) => {
      const assigned = properties.filter(
        (p) => getPropertyAdvisor(p).id === adv.id,
      );
      const activeCount = assigned.filter((p) => p.status === 'AKTIF').length;
      const closedCount = assigned.filter(
        (p) => p.status === 'SATILDI' || p.status === 'KIRALANDI',
      ).length;
      const saleVolume = assigned
        .filter((p) => p.listing_type === 'SATILIK')
        .reduce((sum, p) => sum + Number(p.price || 0), 0);
      return {
        advisor: adv,
        totalListings: assigned.length,
        activeCount,
        closedCount,
        saleVolume,
      };
    });
  }, [advisors, properties]);

  // İlçe bazlı veritabanı m² ortalamaları
  const districtBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        city: string;
        district: string;
        count: number;
        saleSqmTotal: number;
        saleCount: number;
        rentSqmTotal: number;
        rentCount: number;
      }
    >();

    for (const p of properties) {
      const key = `${p.city}-${p.district}`;
      const curr = map.get(key) ?? {
        city: p.city,
        district: p.district,
        count: 0,
        saleSqmTotal: 0,
        saleCount: 0,
        rentSqmTotal: 0,
        rentCount: 0,
      };
      curr.count += 1;
      const unitSqm = p.price / Math.max(40, p.gross_sqm || 100);
      if (p.listing_type === 'SATILIK') {
        curr.saleSqmTotal += unitSqm;
        curr.saleCount += 1;
      } else {
        curr.rentSqmTotal += unitSqm;
        curr.rentCount += 1;
      }
      map.set(key, curr);
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [properties]);

  // Emlak türü dağılımı
  const typeDistribution = useMemo(() => {
    const total = Math.max(1, properties.length);
    return (['DAIRE', 'VILLA', 'ISYERI', 'ARSA'] as const).map((t) => {
      const cnt = properties.filter((p) => p.property_type === t).length;
      return {
        type: t,
        label: formatPropertyTypeLabel(t),
        count: cnt,
        pct: Math.round((cnt / total) * 100),
      };
    });
  }, [properties]);

  return (
    <PageContainer size="wide" title="Performans & Analitik">
      {/* 1. Üst KPI Kartları */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Building2 size={24} color="var(--color-primary)" />
            <div>
              <div
                style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}
              >
                Toplam Portföy ({counts.AKTIF} Aktif)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>
                {counts.ALL} İlan
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingUp size={24} color="var(--color-whatsapp)" />
            <div>
              <div
                style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}
              >
                Satılık Portföy Hacmi
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>
                {formatPriceTL(totalSaleVolume)}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={24} color="var(--color-verified)" />
            <div>
              <div
                style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}
              >
                Kayıtlı Müşteri ({customerCounts.ALICI} Alıcı /{' '}
                {customerCounts.SATICI} Satıcı)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>
                {customerCounts.ALL} Kişi
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={24} color="var(--color-ai-accent)" />
            <div>
              <div
                style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}
              >
                Randevular ({calendarCounts.active_appointments} Aktif /{' '}
                {calendarCounts.completed_appointments} Tamamlanan)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>
                {calendarCounts.total_appointments} Randevu
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 2. Orta 2 Sütun: Danışman Performans Tablosu & Kategori/Randevu Dağılımı */}
      <div className="reports-two-col-wide">
        <Card padding="lg">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 700 }}>
              Danışman Bazlı Portföy Performansı
            </h3>
            <Badge variant="primary">{advisors.length} Danışman</Badge>
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {advisorMetrics.map((m) => (
              <div key={m.advisor.id} className="reports-advisor-row">
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}
                >
                  <Avatar
                    src={m.advisor.avatar_url}
                    name={m.advisor.full_name}
                    size="md"
                    shape="rounded"
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                      {m.advisor.full_name}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {m.advisor.specialty}
                    </div>
                  </div>
                </div>

                <div className="reports-advisor-metrics">
                  <div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Aktif / Kapanan
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px' }}>
                      {m.activeCount} Aktif • {m.closedCount} Satış/Kira
                    </div>
                  </div>
                  <Badge variant="verified">
                    {formatPriceTL(m.saleVolume)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <BarChart3 size={18} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 700 }}>
              Gayrimenkul Türü ve Kira Gelir Dağılımı
            </h3>
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {typeDistribution.map((item) => (
              <div key={item.type}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  <span>{item.label}</span>
                  <span>
                    {item.count} İlan (%{item.pct})
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    borderRadius: '999px',
                    backgroundColor: 'var(--color-bg-muted)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(6, item.pct)}%`,
                      height: '100%',
                      backgroundColor: 'var(--color-primary)',
                      borderRadius: '999px',
                    }}
                  />
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: '8px',
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-bg-surface-alt)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                Aylık Kiralık Portföy Hacmi
              </span>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: 'var(--color-primary)',
                }}
              >
                {formatPriceTL(totalMonthlyRentVolume)} / ay
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Alt 2 Sütun: İlçe Bazlı Emlak Endeksi Tablosu & Son Satış Başvuruları */}
      <div className="reports-two-col-equal">
        <Card padding="lg">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <MapPin size={18} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 700 }}>
              Bölge Bazlı Ortalama m² Birim Fiyatları (Veritabanı)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {districtBreakdown.map((d) => {
              const avgSaleSqm =
                d.saleCount > 0 ? Math.round(d.saleSqmTotal / d.saleCount) : 0;
              const avgRentSqm =
                d.rentCount > 0 ? Math.round(d.rentSqmTotal / d.rentCount) : 0;
              return (
                <div
                  key={`${d.city}-${d.district}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--color-bg-surface-alt)',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {d.district} / {d.city}
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {d.count} Kayıtlı İlan
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {avgSaleSqm > 0 && (
                      <div style={{ fontWeight: 700 }}>
                        Satılık: {avgSaleSqm.toLocaleString('tr-TR')} TL/m²
                      </div>
                    )}
                    {avgRentSqm > 0 && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        Kiralık: {avgRentSqm.toLocaleString('tr-TR')} TL/m²
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card padding="lg">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--color-primary)" />
              <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 700 }}>
                Son Ev Satış & Kiralama Başvuruları
              </h3>
            </div>
            <Badge variant="neutral">{sellRequests.length} Başvuru</Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sellRequests.slice(0, 5).map((req) => (
              <div
                key={req.reference_no}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-bg-surface-alt)',
                  fontSize: '13px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {req.owner_full_name} ({req.mobile_phone})
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {formatListingTypeLabel(req.listing_type)}{' '}
                    {formatPropertyTypeLabel(req.property_type)} •{' '}
                    {req.room_count} ({req.gross_sqm} m²) — {req.district}/
                    {req.city}
                  </div>
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    color: 'var(--color-primary)',
                  }}
                >
                  {formatPriceTL(req.expected_price)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

export default ReportsPage;
