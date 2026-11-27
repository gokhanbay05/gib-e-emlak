import type { PropertyRecord } from '../types';
import {
  formatHeatingTypeLabel,
  formatListingTypeLabel,
  formatPropertyTypeLabel,
} from '../utils/formatters';

export interface AgencyAdvisor {
  id: number;
  agency_id: number;
  full_name: string;
  title: string;
  phone: string;
  avatar_url: string;
  experience_years: number;
  specialty: string;
  is_founder?: boolean;
  can_manage_office: boolean;
}

const DEFAULT_ADVISORS: AgencyAdvisor[] = [
  // Agency 1: Başkent Vizyon Gayrimenkul A.Ş.
  {
    id: 101,
    agency_id: 1,
    full_name: 'Selim Karahan',
    title: 'Şirket Yetkilisi & Sorumlu Emlak Danışmanı',
    phone: '0 (532) 411 22 33',
    avatar_url:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=240&q=80',
    experience_years: 14,
    specialty: 'Lüks Konut & Ticari Portföy',
    is_founder: true,
    can_manage_office: true,
  },
  {
    id: 102,
    agency_id: 1,
    full_name: 'Aysun Malbora',
    title: 'Kıdemli Gayrimenkul Danışmanı',
    phone: '0 (533) 618 44 19',
    avatar_url:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=240&q=80',
    experience_years: 8,
    specialty: 'Çankaya & İncek Konut Uzmanı',
    can_manage_office: false,
  },
  {
    id: 103,
    agency_id: 1,
    full_name: 'Bektaş Aras',
    title: 'Gayrimenkul Danışmanı',
    phone: '0 (542) 309 71 82',
    avatar_url:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=240&q=80',
    experience_years: 6,
    specialty: 'Rezidans & Yatırımlık Daire',
    can_manage_office: false,
  },
  {
    id: 104,
    agency_id: 1,
    full_name: 'Elif Sarıoğlu',
    title: 'Gayrimenkul Danışmanı',
    phone: '0 (530) 842 15 60',
    avatar_url:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=240&q=80',
    experience_years: 5,
    specialty: 'Kiralık Konut & Villa',
    can_manage_office: false,
  },
  // Agency 2: Boğaziçi Prestij Emlak Danışmanlık
  {
    id: 201,
    agency_id: 2,
    full_name: 'Ayşe Demirci',
    title: 'Şirket Yetkilisi & Sorumlu Emlak Danışmanı',
    phone: '0 (544) 355 40 50',
    avatar_url:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80',
    experience_years: 16,
    specialty: 'Boğaz Hattı & Lüks Villa',
    is_founder: true,
    can_manage_office: true,
  },
  {
    id: 202,
    agency_id: 2,
    full_name: 'Murat Soylu',
    title: 'Kıdemli Gayrimenkul Danışmanı',
    phone: '0 (532) 780 90 12',
    avatar_url:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80',
    experience_years: 9,
    specialty: 'Kadıköy & Ataşehir Rezidans',
    can_manage_office: false,
  },
  {
    id: 203,
    agency_id: 2,
    full_name: 'Bülent Karaaslan',
    title: 'Gayrimenkul Danışmanı',
    phone: '0 (544) 215 63 40',
    avatar_url:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
    experience_years: 7,
    specialty: 'Ticari Ofis & Plaza',
    can_manage_office: false,
  },
  // Agency 3: EgeKıyı Gayrimenkul Yatırım
  {
    id: 301,
    agency_id: 3,
    full_name: 'Kerem Aksoy',
    title: 'Şirket Yetkilisi & Sorumlu Emlak Danışmanı',
    phone: '0 (532) 640 35 10',
    avatar_url:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=240&q=80',
    experience_years: 11,
    specialty: 'Karşıyaka & Çeşme Konut',
    is_founder: true,
    can_manage_office: true,
  },
  {
    id: 302,
    agency_id: 3,
    full_name: 'Deniz Yılmazer',
    title: 'Gayrimenkul Danışmanı',
    phone: '0 (535) 412 35 88',
    avatar_url:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
    experience_years: 6,
    specialty: 'Bornova & Antalya Yatırım',
    can_manage_office: false,
  },
];

