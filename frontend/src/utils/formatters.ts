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

/** Türk Lirası (₺) para birimi biçimlendiricisi (Örn: ₺26.500). */
export function formatCurrencyTRY(amount: number): string {
  if (!Number.isFinite(amount)) return '₺0';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const LISTING_TYPE_LABELS: Record<string, string> = {
  SATILIK: 'Satılık',
  KIRALIK: 'Kiralık',
};

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  DAIRE: 'Daire',
  VILLA: 'Villa',
  ISYERI: 'İşyeri',
  ARSA: 'Arsa',
};

export const HEATING_TYPE_LABELS: Record<string, string> = {
  DOGALGAZ_KOMBI: 'Doğalgaz Kombi',
  MERKEZI: 'Merkezi Sistem',
  YERDEN_ISITMA: 'Yerden Isıtma',
  KLIMA: 'Klima',
  SOBA: 'Soba',
};

export const PROPERTY_STATUS_LABELS: Record<string, string> = {
  AKTIF: 'Aktif',
  SATILDI: 'Satıldı',
  KIRALANDI: 'Kiralandı',
  PASIF: 'Pasif',
};

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  ALICI: 'Alıcı',
  SATICI: 'Satıcı',
  KIRALAYAN: 'Kiralayan (Mülk Sahibi)',
  KIRACI: 'Kiracı',
};
