export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('netorbit_access_token');
  }

  private getTenantSlug(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('netorbit_tenant_slug');
  }

  private setTokens(accessToken: string, refreshToken?: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('netorbit_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('netorbit_refresh_token', refreshToken);
    }
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const token = this.getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const tenantSlug = this.getTenantSlug();
    if (tenantSlug && !headers.has('X-Tenant-Slug')) {
      headers.set('X-Tenant-Slug', tenantSlug);
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token refresh on 401
    if (response.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('netorbit_refresh_token');
      if (refreshToken && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            const newTokens = data.data?.tokens || data.tokens;
            if (newTokens?.accessToken) {
              this.setTokens(newTokens.accessToken, newTokens.refreshToken);
              headers.set('Authorization', `Bearer ${newTokens.accessToken}`);
              response = await fetch(url, { ...options, headers });
            }
          } else {
            localStorage.removeItem('netorbit_access_token');
            localStorage.removeItem('netorbit_refresh_token');
            localStorage.removeItem('netorbit_user');
            window.location.href = '/login';
          }
        } catch {
          // Refresh failed
        }
      }
    }

    const text = await response.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = text;
    }

    if (!response.ok) {
      const message =
        body?.error?.message ||
        body?.message ||
        `Request failed with status ${response.status}`;
      throw new ApiError(response.status, message, body);
    }

    return (body?.data !== undefined ? body.data : body) as T;
  }

  get<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
