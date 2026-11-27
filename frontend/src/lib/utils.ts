import type { PropertyRecord } from '../types';

/**
 * GeoSocial tarzı atomik CSS sınıf birleştirici yardımcı fonksiyon.
 */
export function cn(
  ...inputs: Array<string | number | boolean | null | undefined>
): string {
  return inputs
    .filter((x): x is string | number => typeof x === 'string' || typeof x === 'number')
    .map((x) => String(x).trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Harita pinleri ve özet rozetler için kompakt Türk Lirası formatlayıcı.
 * Örn: 5250000 -> "5,25 M TL", 26500 -> "26.500 TL"
 */
export function formatCompactPriceTRY(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return '-';
  }
  const value = Number(amount);
  if (value >= 1_000_000) {
    const millions = (value / 1_000_000).toLocaleString('tr-TR', {
      minimumFractionDigits: value % 1_000_000 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return `${millions} M TL`;
  }
  return `${value.toLocaleString('tr-TR')} TL`;
}

/**
 * Hepsiemlak tarzı tam fiyat gösterimi (Örn: "5.390.000 TL").
 */
export function formatPriceTL(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return '-';
  }
  return `${Number(amount).toLocaleString('tr-TR')} TL`;
}

const FALLBACK_GALLERY_POOL = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
];

/**
 * Her gayrimenkul için en az 5 adet yüksek çözünürlüklü galeri görseli döndürür.
 */
export function getPropertyGallery(property: PropertyRecord): string[] {
  const raw = Array.isArray(property.images)
    ? property.images.filter((u) => typeof u === 'string' && u.trim().length > 0)
    : [];
  const main = property.image_url?.trim();
  const combined: string[] = [];
  if (main) combined.push(main);
  for (const url of raw) {
    if (!combined.includes(url)) combined.push(url);
  }
  let idx = property.id % FALLBACK_GALLERY_POOL.length;
  while (combined.length < 5) {
    const candidate = FALLBACK_GALLERY_POOL[idx % FALLBACK_GALLERY_POOL.length];
    if (!combined.includes(candidate)) {
      combined.push(candidate);
    } else {
      combined.push(`${candidate}&v=${combined.length}`);
    }
    idx += 1;
  }
  return combined.slice(0, 6);
}

const ISTANBUL_WEEKDAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'] as const;

/**
 * ISO tarih dizesini Europe/Istanbul (+03:00) saat diliminde "YYYY-MM-DD" anahtarına çevirir.
 */
export function toIstanbulDateKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
}

/**
 * ISO tarih dizesini Europe/Istanbul (+03:00) saat diliminde "HH:00" veya "HH:MM" biçimine çevirir.
 */
export function toIstanbulTimeHHMM(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '00:00';
  return date.toLocaleTimeString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * "YYYY-MM-DD" tarihinin Türkiye (+03:00) gün kısaltmasını döndürür ("Pzt".."Paz").
 */
export function getIstanbulWeekdayShort(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return 'Pzt';
  return ISTANBUL_WEEKDAYS[date.getDay()] ?? 'Pzt';
}
