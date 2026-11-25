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
  full_name: string;
  mobile_phone: string;
  home_phone: string;
  email: string;
  tc_identity_no: string;
  is_tc_verified: boolean;
  customer_type: CustomerType;
  source: string;
  notes: string;
  property_count: number;
  appointment_count: number;
  search_request_count: number;
  created_at: string;
}

export interface CustomerCategoryCounts {
  ALL: number;
  ALICI: number;
  SATICI: number;
  KIRALAYAN: number;
  KIRACI: number;
}

export interface CustomerOwnedProperty {
  [key: string]: unknown;
  id: number;
  title: string;
  listing_type: string;
  property_type: string;
  room_count: string;
  gross_sqm: number;
  net_sqm: number;
  floor_number: number;
  building_floors: number;
  heating_type: string;
  price: number;
  city: string;
  district: string;
  neighborhood: string;
  status: string;
  is_owner_id_verified: boolean;
  image_url: string;
  created_at: string;
}

export interface CustomerAppointmentItem {
  [key: string]: unknown;
  id: number;
  appointment_type: string;
  purpose: string;
  property_id: number | null;
  property_title: string;
  start_time: string;
  end_time: string;
  status: string;
  meeting_notes: string;
}

export interface CustomerSearchRequestItem {
  [key: string]: unknown;
  id: number;
  listing_type: string;
  property_type: string | null;
  room_count: string | null;
  min_sqm: number | null;
  max_sqm: number | null;
  min_price: number | null;
  max_price: number | null;
  city: string | null;
  district: string | null;
  natural_language_prompt: string | null;
  created_at: string;
}

export interface CustomerDetailRecord extends CustomerRecord {
  owned_properties: CustomerOwnedProperty[];
  appointments: CustomerAppointmentItem[];
  search_requests: CustomerSearchRequestItem[];
}

export interface CustomerCreatePayload {
  agency_id: number;
  first_name: string;
  last_name: string;
  mobile_phone: string;
  home_phone?: string;
  email?: string;
  tc_identity_no?: string;
  customer_type: CustomerType | string;
  notes?: string;
}

export interface CustomerUpdatePayload {
  first_name: string;
  last_name: string;
  mobile_phone: string;
  home_phone?: string;
  email?: string;
  tc_identity_no?: string;
  customer_type: CustomerType | string;
  notes?: string;
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
