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
  avatar_url?: string;
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
  working_hours?: {
    start_hour: number;
    end_hour: number;
    working_days: string[];
  };
  review_stats?: {
    average: number;
    count: number;
  };
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
  [key: string]: number;
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
  images?: string[];
  building_age?: number;
  bathroom_count?: number;
  is_credit_eligible?: boolean;
  is_furnished?: boolean;
  deed_status?: string;
  usage_status?: string;
  features?: string[];
  advisor_name?: string;
  latitude?: number;
  longitude?: number;
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

export interface PropertyAgencySummary {
  id: number;
  name: string;
  authorized_person: string;
  phone: string;
  mobile_phone: string;
  fax: string;
  tax_office: string;
  tax_number: string;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  ttbs_document_no: string;
  is_ttbs_verified: boolean;
  logo_url: string;
}

export interface PropertyOwnerSummary {
  id: number;
  full_name: string;
  mobile_phone: string;
  home_phone?: string;
  email?: string;
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
  images?: string[];
  building_age?: number;
  bathroom_count?: number;
  is_credit_eligible?: boolean;
  is_furnished?: boolean;
  deed_status?: string;
  usage_status?: string;
  features?: string[];
  advisor_name?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  owner: PropertyOwnerSummary | null;
  agency?: PropertyAgencySummary | null;
}

export interface SearchRequestRecord {
  [key: string]: unknown;
  id: number;
  agency_id: number | null;
  customer_id: number;
  customer_name: string;
  customer_type: string;
  customer_phone: string;
  listing_type: string;
  property_type: string;
  min_sqm: number | null;
  max_sqm: number | null;
  room_count: string;
  floor_preference: number | null;
  heating_type: string;
  min_price: number | null;
  max_price: number | null;
  city: string;
  district: string;
  natural_language_prompt: string;
  created_at: string;
}

export interface PropertyInfoSheetData {
  document_no: string;
  generated_at: string;
  property: PropertyRecord;
  seeker_customer: {
    id: number;
    full_name: string;
    customer_type: string;
    mobile_phone: string;
    home_phone: string;
    email: string;
    tc_identity_no: string;
    notes: string;
  } | null;
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
  | 'agencies-directory'
  | 'agency-storefront'
  | 'customers'
  | 'properties'
  | 'search'
  | 'calendar'
  | 'ai-match'
  | 'reports'
  | 'marketplace'
  | 'property-detail'
  | 'sell-request'
  | 'profile'
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

export interface FavoriteItemRecord {
  [key: string]: unknown;
  id: number;
  user_id: number;
  property_id: number;
  created_at: string;
  property: PropertyRecord | null;
}

export interface AgencySellRequestPayload {
  owner_first_name: string;
  owner_last_name: string;
  mobile_phone: string;
  email?: string;
  tc_identity_no?: string;
  listing_type: ListingType;
  property_type: PropertyType;
  room_count: string;
  gross_sqm: number;
  expected_price: number;
  city: string;
  district: string;
  neighborhood: string;
  address_detail?: string;
  property_notes?: string;
}

export interface AgencySellRequestSummary {
  [key: string]: unknown;
  reference_no: string;
  agency_id: number;
  agency_name: string;
  customer_id: number;
  owner_full_name: string;
  mobile_phone: string;
  listing_type: string;
  property_type: string;
  room_count: string;
  gross_sqm: number;
  expected_price: number;
  city: string;
  district: string;
  neighborhood: string;
  notes: string;
  created_at: string;
}

export type AppointmentType = 'FIZIKI' | 'TELEFON';
export type AppointmentPurpose =
  | 'ILAN_GOSTERIMI'
  | 'MULK_SATIS_YETKISI'
  | 'GENEL_DANISMANLIK';
export type AppointmentStatus = 'AKTIF' | 'TAMAMLANDI' | 'IPTAL_EDILDI';

export interface CalendarAppointmentRecord {
  [key: string]: unknown;
  id: number;
  agency_id: number;
  agency_name: string;
  property_id: number | null;
  property_title: string;
  property_location: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_type: string;
  advisor_name?: string;
  appointment_type: AppointmentType;
  purpose: AppointmentPurpose;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  meeting_notes: string;
  rating_dismissed?: boolean;
  rating_submitted?: boolean;
  cancelled_by?: string;
  cancel_reason?: string;
  cancelled_at: string | null;
  can_cancel: boolean;
  hours_until_start: number;
  created_at: string;
}

export interface BlockedSlotRecord {
  [key: string]: unknown;
  id: number;
  agency_id: number;
  advisor_name?: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_at: string;
}

export interface CalendarCounts {
  total_appointments: number;
  active_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  blocked_slots_count: number;
}

export interface CalendarOverviewResponse {
  agency_id: number;
  appointments: CalendarAppointmentRecord[];
  blocked_slots: BlockedSlotRecord[];
  counts: CalendarCounts;
  working_hours: {
    start_hour: number;
    end_hour: number;
    working_days?: string[];
  };
}

export interface BlockedSlotCreatePayload {
  agency_id: number;
  advisor_name?: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export interface AgencyReviewRecord {
  id: number;
  agency_id: number;
  appointment_id: number | null;
  reviewer_name: string;
  advisor_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface PendingReviewItem {
  appointment_id: number;
  agency_id: number;
  agency_name: string;
  advisor_name: string;
  property_title: string;
  start_time: string;
}

export interface ChatThreadRecord {
  id: number;
  agency_id: number;
  agency_name: string;
  agency_logo: string;
  customer_id: number;
  customer_name: string;
  customer_avatar: string;
  property_id: number | null;
  property_title: string;
  appointment_id: number | null;
  advisor_name: string;
  thread_type: string;
  subject: string;
  last_message: string;
  last_message_at: string;
}

export interface ChatMessageRecord {
  id: number;
  thread_id: number;
  sender_role: 'CUSTOMER' | 'AGENT' | string;
  sender_name: string;
  sender_avatar: string;
  content: string;
  created_at: string;
}