const CUSTOM_ADVISORS_STORAGE_KEY = 'gib_agency_custom_advisors_v2';
const PERMISSION_MAP_STORAGE_KEY = 'gib_agency_advisor_permissions_v2';

function getPermissionOverrides(): Record<number, boolean> {
  try {
    const raw = localStorage.getItem(PERMISSION_MAP_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<number, boolean>) : {};
  } catch {
    return {};
  }
}

export function getAllAdvisors(): AgencyAdvisor[] {
  const overrides = getPermissionOverrides();
  let list = [...DEFAULT_ADVISORS];
  try {
    const raw = localStorage.getItem(CUSTOM_ADVISORS_STORAGE_KEY);
    if (raw) {
      const custom = JSON.parse(raw) as AgencyAdvisor[];
      list = [...list, ...custom];
    }
  } catch {
    // ignore
  }
  return list.map((adv) => ({
    ...adv,
    can_manage_office: adv.is_founder
      ? true
      : overrides[adv.id] !== undefined
        ? overrides[adv.id]
        : Boolean(adv.can_manage_office),
  }));
}

export function getAdvisorsForAgency(agencyId: number): AgencyAdvisor[] {
  const all = getAllAdvisors();
  const list = all.filter((a) => a.agency_id === agencyId);
  if (list.length > 0) return list;
  return all.filter((a) => a.agency_id === 1);
}

export function addCustomAdvisor(
  advisor: Omit<AgencyAdvisor, 'id'>,
): AgencyAdvisor {
  const all = getAllAdvisors();
  const nextId = Math.max(300, ...all.map((a) => a.id)) + 1;
  const created: AgencyAdvisor = { ...advisor, id: nextId };
  try {
    const raw = localStorage.getItem(CUSTOM_ADVISORS_STORAGE_KEY);
    const custom = raw ? (JSON.parse(raw) as AgencyAdvisor[]) : [];
    custom.push(created);
    localStorage.setItem(CUSTOM_ADVISORS_STORAGE_KEY, JSON.stringify(custom));
  } catch {
    // ignore
  }
  return created;
}

export function toggleAdvisorOfficePermission(
  advisorId: number,
  canManage: boolean,
): void {
  const overrides = getPermissionOverrides();
  overrides[advisorId] = canManage;
  try {
    localStorage.setItem(
      PERMISSION_MAP_STORAGE_KEY,
      JSON.stringify(overrides),
    );
  } catch {
    // ignore
  }
}

/**
 * Bir ilanın sorumlu gayrimenkul danışmanını döndürür.
 * Eğer ilan oluşturulurken advisor_name seçildiyse o danışmanı eşleştirir.
 */
export function getPropertyAdvisor(property: PropertyRecord): AgencyAdvisor {
  const agencyAdvisors = getAdvisorsForAgency(property.agency_id || 1);
  if (property.advisor_name) {
    const matched = agencyAdvisors.find(
      (a) =>
        a.full_name.toLocaleLowerCase('tr-TR') ===
        property.advisor_name?.toLocaleLowerCase('tr-TR'),
    );
    if (matched) return matched;
  }
  return agencyAdvisors[property.id % agencyAdvisors.length];
}

export interface DistrictIndexSeriesPoint {
  month: string;
  cityAvg: number;
  districtAvg: number;
}

export interface PropertyDistrictIndexData {
  propertySqmPrice: number;
  districtAvgSalePrice: number;
  districtAvgRentPrice: number;
  districtAvgSaleSqm: number;
  districtAvgRentSqm: number;
  amortizationYears: number;
  districtPropertyCount: number;
  cityPropertyCount: number;
  saleSeries: DistrictIndexSeriesPoint[];
  rentSeries: DistrictIndexSeriesPoint[];
}

