/**
 * Uygulama genelinde paylaşılan temel TypeScript veri tipleri.
 */

export interface SessionAgency {
  id: number;
  name: string;
  authorized_person: string;
  phone: string;
  mobile_phone?: string | null;
  fax?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  address: string;
  ttbs_document_no: string;
  is_ttbs_verified: boolean;
  logo_url?: string | null;
}

export interface SessionCustomer {
  id: number;
  full_name: string;
  customer_type: string;
  mobile_phone: string;
}

export interface UserSession {
  [key: string]: unknown;
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: 'AGENT' | 'CUSTOMER' | 'VISITOR';
  agency: SessionAgency | null;
  customer: SessionCustomer | null;
}

export interface AgencyRecord {
  [key: string]: unknown;
  id: number;
  name: string;
  authorized_person: string;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  phone: string;
  mobile_phone: string;
  fax: string;
  tax_office: string;
  tax_number: string;
  ttbs_document_no: string;
  is_ttbs_verified: boolean;
  logo_url: string;
  description: string;
  stats: {
    property_count: number;
    active_property_count: number;
    customer_count: number;
    appointment_count: number;
  };
}

export type CustomerType = 'ALICI' | 'SATICI' | 'KIRALAYAN' | 'KIRACI';

export interface CustomerRecord {
  [key: string]: unknown;
  id: number;
  agency_id: number | null;
  first_name: string;
  last_name: string;
  full_name?: string;
  mobile_phone: string;
  home_phone: string;
  email: string;
  tc_identity_no: string;
  is_tc_verified: boolean;
  customer_type: CustomerType;
  source: string;
  notes: string;
  created_at: string;
  owned_property_count?: number;
}

export type ListingType = 'SATILIK' | 'KIRALIK';
export type PropertyType = 'DAIRE' | 'VILLA' | 'ISYERI' | 'ARSA';
export type RoomCountType = '1+0' | '1+1' | '2+1' | '3+1' | '4+1' | '5+1';
export type HeatingType =
  | 'DOGALGAZ_KOMBI'
  | 'MERKEZI'
  | 'YERDEN_ISITMA'
  | 'KLIMA'
  | 'SOBA';
export type PropertyStatus = 'AKTIF' | 'SATILDI' | 'KIRALANDI' | 'PASIF';

export interface PropertyOwnerSummary {
  id: number;
  full_name: string;
  mobile_phone: string;
  tc_identity_no: string;
  is_tc_verified: boolean;
  customer_type: string;
}

export interface PropertyRecord {
  [key: string]: unknown;
  id: number;
  agency_id: number;
  owner_customer_id: number;
  title: string;
  listing_type: ListingType;
  property_type: PropertyType;
  gross_sqm: number;
  net_sqm: number;
  room_count: string;
  floor_number: number;
  building_floors: number;
  heating_type: HeatingType;
  price: number;
  city: string;
  district: string;
  neighborhood: string;
  address_detail: string;
  agent_description: string;
  status: PropertyStatus;
  is_owner_id_verified: boolean;
  image_url: string;
  created_at: string;
  owner: PropertyOwnerSummary | null;
}

export interface PropertyCounts {
  ALL: number;
  AKTIF: number;
  SATILDI: number;
  KIRALANDI: number;
  PASIF: number;
  [key: string]: number;
}

export interface LocationOption {
  id: number;
  name: string;
}

export interface TTBSVerifyResult {
  is_valid: boolean;
  ttbs_document_no: string;
  province: string;
  ministry: string;
  status: string;
  message: string;
}

export interface DbTableSummary {
  [key: string]: unknown;
  table_name: string;
  module: string;
  description: string;
  row_count: number;
}

export interface SystemOverview {
  connected: boolean;
  info: string;
  tables: DbTableSummary[];
}

export type NavDestination =
  | 'agency'
  | 'customers'
  | 'properties'
  | 'search'
  | 'calendar'
  | 'ai-match'
  | 'reports'
  | 'marketplace'
  | 'sell-request'
  | 'auth'
  | 'system';

export const VISITOR_SESSION: UserSession = {
  id: 0,
  full_name: 'Ziyaretçi',
  email: '',
  phone: '',
  role: 'VISITOR',
  agency: null,
  customer: null,
};

export const DEFAULT_AGENT_SESSION: UserSession = {
  id: 1,
  full_name: 'Selim Karahan',
  email: 'selim@baskentvizyon.com.tr',
  phone: '0 (532) 411 22 33',
  role: 'AGENT',
  agency: {
    id: 1,
    name: 'Başkent Vizyon Gayrimenkul A.Ş.',
    authorized_person: 'Selim Karahan',
    phone: '0 (312) 468 10 20',
    mobile_phone: '0 (532) 411 22 33',
    fax: '0 (312) 468 10 21',
    city: 'Ankara',
    district: 'Çankaya',
    neighborhood: 'Kızılırmak Mah.',
    address: 'Dumlupınar Blv. Next Level A Blok No:3/42',
    ttbs_document_no: '0600482',
    is_ttbs_verified: true,
    logo_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200',
  },
  customer: null,
};
