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
}

const DEFAULT_ADVISORS: AgencyAdvisor[] = [
  // Agency 1: Başkent Vizyon Gayrimenkul A.Ş.
  {
    id: 101,
    agency_id: 1,
    full_name: 'Selim Karahan',
    title: 'Şirket Yetkilisi & Sorumlu Emlak Danışmanı',
    phone: '0 (532) 411 22 33',
    avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=240&q=80',
    experience_years: 14,
    specialty: 'Lüks Konut & Ticari Portföy',
  },
  {
    id: 102,
    agency_id: 1,
    full_name: 'Aysun Malbora',
    title: 'Kıdemli Gayrimenkul Danışmanı',
    phone: '0 (533) 618 44 19',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=240&q=80',
    experience_years: 8,
    specialty: 'Çankaya & İncek Konut Uzmanı',
  },
  {
    id: 103,
    agency_id: 1,
    full_name: 'Bektaş Aras',
    title: 'Gayrimenkul Danışmanı',
    phone: '0 (542) 309 71 82',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=240&q=80',
    experience_years: 6,
    specialty: 'Rezidans & Yatırımlık Daire',
  },
  {
    id: 104,
    agency_id: 1,
    full_name: 'Elif Sarıoğlu',
    title: 'Gayrimenkul Danışmanı',
    phone: '0 (530) 842 15 60',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=240&q=80',
    experience_years: 5,
    specialty: 'Kiralık Konut & Villa',
  },
  // Agency 2: Boğaziçi Prestij Emlak Danışmanlık
  {
    id: 201,
    agency_id: 2,
    full_name: 'Murat Soylu',
    title: 'Şirket Yetkilisi',
    phone: '0 (532) 780 90 12',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80',
    experience_years: 16,
    specialty: 'Boğaz Hattı & Lüks Villa',
  },
  {
    id: 202,
    agency_id: 2,
    full_name: 'Zeynep Kıran',
    title: 'Gayrimenkul Danışmanı',
    phone: '0 (535) 492 18 74',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80',
    experience_years: 9,
    specialty: 'Kadıköy & Ataşehir Rezidans',
  },
  {
    id: 203,
    agency_id: 2,
    full_name: 'Bülent Karaaslan',
    title: 'Gayrimenkul Danışmanı',
    phone: '0 (544) 215 63 40',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
    experience_years: 7,
    specialty: 'Ticari Ofis & Plaza',
  },
];

const CUSTOM_ADVISORS_STORAGE_KEY = 'gib_agency_custom_advisors_v1';

export function getAllAdvisors(): AgencyAdvisor[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ADVISORS_STORAGE_KEY);
    if (!raw) return DEFAULT_ADVISORS;
    const custom = JSON.parse(raw) as AgencyAdvisor[];
    return [...DEFAULT_ADVISORS, ...custom];
  } catch {
    return DEFAULT_ADVISORS;
  }
}

export function getAdvisorsForAgency(agencyId: number): AgencyAdvisor[] {
  const all = getAllAdvisors();
  const list = all.filter((a) => a.agency_id === agencyId);
  if (list.length > 0) return list;
  return DEFAULT_ADVISORS.filter((a) => a.agency_id === 1);
}

export function addCustomAdvisor(advisor: Omit<AgencyAdvisor, 'id'>): AgencyAdvisor {
  const all = getAllAdvisors();
  const nextId = Math.max(300, ...all.map((a) => a.id)) + 1;
  const created: AgencyAdvisor = { ...advisor, id: nextId };
  try {
    const raw = localStorage.getItem(CUSTOM_ADVISORS_STORAGE_KEY);
    const custom = raw ? (JSON.parse(raw) as AgencyAdvisor[]) : [];
    custom.push(created);
    localStorage.setItem(CUSTOM_ADVISORS_STORAGE_KEY, JSON.stringify(custom));
  } catch {
    // ignore storage errors
  }
  return created;
}

/**
 * Bir ilanın sorumlu gayrimenkul danışmanını döndürür.
 */
