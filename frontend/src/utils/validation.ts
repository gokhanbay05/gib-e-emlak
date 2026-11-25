import { z } from 'zod';
import { extractDigits } from './formatters';

const LETTER_REGEX = /[A-Za-zÇĞİÖŞÜçğıöşü]/;
const DIGIT_REGEX = /\d/;
const SYMBOL_REGEX = /[^A-Za-z0-9ÇĞİÖŞÜçğıöşü\s]/;
const EMAIL_SIMPLE_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
  phone: z.string().refine((v) => {
    const d = extractDigits(v);
    return d.length === 11 && d.startsWith('05');
  }, 'Geçerli bir cep telefonu giriniz (Örn: 0 (532) 123 45 67).'),
};

export const registerCustomerSchema = z.object(commonRegisterFields);

export const registerAgentSchema = z.object({
  ...commonRegisterFields,
  ttbs_document_no: z
    .string()
    .trim()
    .refine(
      (v) => /^\d{7}$/.test(v),
      'Yetki Belgesi numarası 7 haneli sayısal olmalıdır (Örn: 0609412).',
    )
    .refine((v) => {
      const code = Number(v.slice(0, 2));
      return code >= 1 && code <= 81;
    }, 'İlk 2 hane geçerli bir Türkiye il plaka kodu (01-81) olmalıdır.'),
  agency_name: z
    .string()
    .trim()
    .min(3, 'Emlak ofisi ismi en az 3 karakter olmalıdır.'),
  office_phone: z.string().refine((v) => {
    const d = extractDigits(v);
    return d.length === 11 && d.startsWith('0');
  }, 'Geçerli bir ofis telefonu giriniz (Örn: 0 (312) 419 88 99).'),
  city: z.string().trim().min(1, 'Lütfen il seçiniz.'),
  district: z.string().trim().min(1, 'Lütfen ilçe seçiniz.'),
  neighborhood: z.string().trim().min(1, 'Lütfen mahalle seçiniz.'),
  address_detail: z
    .string()
    .trim()
    .min(5, 'Açık adres detayı en az 5 karakter olmalıdır.'),
});

export const loginSchema = z.object({
  login_email: z
    .string()
    .trim()
    .min(1, 'E-posta adresi zorunludur.')
    .email('Lütfen geçerli bir e-posta adresi giriniz.'),
  login_password: z.string().min(1, 'Şifre alanı zorunludur.'),
});

export const agencyProfileSchema = z.object({
  name: z.string().trim().min(3, 'İşletme adı en az 3 karakter olmalıdır.'),
  authorized_person: z
    .string()
    .trim()
    .min(3, 'Yetkili kişi adı soyadı en az 3 karakter olmalıdır.'),
  city: z.string().trim().min(1, 'Lütfen il seçiniz.'),
  district: z.string().trim().min(1, 'Lütfen ilçe seçiniz.'),
  neighborhood: z.string().trim().min(1, 'Lütfen mahalle seçiniz.'),
  address: z
    .string()
    .trim()
    .min(5, 'Açık adres detayı en az 5 karakter olmalıdır.'),
  phone: z.string().refine((v) => {
    const d = extractDigits(v);
    return d.length === 11 && d.startsWith('0');
  }, 'Geçerli bir ofis sabit telefonu giriniz (Örn: 0 (312) 468 10 20).'),
  mobile_phone: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        const d = extractDigits(v);
        return d.length === 11 && d.startsWith('05');
      },
      'Geçerli bir cep telefonu giriniz (Örn: 0 (532) 411 22 33).',
    ),
  fax: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        const d = extractDigits(v);
        return d.length === 11 && d.startsWith('0');
      },
      'Fax numarası 11 haneli olmalıdır (Örn: 0 (312) 468 10 21).',
    ),
  tax_number: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        const d = extractDigits(v);
        return d.length === 10 || d.length === 11;
      },
      'Vergi Kimlik Numarası 10 haneli (şahıs işletmesi için 11 haneli) olmalıdır.',
    ),
});

/**
 * BR-04: 11 haneli T.C. Kimlik Numarası doğrulayıcısı.
 * Kurallar: 11 rakam, 0 ile başlayamaz, çift rakamla biter, tüm haneler aynı olamaz.
 */
export function isValidTcIdentityNo(raw: string): boolean {
  const cleaned = raw.replace(/\s+/g, '');
  if (!/^\d{11}$/.test(cleaned)) return false;
  if (cleaned[0] === '0') return false;
  if (Number(cleaned[10]) % 2 !== 0) return false;
  if (new Set(cleaned.split('')).size <= 1) return false;
  return true;
}

