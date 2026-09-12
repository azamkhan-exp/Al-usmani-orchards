/**
 * Safe client-side JSON API fetcher
 * Validates HTTP status and Content-Type headers before invoking JSON deserialization.
 * Prevents "SyntaxError: Unexpected token '<', '<!DOCTYPE '... is not valid JSON" errors
 * when endpoints return HTML error pages, redirects, or maintenance documents.
 */

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public data: any;

  constructor(message: string, status: number, statusText: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: ApiFetchOptions
): Promise<T> {
  const { timeoutMs = 15000, ...fetchInit } = init || {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...fetchInit,
      signal: fetchInit.signal || controller.signal,
      headers: {
        Accept: 'application/json',
        ...(fetchInit.headers || {})
      }
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.toLowerCase().includes('application/json');

    // Handle non-OK HTTP responses
    if (!res.ok) {
      let errorMessage = `API request failed with status ${res.status}`;
      let errorData: any = null;

      if (isJson) {
        try {
          errorData = await res.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // fallback if body is corrupted
        }
      } else {
        const text = await res.text();
        const preview = text.slice(0, 150).replace(/\s+/g, ' ').trim();
        errorMessage = `API error ${res.status}: ${preview || res.statusText}`;
      }

      throw new ApiError(errorMessage, res.status, res.statusText, errorData);
    }

    // Response is OK (2xx), verify it's actual JSON
    if (!isJson) {
      const text = await res.text();
      const preview = text.slice(0, 150).replace(/\s+/g, ' ').trim();
      throw new ApiError(
        `Expected JSON response but received ${contentType || 'non-JSON'}: ${preview}`,
        res.status,
        res.statusText
      );
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}
