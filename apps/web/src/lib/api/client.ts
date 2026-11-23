import { StandardApiResponse, ApiErrorResponse, AuthTokens } from './types';

const ACCESS_TOKEN_KEY = 'seg_crm_access_token';
const REFRESH_TOKEN_KEY = 'seg_crm_refresh_token';

class TokenStorage {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  setAccessToken(token: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }

  saveTokens(tokens: AuthTokens): void {
    this.setAccessToken(tokens.accessToken);
    this.setRefreshToken(tokens.refreshToken);
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export const tokenStorage = new TokenStorage();

export class ApiClientError extends Error {
  statusCode: number;
  errorCategory: string;
  details?: any;
  correlationId?: string;

  constructor(res: ApiErrorResponse) {
    super(res.message || 'API request failed');
    this.name = 'ApiClientError';
    this.statusCode = res.statusCode;
    this.errorCategory = res.error;
    this.details = res.details;
    this.correlationId = res.correlationId;
  }
}

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  skipGlobalError?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  }

  private getHeaders(requiresAuth = true, customHeaders: HeadersInit = {}): Headers {
    const headers = new Headers(customHeaders);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    if (requiresAuth) {
      const token = tokenStorage.getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * Prevents multiple simultaneous refreshes by returning the single in-flight promise.
   */
  async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      tokenStorage.clearTokens();
      return null;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          tokenStorage.clearTokens();
          return null;
        }

        const envelope: StandardApiResponse<AuthTokens> = await response.json();
        if (envelope.success && envelope.data) {
          tokenStorage.saveTokens(envelope.data);
          return envelope.data.accessToken;
        }

        tokenStorage.clearTokens();
        return null;
      } catch (err) {
        tokenStorage.clearTokens();
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T = any>(
    path: string,
    options: RequestOptions = {},
  ): Promise<StandardApiResponse<T>> {
    const { requiresAuth = true, headers: customHeaders, ...rest } = options;
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    let headers = this.getHeaders(requiresAuth, customHeaders);

    let response = await fetch(url, {
      ...rest,
      headers,
    });

    // Handle 401 Unauthorized - attempt token refresh once if request was authenticated
    if (response.status === 401 && requiresAuth) {
      const newAccessToken = await this.refreshAccessToken();
      if (newAccessToken) {
        // Retry with refreshed token
        headers = this.getHeaders(requiresAuth, customHeaders);
        response = await fetch(url, {
          ...rest,
          headers,
        });
      } else {
        // Refresh failed: session expired
        if (typeof window !== 'undefined') {
          tokenStorage.clearTokens();
          // Dispatch custom event so AuthContext can clean up session state
          window.dispatchEvent(new Event('seg:auth:expired'));
        }
      }
    }

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const errorResponse: ApiErrorResponse = json || {
        success: false,
        statusCode: response.status,
        message: response.statusText || 'Request failed',
        error: 'HttpError',
        timestamp: new Date().toISOString(),
        path,
      };
      throw new ApiClientError(errorResponse);
    }

    return json as StandardApiResponse<T>;
  }

  get<T = any>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T = any>(path: string, body?: any, options?: RequestOptions) {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(path: string, body?: any, options?: RequestOptions) {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = any>(path: string, body?: any, options?: RequestOptions) {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
