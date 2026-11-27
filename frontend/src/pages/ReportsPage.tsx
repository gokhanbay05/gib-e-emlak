import React, { useEffect, useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { fetchCalendarOverview } from '../api/appointments';
import { fetchCustomers } from '../api/customers';
import { fetchProperties } from '../api/properties';
import { Badge, Card } from '../components/core';
import { PageContainer } from '../components/layout';
import { formatPriceTL } from '../lib/utils';
import type { PropertyCounts, PropertyRecord, UserSession } from '../types';

export interface ReportsPageProps {
  session: UserSession;
}

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
  const [customerTotal, setCustomerTotal] = useState(0);
  const [appointmentTotal, setAppointmentTotal] = useState(0);

  useEffect(() => {
    void fetchProperties({ agency_id: agencyId })
      .then((res) => {
        setProperties(res.properties);
        setCounts(res.counts);
      })
      .catch(() => {});
    void fetchCustomers({ agency_id: agencyId })
      .then((res) => setCustomerTotal(res.counts.ALL))
      .catch(() => {});
    void fetchCalendarOverview({ agency_id: agencyId })
      .then((res) => setAppointmentTotal(res.counts.total_appointments))
      .catch(() => {});
  }, [agencyId]);

  const totalPortfolioVolume = properties
    .filter((p) => p.listing_type === 'SATILIK')
    .reduce((acc, p) => acc + Number(p.price || 0), 0);

  return (
    <PageContainer size="wide" title="Performans & Analitik">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Building2 size={24} color="var(--color-primary)" />
            <div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                Toplam Portföy İlanı
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>
                {counts.ALL}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={24} color="var(--color-whatsapp)" />
            <div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                Satılan / Kiralanan
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>
                {counts.SATILDI + counts.KIRALANDI}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={24} color="var(--color-verified)" />
            <div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                Kayıtlı Müşteri Portföyü
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>
                {customerTotal}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={24} color="var(--color-ai-accent)" />
            <div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                Toplam Gösterim Randevusu
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>
                {appointmentTotal}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card padding="lg">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={20} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
              Satılık Portföy Toplam Değer Hacmi
            </h3>
          </div>
          <Badge variant="primary">{formatPriceTL(totalPortfolioVolume)}</Badge>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          {[
            { label: 'Aktif İlanlar', count: counts.AKTIF, variant: 'success' as const },
            { label: 'Satışı Tamamlanan', count: counts.SATILDI, variant: 'primary' as const },
            { label: 'Kiralaması Tamamlanan', count: counts.KIRALANDI, variant: 'verified' as const },
            { label: 'Pasif İlanlar', count: counts.PASIF, variant: 'neutral' as const },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-bg-surface-alt)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 600 }}>{item.label}</span>
              <Badge variant={item.variant}>{item.count} İlan</Badge>
            </div>
          ))}
        </div>
      </Card>
    </PageContainer>
  );
}

export default ReportsPage;