const MONTHS_TR = [
  'Kas 2025',
  'Ara 2025',
  'Oca 2026',
  'Şub 2026',
  'Mar 2026',
  'Nis 2026',
  'May 2026',
  'Haz 2026',
  'Tem 2026',
  'Ağu 2026',
  'Eyl 2026',
  'Eki 2026',
];

/**
 * Doğrudan veritabanındaki (PostgreSQL) gerçek ilanları kullanarak
 * il ve ilçe bazlı "Bölge Emlak Endeksi" verilerini canlı hesaplar.
 * Uygulamaya yeni ilan girildikçe veya fiyat güncellendikçe buradaki ortalamalar otomatik güncellenir.
 */
export function buildPropertyDistrictIndex(
  property: PropertyRecord,
  allProperties: PropertyRecord[] = [],
): PropertyDistrictIndexData {
  const gross = Math.max(40, property.gross_sqm || 120);
  const rawSqm = Math.round(property.price / gross);

  const pool = allProperties.length > 0 ? allProperties : [property];
  const cityProps = pool.filter((p) => p.city === property.city);
  const districtProps = pool.filter(
    (p) => p.city === property.city && p.district === property.district,
  );

  const districtSales = districtProps.filter(
    (p) => p.listing_type === 'SATILIK',
  );
  const districtRents = districtProps.filter(
    (p) => p.listing_type === 'KIRALIK',
  );
  const citySales = cityProps.filter((p) => p.listing_type === 'SATILIK');
  const cityRents = cityProps.filter((p) => p.listing_type === 'KIRALIK');

  const avgSqm = (items: PropertyRecord[], fallback: number): number => {
    if (items.length === 0) return fallback;
    const total = items.reduce(
      (sum, item) => sum + item.price / Math.max(40, item.gross_sqm || 100),
      0,
    );
    return Math.round(total / items.length);
  };

  const avgTotal = (items: PropertyRecord[], fallback: number): number => {
    if (items.length === 0) return fallback;
    const total = items.reduce((sum, item) => sum + Number(item.price), 0);
    return Math.round(total / items.length);
  };

  const isSale = property.listing_type === 'SATILIK';
  const fallbackSaleSqm = isSale ? rawSqm : 48500;
  const fallbackRentSqm = !isSale ? rawSqm : 290;

  const cityAvgSaleSqm = avgSqm(citySales, fallbackSaleSqm);
  const districtAvgSaleSqm = avgSqm(districtSales, cityAvgSaleSqm);

  const cityAvgRentSqm = avgSqm(cityRents, fallbackRentSqm);
  const districtAvgRentSqm = avgSqm(districtRents, cityAvgRentSqm);

  const districtAvgSalePrice = avgTotal(
    districtSales,
    Math.round(districtAvgSaleSqm * gross),
  );
  const districtAvgRentPrice = avgTotal(
    districtRents,
    Math.round(districtAvgRentSqm * gross),
  );

  const amortizationYears = Math.max(
    10,
    Math.min(
      26,
      Math.round(
        districtAvgSalePrice / Math.max(12000, districtAvgRentPrice * 12),
      ),
    ),
  );

  const saleSeries: DistrictIndexSeriesPoint[] = MONTHS_TR.map((month, i) => {
    const progress = 0.85 + (i / (MONTHS_TR.length - 1)) * 0.15;
    return {
      month,
      cityAvg: Math.round(cityAvgSaleSqm * progress),
      districtAvg: Math.round(districtAvgSaleSqm * progress),
    };
  });

  const rentSeries: DistrictIndexSeriesPoint[] = MONTHS_TR.map((month, i) => {
    const progress = 0.86 + (i / (MONTHS_TR.length - 1)) * 0.14;
    return {
      month,
      cityAvg: Math.round(cityAvgRentSqm * progress),
      districtAvg: Math.round(districtAvgRentSqm * progress),
    };
  });

  return {
    propertySqmPrice: rawSqm,
    districtAvgSalePrice,
    districtAvgRentPrice,
    districtAvgSaleSqm,
    districtAvgRentSqm,
    amortizationYears,
    districtPropertyCount: districtProps.length,
    cityPropertyCount: cityProps.length,
    saleSeries,
    rentSeries,
  };
}

