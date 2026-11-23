/**
 * Merkezi HTTP istemcisi ve global API hata sınıfı.
 * Tüm servisler aynı hata ayrıştırma formatını kullanır.
 */

export class ApiError extends Error {
  public readonly fieldErrors: Record<string, string>;
  public readonly status: number;

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    let message = 'İşlem sırasında beklenmeyen bir sunucu hatası oluştu.';
    let fieldErrors: Record<string, string> = {};

    if (payload && typeof payload === 'object' && 'detail' in payload) {
      const detail = (payload as { detail: unknown }).detail;
      if (typeof detail === 'string') {
        message = detail;
      } else if (detail && typeof detail === 'object') {
        const obj = detail as {
          message?: string;
          field_errors?: Record<string, string>;
        };
        if (obj.message) message = obj.message;
        if (obj.field_errors) fieldErrors = obj.field_errors;
      }
    }

    throw new ApiError(message, response.status, fieldErrors);
  }

  return payload as T;
}