export const customerSchema = z.object({
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
  mobile_phone: z.string().refine((v) => {
    const d = extractDigits(v);
    return d.length === 11 && d.startsWith('05');
  }, 'Geçerli bir cep telefonu giriniz (Örn: 0 (532) 123 45 67).'),
  home_phone: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        const d = extractDigits(v);
        return d.length === 11 && d.startsWith('0');
      },
      'Geçerli bir ev telefonu giriniz (Örn: 0 (312) 426 11 22).',
    ),
  email: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        return EMAIL_SIMPLE_REGEX.test(v.trim());
      },
      'Lütfen geçerli bir e-posta adresi giriniz.',
    ),
  tc_identity_no: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        return isValidTcIdentityNo(v);
      },
      'Geçerli bir 11 haneli T.C. Kimlik Numarası giriniz (0 ile başlayamaz ve çift rakamla bitmelidir).',
    ),
  customer_type: z
    .string()
    .trim()
    .refine(
      (v) => ['ALICI', 'SATICI', 'KIRALAYAN', 'KIRACI'].includes(v),
      'Lütfen müşteri tipini seçiniz.',
    ),
  notes: z.string().optional(),
});

export const quickCustomerSchema = z.object({
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
  mobile_phone: z.string().refine((v) => {
    const d = extractDigits(v);
    return d.length === 11 && d.startsWith('05');
  }, 'Geçerli bir cep telefonu giriniz (Örn: 0 (532) 123 45 67).'),
  home_phone: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        const d = extractDigits(v);
        return d.length === 11 && d.startsWith('0');
      },
      'Ev telefonu 11 haneli olmalıdır (Örn: 0 (312) 426 11 22).',
    ),
  email: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || !v.trim()) return true;
        return EMAIL_SIMPLE_REGEX.test(v.trim());
      },
      'Lütfen geçerli bir e-posta adresi giriniz.',
    ),
  tc_identity_no: z
    .string()
    .refine(
      isValidTcIdentityNo,
      'Geçerli bir 11 haneli T.C. Kimlik Numarası giriniz (0 ile başlayamaz ve çift rakamla bitmelidir).',
    ),
  customer_type: z.enum(['ALICI', 'SATICI', 'KIRALAYAN', 'KIRACI'], {
    message: 'Lütfen müşteri tipini seçiniz.',
  }),
  notes: z.string().optional(),
});

export const propertySchema = z
  .object({
    owner_customer_id: z
      .number()
      .int()
      .positive(
        'BR-03: Sahipsiz gayrimenkul kaydedilemez. Lütfen geçerli bir mülk sahibi seçiniz.',
      ),
    owner_tc_identity_no: z
      .string()
      .refine(
        isValidTcIdentityNo,
        'BR-04: İlan yüklenebilmesi için mülk sahibinin geçerli 11 haneli T.C. Kimlik Numarası doğrulanmalıdır.',
      ),
    title: z
      .string()
      .trim()
      .min(5, 'İlan başlığı en az 5 karakter olmalıdır.'),
    listing_type: z.enum(['SATILIK', 'KIRALIK'], {
      message: 'Lütfen işlem türü seçiniz.',
    }),
    property_type: z.enum(['DAIRE', 'VILLA', 'ISYERI', 'ARSA'], {
      message: 'Lütfen emlak türü seçiniz.',
    }),
    price: z
      .number()
      .positive("İlan fiyatı 0 TL'den büyük olmalıdır."),
    gross_sqm: z
      .number()
      .int()
      .positive("Brüt m² 0'dan büyük olmalıdır."),
    net_sqm: z
      .number()
      .int()
      .positive("Net m² 0'dan büyük olmalıdır."),
    room_count: z.enum(['1+0', '1+1', '2+1', '3+1', '4+1', '5+1'], {
      message: 'Lütfen oda sayısı seçiniz.',
    }),
    floor_number: z.number().int('Bulunduğu kat tam sayı olmalıdır.'),
    building_floors: z
      .number()
      .int('Bina toplam kat sayısı tam sayı olmalıdır.')
      .min(0, 'Bina toplam kat sayısı negatif olamaz.'),
    heating_type: z.enum(
      ['DOGALGAZ_KOMBI', 'MERKEZI', 'YERDEN_ISITMA', 'KLIMA', 'SOBA'],
      { message: 'Lütfen ısınma türü seçiniz.' },
    ),
    city: z.string().trim().min(1, 'Lütfen il seçiniz.'),
    district: z.string().trim().min(1, 'Lütfen ilçe seçiniz.'),
    neighborhood: z.string().trim().min(1, 'Lütfen mahalle seçiniz.'),
    address_detail: z
      .string()
      .trim()
      .min(5, 'Açık adres detayı en az 5 karakter olmalıdır.'),
    agent_description: z
      .string()
      .trim()
      .min(15, 'Emlakçı özel tasviri en az 15 karakter olmalıdır.'),
    status: z.enum(['AKTIF', 'SATILDI', 'KIRALANDI', 'PASIF']),
  })
  .superRefine((data, ctx) => {
    if (data.net_sqm > data.gross_sqm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['net_sqm'],
        message: 'Net m² değeri brüt m² değerinden büyük olamaz.',
      });
    }
    if (data.property_type !== 'ARSA' && data.building_floors < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['building_floors'],
        message: 'Bina toplam kat sayısı en az 1 olmalıdır.',
      });
    }
    if (data.property_type === 'ARSA' && data.floor_number < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['floor_number'],
        message: 'Arsa için kat bilgisi 0 olmalıdır.',
      });
    }
    if (data.floor_number > data.building_floors) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['floor_number'],
        message: 'Bulunduğu kat bina toplam kat sayısından büyük olamaz.',
      });
    }
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
