import { z } from 'zod';

const LETTER_REGEX = /[A-Za-zÇĞİÖŞÜçğıöşü]/;
const DIGIT_REGEX = /\d/;
const SYMBOL_REGEX = /[^A-Za-z0-9ÇĞİÖŞÜçğıöşü\s]/;

/**
 * Sadece rakamları alır ve Türkiye telefon formatına (0 (5XX) XXX XX XX) çevirir.
 * Harf veya sembol girilmesini otomatik olarak engeller.
 */
export function formatTurkishPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length > 0 && digits[0] !== '0') {
    digits = '0' + digits;
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

/** Sadece rakam girişine izin verir (TTBS Belge No, TC Kimlik, Vergi No vb.). */
export function formatDigitsOnly(raw: string, maxLength: number): string {
  return raw.replace(/\D/g, '').slice(0, maxLength);
}

/** Ad / Soyad alanlarında rakam girişini engeller. */
export function sanitizeNameInput(raw: string): string {
  return raw.replace(/[0-9]/g, '');
}

export function extractDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

const commonRegisterFields = {
  first_name: z
    .string()
    .trim()
    .min(2, 'Ad alanı en az 2 karakter olmalıdır.')
    .refine((v) => !DIGIT_REGEX.test(v), 'Ad alanı rakam içeremez.'),
  last_name: z
    .string()
    .trim()
    .min(2, 'Soyad alanı en az 2 karakter olmalıdır.')
    .refine((v) => !DIGIT_REGEX.test(v), 'Soyad alanı rakam içeremez.'),
  email: z
    .string()
    .trim()
    .min(1, 'E-posta adresi zorunludur.')
    .email('Lütfen geçerli bir e-posta adresi giriniz.'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter uzunluğunda olmalıdır.')
    .refine((v) => LETTER_REGEX.test(v), 'Şifre en az bir harf içermelidir.')
    .refine((v) => DIGIT_REGEX.test(v), 'Şifre en az bir rakam (0-9) içermelidir.')
    .refine(
      (v) => SYMBOL_REGEX.test(v),
      'Şifre en az bir sembol (!@#$%^&*._- vb.) içermelidir.',
    ),
  phone: z
    .string()
    .refine(
      (v) => {
        const d = extractDigits(v);
        return d.length === 11 && d.startsWith('05');
      },
      'Geçerli bir cep telefonu giriniz (Örn: 0 (532) 123 45 67).',
    ),
};

export const registerCustomerSchema = z.object(commonRegisterFields);

export const registerAgentSchema = z.object({
  ...commonRegisterFields,
  ttbs_document_no: z
    .string()
    .trim()
    .refine(
      (v) => /^\d{7}$/.test(v),
      'BR-01: Taşınmaz Ticareti Yetki Belgesi numarası 7 haneli sayısal olmalıdır (Örn: 0609412).',
    )
    .refine((v) => {
      const code = Number(v.slice(0, 2));
      return code >= 1 && code <= 81;
    }, 'BR-01: İlk 2 hane geçerli bir Türkiye il plaka kodu (01-81) olmalıdır.'),
  agency_name: z
    .string()
    .trim()
    .min(3, 'Emlak Ofisi İsmi en az 3 karakter olmalıdır.'),
  office_phone: z
    .string()
    .refine(
      (v) => {
        const d = extractDigits(v);
        return d.length === 11 && d.startsWith('0');
      },
      'Geçerli bir ofis telefonu giriniz (Örn: 0 (312) 419 88 99).',
    ),
  city: z.string().trim().min(1, 'Lütfen il seçiniz.'),
  district: z.string().trim().min(1, 'Lütfen ilçe seçiniz.'),
  neighborhood: z.string().trim().min(1, 'Lütfen mahalle seçiniz.'),
  address_detail: z
    .string()
    .trim()
    .min(5, 'Cadde, sokak ve bina no içeren açık adres detayı en az 5 karakter olmalıdır.'),
});

export const loginSchema = z.object({
  login_email: z
    .string()
    .trim()
    .min(1, 'E-posta adresi zorunludur.')
    .email('Lütfen geçerli bir e-posta adresi giriniz.'),
  login_password: z.string().min(1, 'Şifre alanı zorunludur.'),
});

export function zodErrorsToMap(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'general');
    if (!map[key]) {
      map[key] = issue.message;
    }
  }
  return map;
}

export interface ParsedApiError {
  message: string;
  fieldErrors: Record<string, string>;
}

/**
 * Global Backend API hata çözümleyici.
 * Hem structured { detail: { message, field_errors } } hem de düz string detail formatını çözer.
 */
export function parseApiError(payload: unknown): ParsedApiError {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === 'string') {
      return { message: detail, fieldErrors: {} };
    }
    if (detail && typeof detail === 'object') {
      const obj = detail as {
        message?: string;
        field_errors?: Record<string, string>;
      };
      return {
        message:
          obj.message ?? 'İşlem sırasında doğrulama hatası oluştu. Kırmızı alanları kontrol ediniz.',
        fieldErrors: obj.field_errors ?? {},
      };
    }
  }
  return {
    message: 'Beklenmeyen bir sunucu hatası oluştu. Lütfen tekrar deneyiniz.',
    fieldErrors: {},
  };
}