export function getPropertyAdvisor(property: PropertyRecord): AgencyAdvisor {
  const agencyAdvisors = getAdvisorsForAgency(property.agency_id || 1);
  return agencyAdvisors[property.id % agencyAdvisors.length];
}

/**
 * Hepsiemlak Screenshot #7 tarzı "GİB AI Akıllı Özet" metni üretir.
 */
export function buildAiSmartSummary(property: PropertyRecord): string {
  const txText = formatListingTypeLabel(property.listing_type).toLocaleLowerCase('tr-TR');
  const typeText = formatPropertyTypeLabel(property.property_type).toLocaleLowerCase('tr-TR');
  const heatingText = formatHeatingTypeLabel(property.heating_type).toLocaleLowerCase('tr-TR');
  const sqmPrice = Math.round(property.price / Math.max(1, property.gross_sqm));

  return `${property.city}, ${property.district}, ${property.neighborhood} bölgesinde yer alan ${property.gross_sqm} m² brüt, ${property.net_sqm} m² net kullanım alanına sahip ${property.room_count} ${txText} ${typeText}, ${property.building_floors} katlı binanın ${property.floor_number}. katında bulunuyor. ${heatingText} sistemiyle ısınan taşınmazda ferah yaşam alanı, modern mutfak, balkon ve otopark imkânı sunuluyor. Metrekare birim fiyatı ${sqmPrice.toLocaleString('tr-TR')} TL seviyesinde olan gayrimenkul; toplu taşıma, eğitim kurumları ve alışveriş noktalarına yürüme mesafesinde yüksek yatırım değerine sahip.`;
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
 * Hepsiemlak Screenshot #9 & #10 tarzı "Bölge Emlak Endeksi" verilerini hesaplar.
 */
export function buildPropertyDistrictIndex(
  property: PropertyRecord,
): PropertyDistrictIndexData {
  const gross = Math.max(50, property.gross_sqm || 120);
  const rawSqm = Math.round(property.price / gross);

  const isSale = property.listing_type === 'SATILIK';
  const baseSaleSqm = isSale ? Math.max(24000, rawSqm) : 48500;
  const baseRentSqm = !isSale ? Math.max(180, rawSqm) : 295;

  const districtAvgSaleSqm = Math.round(baseSaleSqm * 1.07);
  const cityAvgSaleSqm = Math.round(baseSaleSqm * 1.01);

  const districtAvgRentSqm = Math.round(baseRentSqm * 1.05);
  const cityAvgRentSqm = Math.round(baseRentSqm * 0.98);

  const districtAvgSalePrice = Math.round(districtAvgSaleSqm * gross);
  const districtAvgRentPrice = Math.round(districtAvgRentSqm * gross);
  const amortizationYears = Math.max(
    11,
    Math.min(22, Math.round(districtAvgSalePrice / (districtAvgRentPrice * 12))),
  );

  const saleSeries: DistrictIndexSeriesPoint[] = MONTHS_TR.map((month, i) => {
    const factor = 0.82 + i * 0.017 + (i % 3 === 0 ? 0.008 : 0);
    return {
      month,
      cityAvg: Math.round(cityAvgSaleSqm * factor),
      districtAvg: Math.round(districtAvgSaleSqm * (factor + 0.015)),
    };
  });

  const rentSeries: DistrictIndexSeriesPoint[] = MONTHS_TR.map((month, i) => {
    const factor = 0.84 + i * 0.016 + (i % 2 === 1 ? 0.006 : 0);
    return {
      month,
      cityAvg: Math.round(cityAvgRentSqm * factor),
      districtAvg: Math.round(districtAvgRentSqm * (factor + 0.018)),
    };
  });

  return {
    propertySqmPrice: rawSqm,
    districtAvgSalePrice,
    districtAvgRentPrice,
    districtAvgSaleSqm,
    districtAvgRentSqm,
    amortizationYears,
    saleSeries,
    rentSeries,
  };
}
