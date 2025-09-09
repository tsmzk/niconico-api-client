import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import dayjs from 'dayjs';
import type {
  NiconicoAnalyticsStatsApiResponse,
  NiconicoAnalyticsStatsResponse,
} from './types/NiconicoAnalyticsStatsApiTypes';
import type {
  NiconicoIncomeApiResponse,
  NiconicoIncomeContent,
  NiconicoIncomeTotalResponse,
} from './types/NiconicoIncomeApiTypes';
import type {
  NiconicoLiveBroadcastApiResponse,
  NiconicoLiveProgramData,
} from './types/NiconicoLiveApiTypes';
import type {
  NiconicoMonthlyHistoryApiResponse,
  NiconicoMonthlyHistoryItem,
} from './types/NiconicoMonthlyHistoryApiTypes';
import type {
  NiconicoMylist,
  NiconicoMylistDetail,
  NiconicoMylistDetailApiResponse,
  NiconicoMylistOperationApiResponse,
  NiconicoMylistsApiResponse,
} from './types/NiconicoMylistApiTypes';
import type { NiconicoVideoApiResponse, NiconicoVideoItem } from './types/NiconicoVideoApiTypes';

/**
 * ニコニコクッキーの型
 */
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

/**
 * ニコニコAPIクライアント設定
 */
export interface NiconicoApiClientConfig {
  cookies: NiconicoCookie[];
  userId?: string;
  requestInterval?: number;
}

/**
 * ニコニコAPIクライアント（ファサードパターン）
 *
 * 使用例:
 * ```typescript
 * const client = new NiconicoApiClient({
 *   cookies: cookiesArray,
 *   userId: 'your-user-id'
 * });
 *
 * const videos = await client.fetchVideos('userId', 1, 10);
 * ```
 */
export class NiconicoApiClient {
  private readonly axios: AxiosInstance;
  private readonly baseURL = 'https://nvapi.nicovideo.jp/v2';
  private lastRequestTime = 0;
  private readonly minRequestInterval: number;
  private readonly cookies: NiconicoCookie[];
  private readonly userId?: string;

