import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';
import { fetchAgencies } from '../api/agencies';
import { fetchDistricts, fetchProvinces } from '../api/locations';
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Input,
  Select,
} from '../components/core';
import { PageContainer, SidebarFilterLayout } from '../components/layout';
import { getAdvisorsForAgency } from '../lib/advisors';
import type { AgencyRecord, LocationOption } from '../types';
import { normalizeTurkish } from '../utils/formatters';

export interface AgenciesDirectoryPageProps {
  committedSearchQuery: string;
  onSelectAgency: (agencyId: number) => void;
  onBackToHome: () => void;
}

/**
 * Madde 2: Listbox yerine ilanlar gibi filtrelenebilen "Emlak Ofisleri" rehber sayfası.
 */
export function AgenciesDirectoryPage({
  committedSearchQuery,
  onSelectAgency,
  onBackToHome,
}: AgenciesDirectoryPageProps) {
  const [agencies, setAgencies] = useState<AgencyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [nameFilter, setNameFilter] = useState('');

  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);

  useEffect(() => {
    setLoading(true);
    void fetchAgencies()
      .then((res) => setAgencies(res.agencies))
      .finally(() => setLoading(false));
    void fetchProvinces()
      .then((res) => setProvinces(res.provinces))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!city) {
      setDistricts([]);
      setDistrict('');
      return;
    }
    const found = provinces.find((p) => p.name === city);
    if (!found) return;
    void fetchDistricts(found.id)
      .then((res) => setDistricts(res.districts))
      .catch(() => {});
  }, [city, provinces]);

  const filteredAgencies = useMemo(() => {
    const q = normalizeTurkish(
      `${committedSearchQuery} ${nameFilter}`.trim(),
    );
    return agencies.filter((ag) => {
      if (city && ag.city !== city) return false;
      if (district && ag.district !== district) return false;
      if (q) {
        const hay = normalizeTurkish(
          `${ag.name} ${ag.authorized_person} ${ag.city} ${ag.district} ${ag.neighborhood} ${ag.ttbs_document_no}`,
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [agencies, city, district, nameFilter, committedSearchQuery]);

  const resetFilters = () => {
    setCity('');
    setDistrict('');
    setNameFilter('');
  };

  const filterContent = (
    <>
      <div className="filter-group-block">
        <div className="filter-group-title">Ofis veya Yetkili Ara</div>
        <Input
          inputSize="sm"
          icon={<Search size={14} />}
          placeholder="Ofis adı, yetkili veya belge no..."
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
        />
      </div>

      <div className="filter-group-block">
        <div className="filter-group-title">Konum</div>
        <Select
          value={city}
          onChange={setCity}
          placeholder="Tüm İller"
          options={provinces.map((p) => ({ value: p.name, label: p.name }))}
        />
        <Select
          value={district}
          onChange={setDistrict}
          placeholder="Tüm İlçeler"
          disabled={!city}
          options={districts.map((d) => ({ value: d.name, label: d.name }))}
        />
      </div>
    </>
  );

  const filterFooter = (
    <Button
      variant="outline"
      pill
      fullWidth
      leftIcon={<RotateCcw size={14} />}
      onClick={resetFilters}
    >
      Filtreleri Sıfırla
    </Button>
  );

  return (
    <PageContainer size="wide">
      <Breadcrumb
        items={[
          { label: 'Ana Sayfa', onClick: onBackToHome },
          { label: 'Yetki Belgeli Emlak Ofisleri' },
        ]}
      />

      <SidebarFilterLayout
        filterContent={filterContent}
        filterFooter={filterFooter}
      >
        <div className="results-header-card">
          <div className="results-count-text">
            <strong>Kayıtlı Emlak İşletmeleri</strong> için{' '}
            <strong>{filteredAgencies.length}</strong> emlak ofisi bulundu
          </div>
        </div>

        {loading ? (
          <Card padding="lg">
            <div
              style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}
            >
              Emlak ofisleri yükleniyor...
            </div>
          </Card>
        ) : filteredAgencies.length === 0 ? (
          <Card padding="lg">
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              Aradığınız kriterlere uygun emlak ofisi bulunamadı.
            </div>
          </Card>
        ) : (
          <div className="property-cards-stack">
            {filteredAgencies.map((ag) => {
              const advisors = getAdvisorsForAgency(ag.id);
              return (
                <Card
                  key={ag.id}
                  variant="interactive"
                  padding="lg"
                  onClick={() => onSelectAgency(ag.id)}
                >
                  <div className="agency-dir-row">
                    <div
                      style={{
                        display: 'flex',
                        gap: '18px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Avatar
                        src={ag.logo_url}
                        name={ag.name}
                        size="xl"
                        shape="rounded"
                      />
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: 800,
                            color: 'var(--color-text-dark)',
                          }}
                        >
                          {ag.name}
                        </h3>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            fontSize: '13px',
                            color: 'var(--color-text-body)',
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
                              {ag.district} / {ag.city}
                            </strong>{' '}
                            ({ag.neighborhood})
                          </span>
                          <span>•</span>
                          <span>
                            Yetkili: <strong>{ag.authorized_person}</strong>
                          </span>
                          <span>•</span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Phone size={13} />
                            {ag.phone}
                          </span>
                        </div>

                        <p
                          style={{
                            margin: '2px 0 4px',
                            fontSize: '13px',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {ag.description}
                        </p>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <Badge
                            variant="warning"
                            icon={
                              <Star
                                size={12}
                                fill="#f59e0b"
                                color="#f59e0b"
                              />
                            }
                          >
                            {(ag.review_stats?.average ?? 0).toFixed(1)} (
                            {ag.review_stats?.count ?? 0})
                          </Badge>
                          <Badge
                            variant="neutral"
                            icon={
                              <ShieldCheck
                                size={13}
                                color="var(--color-whatsapp)"
                              />
                            }
                          >
                            TTBS: {ag.ttbs_document_no}
                          </Badge>
                          <Badge
                            variant="primary"
                            icon={<Building2 size={13} />}
                          >
                            {ag.stats.active_property_count} İlan
                          </Badge>
                          <Badge variant="neutral" icon={<Users size={13} />}>
                            {advisors.length} Danışman
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="agency-dir-cta">
                      <Button
                        variant="outline-primary"
                        pill
                        rightIcon={<ArrowRight size={15} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAgency(ag.id);
                        }}
                      >
                        Ofis İlanlarını Gör
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </SidebarFilterLayout>
    </PageContainer>
  );
}

export default AgenciesDirectoryPage;
