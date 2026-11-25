/**
 * Form alanları için metin, telefon ve Türkçe karakter düzenleyici yardımcılar.
 */

/** Türkiye telefon formatına (0 (5XX) XXX XX XX) çevirir, harfleri engeller. */
export function formatTurkishPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length > 0 && digits[0] !== '0') {
    digits = `0${digits}`;
  }
  digits = digits.slice(0, 11);

  if (digits.length === 0) return '';
  if (digits.length <= 1) return digits;
  if (digits.length <= 4) return `${digits[0]} (${digits.slice(1)}`;
  if (digits.length <= 7) {
    return `${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
  }
  if (digits.length <= 9) {
    return `${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return `${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}

/** Sadece rakam girişine izin verir (TTBS Belge No, Vergi No, TC Kimlik). */
export function formatDigitsOnly(raw: string, maxLength: number): string {
  return raw.replace(/\D/g, '').slice(0, maxLength);
}

/** Ad ve soyad alanlarında rakam girişini engeller. */
export function sanitizeNameInput(raw: string): string {
  return raw.replace(/[0-9]/g, '');
}

export function extractDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Türkçe harf duyarsız arama normalleştiricisi.
 * "İstanbul" -> "istanbul", "İzmir" -> "izmir", "Çankaya" -> "cankaya"
 */
export function normalizeTurkish(text: string): string {
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/** Türk Lirası para birimi formatlayıcısı (Örn: ₺26.500). */
export function formatCurrencyTRY(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return '-';
  }
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

/** ISO tarih metnini Türkçe tarih formatına (GG.AA.YYYY) çevirir. */
export function formatDateTR(iso: string | null | undefined): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** ISO tarih-saat metnini Türkçe formatına (GG.AA.YYYY SS:DD) çevirir. */
export function formatDateTimeTR(iso: string | null | undefined): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  ALICI: 'Alıcı',
  SATICI: 'Satıcı',
  KIRALAYAN: 'Kiralık Mülk Sahibi',
  KIRACI: 'Kiracı',
};

export function formatCustomerTypeLabel(type: string): string {
  return CUSTOMER_TYPE_LABELS[type] ?? type;
}

export const CUSTOMER_SOURCE_LABELS: Record<string, string> = {
  MANUEL: 'Manuel Kayıt',
  SELF_KAYIT: 'Web Üyeliği',
};

export function formatCustomerSourceLabel(source: string): string {
  return CUSTOMER_SOURCE_LABELS[source] ?? source;
}

export const LISTING_TYPE_LABELS: Record<string, string> = {
  SATILIK: 'Satılık',
  KIRALIK: 'Kiralık',
};

export function formatListingTypeLabel(type: string): string {
  return LISTING_TYPE_LABELS[type] ?? type;
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  DAIRE: 'Daire',
  VILLA: 'Villa',
  ISYERI: 'İşyeri / Ofis',
  ARSA: 'Arsa',
};

export function formatPropertyTypeLabel(type: string): string {
  return PROPERTY_TYPE_LABELS[type] ?? type;
}

export const HEATING_TYPE_LABELS: Record<string, string> = {
  DOGALGAZ_KOMBI: 'Doğalgaz Kombi',
  MERKEZI: 'Merkezi Sistem',
  YERDEN_ISITMA: 'Yerden Isıtma',
  KLIMA: 'Klima',
  SOBA: 'Soba',
};

export function formatHeatingTypeLabel(type: string): string {
  return HEATING_TYPE_LABELS[type] ?? type;
}

export const PROPERTY_STATUS_LABELS: Record<string, string> = {
  AKTIF: 'Aktif',
  SATILDI: 'Satıldı',
  KIRALANDI: 'Kiralandı',
  PASIF: 'Pasif',
};

export function formatPropertyStatusLabel(status: string): string {
  return PROPERTY_STATUS_LABELS[status] ?? status;
}

export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  FIZIKI: 'Fiziki Gösterim',
  TELEFON: 'Telefon Görüşmesi',
};

export function formatAppointmentTypeLabel(type: string): string {
  return APPOINTMENT_TYPE_LABELS[type] ?? type;
}

export const APPOINTMENT_PURPOSE_LABELS: Record<string, string> = {
  ILAN_GOSTERIMI: 'İlan Gösterimi',
  MULK_SATIS_YETKISI: 'Mülk Satış / Kiralama Yetkisi',
  GENEL_DANISMANLIK: 'Genel Danışmanlık',
};

export function formatAppointmentPurposeLabel(purpose: string): string {
  return APPOINTMENT_PURPOSE_LABELS[purpose] ?? purpose;
}

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  AKTIF: 'Aktif',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL_EDILDI: 'İptal Edildi',
};

export function formatAppointmentStatusLabel(status: string): string {
  return APPOINTMENT_STATUS_LABELS[status] ?? status;
}