  constructor(config: NiconicoApiClientConfig) {
    this.cookies = config.cookies;
    this.userId = config.userId;
    this.minRequestInterval = config.requestInterval || 1000; // デフォルト1秒

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

  /**
   * 動画データを取得
   */
  async fetchVideos(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<{
    items: NiconicoVideoItem[];
    totalCount: number;
    hasMore: boolean;
  }> {
    console.log(
      `[NiconicoApiClient] 動画データ取得 page=${page}, pageSize=${pageSize} for user: ${userId}`
    );

    const response = await this.request<NiconicoVideoApiResponse>('/users/me/videos', {
      sortKey: 'registeredAt',
      sortOrder: 'desc',
      pageSize,
      page,
    });

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

    const { items, totalCount } = response.data;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasMore = page < totalPages;

    console.log(`[NiconicoApiClient] ページ${page}: ${items.length}件取得 (全${totalCount}件中)`);

    return {
      items,
      totalCount,
      hasMore,
    };
  }

  /**
   * 生放送データを取得
   */
  async fetchLives(
    userId: string,
    offset: number,
    limit: number
  ): Promise<{
    programsList: NiconicoLiveProgramData[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const actualUserId = this.userId || userId;

    console.log(
      `[NiconicoApiClient] 生放送データ取得 offset=${offset}, limit=${limit} for user: ${userId}`
    );

    const apiParams = {
      providerId: actualUserId,
      providerType: 'user',
      isIncludeNonPublic: true,
      offset,
      limit,
      withTotalCount: true,
    };

    const response = await this.request<NiconicoLiveBroadcastApiResponse>(
      'https://live.nicovideo.jp/front/api/v2/user-broadcast-history',
      apiParams
    );

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

    const { programsList, totalCount } = response.data;
    const hasMore = !response.data.hasNext === false && offset + limit < totalCount;

    console.log(
      `[NiconicoApiClient] offset=${offset}: ${programsList.length}件取得 (全${totalCount}件中)`
    );

    return {
      programsList,
      totalCount,
      hasMore,
    };
  }

  /**
   * 収益データを取得
   */
  async fetchEarnings(
    userId: string,
    offset: number,
    limit: number
  ): Promise<{
    contents: NiconicoIncomeContent[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const { year, month } = await this.determineTargetYearMonth();
    const baseApiUrl = 'https://public-api.commons.nicovideo.jp/v1/my/cpp/forecasts';
    const apiUrl = `${baseApiUrl}/${year}/${month}`;

    console.log(
      `[NiconicoApiClient] 収益データ取得: ${year}年${month}月, offset=${offset}, limit=${limit} for user: ${userId}`
    );

    const response = await this.request<NiconicoIncomeApiResponse>(apiUrl, {
      _offset: offset,
      _limit: limit,
      _sort: '-createdAt',
      with_filter: 0,
    });

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

    const { contents, total } = response.data;
    const hasMore = offset + limit < total && contents.length > 0;

    console.log(`[NiconicoApiClient] offset=${offset}: ${contents.length}件取得 (全${total}件中)`);

    return {
      contents,
      totalCount: total,
      hasMore,
    };
  }

  /**
   * 収益履歴データを取得
   */
  async fetchEarningsHistory(
    yearMonth: string,
    userId: string,
    offset: number,
    limit: number
  ): Promise<{
    contents: NiconicoMonthlyHistoryItem[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const year = yearMonth.substring(0, 4);
    const month = yearMonth.substring(4, 6);

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error(`無効な年月フォーマット: ${yearMonth}`);
    }

    const now = dayjs();
    const currentYear = now.year();
    const currentMonth = now.month() + 1;

    if (yearNum > currentYear || (yearNum === currentYear && monthNum > currentMonth)) {
      throw new Error(`未来の月のデータは取得できません。指定された期間: ${year}/${month}`);
    }

    const twoMonthsAgoYear = currentMonth > 2 ? currentYear : currentYear - 1;
    const twoMonthsAgoMonth = currentMonth > 2 ? currentMonth - 2 : currentMonth + 10;
    const isAfterTwoMonthsAgo =
      yearNum > twoMonthsAgoYear || (yearNum === twoMonthsAgoYear && monthNum > twoMonthsAgoMonth);

    if (isAfterTwoMonthsAgo) {
      const limitMonth = String(twoMonthsAgoMonth).padStart(2, '0');
      throw new Error(
        `月別履歴は2ヶ月前以前のデータのみ取得可能です。指定された期間: ${year}/${month} (制限: ${twoMonthsAgoYear}/${limitMonth}以前)`
      );
    }

    const baseApiUrl = 'https://public-api.commons.nicovideo.jp/v1/my/cpp/histories';
    const apiUrl = `${baseApiUrl}/${year}/${month}`;

    console.log(
      `[NiconicoApiClient] 収益履歴データ取得: ${year}/${month}, offset=${offset}, limit=${limit} for user: ${userId}`
    );

    const response = await this.request<NiconicoMonthlyHistoryApiResponse>(apiUrl, {
      _offset: offset,
      _limit: limit,
      _sort: '-score.thisMonth.allTotal',
    });

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

    const { contents, total } = response.data;
    const hasMore = contents.length > 0 && offset + limit < total;

    console.log(`[NiconicoApiClient] offset=${offset}: ${contents.length}件取得 (全${total}件中)`);

    return {
      contents,
      totalCount: total,
      hasMore,
    };
  }

  /**
   * マイリスト一覧を取得
   */
  async fetchMylists(sampleItemCount = 3): Promise<{
    mylists: NiconicoMylist[];
  }> {
    console.log(`[NiconicoApiClient] マイリスト一覧取得 sampleItemCount=${sampleItemCount}`);

    const response = await this.request<NiconicoMylistsApiResponse>(
      'https://nvapi.nicovideo.jp/v1/users/me/mylists',
      { sampleItemCount }
    );

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

    const { mylists } = response.data;

    console.log(`[NiconicoApiClient] マイリスト: ${mylists.length}件取得`);

    return { mylists };
  }

  /**
   * マイリスト詳細を取得
   */
  async fetchMylistItems(
    mylistId: string,
    page = 1,
    pageSize = 100
  ): Promise<{
    mylist: NiconicoMylistDetail;
  }> {
    console.log(
      `[NiconicoApiClient] マイリスト詳細取得 mylistId=${mylistId}, page=${page}, pageSize=${pageSize}`
    );

    const response = await this.request<NiconicoMylistDetailApiResponse>(
      `https://nvapi.nicovideo.jp/v1/users/me/mylists/${mylistId}`,
      { page, pageSize }
    );

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

    const { mylist } = response.data;

    console.log(
      `[NiconicoApiClient] マイリスト「${mylist.name}」: ${mylist.items.length}件取得 (全${mylist.totalItemCount}件中)`
    );

    return { mylist };
  }

  /**
   * マイリストに動画を追加
   */
  async addToMylist(mylistId: string, videoIds: string[]): Promise<void> {
    const cookieHeader = this.buildCookieHeader();
    const headers = {
      Cookie: cookieHeader,
    };

    for (const videoId of videoIds) {
      console.log(`[NiconicoApiClient] マイリストに動画追加 mylistId=${mylistId}, videoId=${videoId}`);

      const url = `https://nvapi.nicovideo.jp/v1/users/me/mylists/${mylistId}/items?itemId=${videoId}`;

      await this.enforceRateLimit();

      const _response = await this.axios.post<NiconicoMylistOperationApiResponse>(
        url,
        {},
        {
          headers,
          withCredentials: true,
        }
      );

      console.log(`[NiconicoApiClient] 動画 ${videoId} をマイリストに追加しました`);
    }
  }

  /**
   * マイリストから動画を削除
   */
  async removeFromMylist(mylistId: string, itemIds: number[]): Promise<void> {
    const itemIdsStr = itemIds.join(',');

    console.log(
      `[NiconicoApiClient] マイリストから動画削除 mylistId=${mylistId}, itemIds=${itemIdsStr}`
    );

    const url = `https://nvapi.nicovideo.jp/v1/users/me/mylists/${mylistId}/items?itemIds=${itemIdsStr}`;

    await this.enforceRateLimit();

    const cookieHeader = this.buildCookieHeader();
    const headers = {
      Cookie: cookieHeader,
    };

    const _response = await this.axios.delete<NiconicoMylistOperationApiResponse>(url, {
      headers,
      withCredentials: true,
    });

    console.log(`[NiconicoApiClient] アイテム ${itemIdsStr} をマイリストから削除しました`);
  }

  /**
   * 動画のアナリティクス統計データを取得
   */
  async fetchAnalyticsStats(
    videoId: string,
    from: string,
    to: string
  ): Promise<{
    stats: NiconicoAnalyticsStatsResponse[];
  }> {
    console.log(
      `[NiconicoApiClient] アナリティクス統計データ取得 videoId=${videoId}, from=${from}, to=${to}`
    );

    const url = 'https://nvapi.nicovideo.jp/v1/users/me/analytics/stats';
    const params = {
      from,
      to,
      videoId,
      term: 'custom',
      metrics: 'viewCount,commentCount,likeCount,mylistCount',
      dimensions: 'date',
    };

    const response = await this.request<NiconicoAnalyticsStatsApiResponse>(url, params);

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

    const stats: NiconicoAnalyticsStatsResponse[] = response.data.map((item) => {
      const date = item.dimensions.find((d) => d.type === 'date')?.label;
      if (!date) {
        throw new Error('日付データが見つかりません');
      }

      const formattedDate = date.replace(/-/g, '');

      const metrics = {
        viewCount: 0,
        commentCount: 0,
        likeCount: 0,
        mylistCount: 0,
      };

      for (const metric of item.metrics) {
        if (metric.type === 'viewCount') metrics.viewCount = metric.value;
        if (metric.type === 'commentCount') metrics.commentCount = metric.value;
        if (metric.type === 'likeCount') metrics.likeCount = metric.value;
        if (metric.type === 'mylistCount') metrics.mylistCount = metric.value;
      }

      return {
        date: formattedDate,
        ...metrics,
      };
    });

    console.log(`[NiconicoApiClient] ${stats.length}件の統計データを取得しました`);

    return { stats };
  }

  /**
   * HTTPリクエストを実行
   */
  private async request<T>(url: string, params?: Record<string, unknown>): Promise<T> {
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

    console.log(`[NiconicoApiClient] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);
    if (requestConfig.params && Object.keys(requestConfig.params).length > 0) {
      console.log(`[NiconicoApiClient] パラメータ:`, requestConfig.params);
    }

    const response = await this.axios.request<T>(requestConfig);
    console.log('[NiconicoApiClient] レスポンス成功 - ステータス:', response.status);
    return response.data;
  }

  /**
   * インターセプターの設定
   */
  private setupInterceptors(): void {
    this.axios.interceptors.request.use(
      (config) => config,
      (error) => Promise.reject(error)
    );

    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[NiconicoApiClient] APIエラー:', error);
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * クッキーヘッダーの構築
   */
  private buildCookieHeader(): string {
    return this.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  }

  /**
   * レート制限の適用
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * エラーハンドリング
   */
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
        console.error(`[NiconicoApiClient] 403エラー: ${errorMessage}`);
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

  /**
   * 適切な収益データ取得対象年月を決定
   */
  private async determineTargetYearMonth(): Promise<{ year: number; month: number }> {
    const currentDate = dayjs();
    const requestedYear = currentDate.year();
    const requestedMonth = currentDate.month() + 1;

    const isCurrentMonthAvailable = await this.checkEarningsAvailability(
      requestedYear,
      requestedMonth
    );

    if (isCurrentMonthAvailable) {
      console.log(`${requestedYear}年${requestedMonth}月の収益データは利用可能です`);
      return { year: requestedYear, month: requestedMonth };
    }

    const previousMonth = this.getPreviousMonth(requestedYear, requestedMonth);
    console.log(
      `${requestedYear}年${requestedMonth}月の収益データは集計中のため、前月 ${previousMonth.year}年${previousMonth.month}月のデータを取得します`
    );
    return previousMonth;
  }

  private async checkEarningsAvailability(year: number, month: number): Promise<boolean> {
    const baseApiUrl = 'https://public-api.commons.nicovideo.jp/v1/my/cpp/forecasts';
    const totalApiUrl = `${baseApiUrl}/total/${year}/${month}`;

    const response = await this.request<NiconicoIncomeTotalResponse>(totalApiUrl, {
      _limit: 1,
    }).catch((error) => {
      if (error?.response?.status === 409) {
        console.log(`集計中エラー詳細: ${JSON.stringify(error.response.data)}`);
        return { meta: { status: 409 }, data: error.response.data };
      }
      throw error;
    });

    console.log(
      `収益データ利用可能性チェック ${year}年${month}月: ステータス ${response.meta.status}`
    );

    if (response.meta.status === 200) {
      return true;
    }

    if (response.meta.status === 409) {
      console.log(`集計中エラー詳細: ${JSON.stringify(response.data)}`);
      return false;
    }

    console.warn(`予期しないステータスコード: ${response.meta.status}, 利用可能として扱います`);
    return true;
  }

  private getPreviousMonth(year: number, month: number): { year: number; month: number } {
    if (month === 1) {
      return { year: year - 1, month: 12 };
    }
    return { year, month: month - 1 };
  }
}