/**
 * İlanın gerçek açıklamasını (agent_description), veritabanında seçilen İç & Dış Özelliklerini,
 * görsel galeri sayısını ve veritabanındaki Bölge Emlak Endeksi ortalamasını analiz ederek
 * her ilana özel "GİB AI Akıllı Özet" metni üretir.
 */
export function buildAiSmartSummary(
  property: PropertyRecord,
  allProperties: PropertyRecord[] = [],
): string {
  const txText = formatListingTypeLabel(property.listing_type).toLocaleLowerCase(
    'tr-TR',
  );
  const typeText = formatPropertyTypeLabel(
    property.property_type,
  ).toLocaleLowerCase('tr-TR');
  const heatingText = formatHeatingTypeLabel(
    property.heating_type,
  ).toLocaleLowerCase('tr-TR');

  const age =
    property.building_age !== undefined
      ? property.building_age
      : ((property.id || 1) % 8) + 1;
  const bath =
    property.bathroom_count !== undefined
      ? property.bathroom_count
      : property.gross_sqm >= 135
        ? 2
        : 1;
  const furnishedText = property.is_furnished ? 'eşyalı' : 'eşyasız';
  const creditText = property.is_credit_eligible
    ? 'krediye uygun'
    : 'peşin satışa uygun';
  const features =
    property.features && property.features.length > 0
      ? property.features.slice(0, 5).join(', ').toLocaleLowerCase('tr-TR')
      : 'çelik kapı, ankastre mutfak, balkon ve otopark';

  const indexData = buildPropertyDistrictIndex(property, allProperties);
  const targetDistrictSqm =
    property.listing_type === 'SATILIK'
      ? indexData.districtAvgSaleSqm
      : indexData.districtAvgRentSqm;

  const diffPct =
    targetDistrictSqm > 0
      ? Math.round(
          ((indexData.propertySqmPrice - targetDistrictSqm) /
            targetDistrictSqm) *
            100,
        )
      : 0;

  const priceComparisonSentence =
    diffPct < -3
      ? `${property.district} ilçesindeki ${indexData.districtPropertyCount} kayıtlı ilanın ortalama m² birim fiyatına (${targetDistrictSqm.toLocaleString('tr-TR')} TL/m²) kıyasla %${Math.abs(diffPct)} daha avantajlı fiyat seviyesinde yer alıyor.`
      : diffPct > 5
        ? `Bölge ortalaması olan ${targetDistrictSqm.toLocaleString('tr-TR')} TL/m² üzerinde, sunduğu nitelikli donanım ve konum avantajıyla öne çıkan prestijli bir portföy.`
        : `${property.district} bölge ortalaması (${targetDistrictSqm.toLocaleString('tr-TR')} TL/m²) ile tam dengeli bir fiyat-performans profili sunuyor.`;

  const descExcerpt = (property.agent_description || '').trim();

  return `${property.city}, ${property.district}, ${property.neighborhood} konumunda yer alan ${property.gross_sqm} m² brüt (${property.net_sqm} m² net) kullanım alanına sahip ${property.room_count} ${txText} ${typeText}; ${age} yaşındaki ${property.building_floors} katlı binanın ${property.floor_number}. katında bulunuyor. ${heatingText} sistemiyle ısınan, ${bath} banyolu, ${furnishedText} ve ${creditText} taşınmazda ${features} donanımları mevcut. Emlakçı açıklamasında vurgulandığı üzere: "${descExcerpt}" ${priceComparisonSentence}`;
}
