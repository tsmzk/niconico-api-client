import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export type NiconicoCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
};

export interface BaseNiconicoClientConfig {
  cookies: NiconicoCookie[];
  userId?: string;
  requestInterval?: number;
}

export abstract class BaseNiconicoClient {
  protected readonly axios: AxiosInstance;
  protected readonly baseURL = 'https://nvapi.nicovideo.jp/v2';
  private lastRequestTime = 0;
  private readonly minRequestInterval: number;
  protected readonly cookies: NiconicoCookie[];
  protected readonly userId?: string;

  constructor(config: BaseNiconicoClientConfig) {
    this.cookies = config.cookies;
    this.userId = config.userId;
    this.minRequestInterval = config.requestInterval || 1000;

    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'User-Agent': 'niconico-api-client/1.0.0',
        'x-frontend-id': '23',
        'x-request-with': 'nv-garage',
        Accept: 'application/json',
        'Accept-Language': 'ja,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    this.setupInterceptors();
  }

  protected async request<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    await this.enforceRateLimit();

    const cookieHeader = this.buildCookieHeader();
    const headers = {
      Cookie: cookieHeader,
    };

    const isAbsoluteUrl = url.startsWith('http');
    const requestConfig: AxiosRequestConfig = {
      method: 'GET',
      url: isAbsoluteUrl ? url : `${this.baseURL}${url}`,
      params,
      headers,
      withCredentials: true,
    };

    if (isAbsoluteUrl) {
      requestConfig.baseURL = undefined;
    }

    console.log(`[BaseNiconicoClient] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);
    if (requestConfig.params && Object.keys(requestConfig.params).length > 0) {
      console.log(`[BaseNiconicoClient] パラメータ:`, requestConfig.params);
    }

    const response = await this.axios.request<T>(requestConfig);
    console.log('[BaseNiconicoClient] レスポンス成功 - ステータス:', response.status);
    return response.data;
  }

  private setupInterceptors(): void {
    this.axios.interceptors.request.use(
      (config) => config,
      (error) => Promise.reject(error)
    );

    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[BaseNiconicoClient] APIエラー:', error);
        return Promise.reject(this.handleError(error));
      }
    );
  }

  protected buildCookieHeader(): string {
    return this.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  }

  protected async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  private handleError(error: unknown): Error {
    if (this.hasResponseProperty(error)) {
      const { status, data } = error.response;

      if (status === 400) {
        const errorMessage = this.extractErrorMessage(data);
        console.error('400エラーの詳細:', JSON.stringify(data, null, 2));
        return new Error(`パラメータエラー (400): ${errorMessage}`);
      }
      if (status === 401) {
        return new Error('認証エラー: セッションが無効です');
      }
      if (status === 403) {
        const errorMessage = this.extractErrorMessage(data);
        console.error(`[BaseNiconicoClient] 403エラー: ${errorMessage}`);
        return new Error(`アクセス拒否 (403): ${errorMessage}`);
      }
      if (status === 404) {
        return new Error('リソースが見つかりません');
      }
      if (status === 429) {
        return new Error('レート制限: リクエストが多すぎます');
      }
      if (status === 500 || status === 502 || status === 503) {
        return new Error('サーバーエラー: しばらく待ってから再試行してください');
      }
      const errorMessage = this.extractErrorMessage(data);
      return new Error(`APIエラー (${status}): ${errorMessage}`);
    }

    if (this.hasCodeProperty(error) && error.code === 'ECONNABORTED') {
      return new Error('タイムアウト: リクエストが時間切れになりました');
    }

    if (axios.isAxiosError(error)) {
      return new Error(`ネットワークエラー: ${error.message}`);
    }

    return error instanceof Error ? error : new Error('不明なエラーが発生しました');
  }

  private hasResponseProperty(
    error: unknown
  ): error is { response: { status: number; data: unknown } } {
    return typeof error === 'object' && error !== null && 'response' in error;
  }

  private hasCodeProperty(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error;
  }

  private extractErrorMessage(data: unknown): string {
    if (typeof data === 'object' && data !== null && 'message' in data) {
      const message = (data as { message: unknown }).message;
      return typeof message === 'string' ? message : '詳細不明';
    }
    return '詳細不明';
  }
}
