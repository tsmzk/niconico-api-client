import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import dayjs from 'dayjs';
import type { Redis } from 'ioredis';
import type { INiconicoApiClient } from '@/domain/external/niconico/INiconicoApiClient';
import type {
  NiconicoAnalyticsStatsApiResponse,
  NiconicoAnalyticsStatsResponse,
} from '@/domain/external/niconico/NiconicoAnalyticsStatsApiTypes';
import type {
  NiconicoIncomeApiResponse,
  NiconicoIncomeContent,
  NiconicoIncomeTotalResponse,
} from '@/domain/external/niconico/NiconicoIncomeApiTypes';
import type {
  NiconicoLiveBroadcastApiResponse,
  NiconicoLiveProgramData,
} from '@/domain/external/niconico/NiconicoLiveApiTypes';
import type {
  NiconicoMonthlyHistoryApiResponse,
  NiconicoMonthlyHistoryItem,
} from '@/domain/external/niconico/NiconicoMonthlyHistoryApiTypes';
import type {
  NiconicoMylist,
  NiconicoMylistDetail,
  NiconicoMylistDetailApiResponse,
  NiconicoMylistOperationApiResponse,
  NiconicoMylistsApiResponse,
} from '@/domain/external/niconico/NiconicoMylistApiTypes';
import type {
  NiconicoVideoApiResponse,
  NiconicoVideoItem,
} from '@/domain/external/niconico/NiconicoVideoApiTypes';

/**
 * ニコニコクッキーの型
 */
type NiconicoCookie = {
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
 * ニコニコAPIクライアント実装
 * Infrastructure層での外部API処理
 */
export class NiconicoApiClient implements INiconicoApiClient {
  private readonly axios: AxiosInstance;
  private readonly baseURL = 'https://nvapi.nicovideo.jp/v2';
  private lastRequestTime = 0;
  private readonly minRequestInterval = 1000; // 1秒
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'User-Agent': 'niconico-income-app/1.0.0',
        'x-frontend-id': '23',
        'x-request-with': 'nv-garage',
        Accept: 'application/json',
        'Accept-Language': 'ja,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    // リクエスト・レスポンスのインターセプター設定
    this.setupInterceptors();
  }
  /**
   * 動画データを取得（単一ページ・生データ）
   */
  async fetchVideos(
    userId: string,
    cookiesId: string,
    page: number,
    pageSize: number,
  ): Promise<{
    items: NiconicoVideoItem[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const cookies = await this.getCookies(cookiesId);
    if (!cookies) {
      throw new Error('クッキーが取得できません。ニコニコ動画に再ログインしてください。');
    }

    console.log(
      `[NiconicoApiClient] 動画データ取得 page=${page}, pageSize=${pageSize} for user: ${userId}`,
    );

    const response = await this.request<NiconicoVideoApiResponse>('/users/me/videos', cookies, {
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
   * 生放送データを取得（単一ページ・生データ）
   */
  async fetchLives(
    userId: string,
    cookiesId: string,
    offset: number,
    limit: number,
  ): Promise<{
    programsList: NiconicoLiveProgramData[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const cookies = await this.getCookies(cookiesId);
    if (!cookies) {
      throw new Error('クッキーが取得できません。ニコニコ動画に再ログインしてください。');
    }

    const actualUserId = await this.getUserId(cookiesId);
    if (!actualUserId) {
      throw new Error('ユーザーIDが取得できません。ニコニコ動画に再ログインしてください。');
    }

    console.log(
      `[NiconicoApiClient] 生放送データ取得 offset=${offset}, limit=${limit} for user: ${userId}`,
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
      cookies,
      apiParams,
    );

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

    const { programsList, totalCount } = response.data;
    const hasMore = !response.data.hasNext === false && offset + limit < totalCount;

    console.log(
      `[NiconicoApiClient] offset=${offset}: ${programsList.length}件取得 (全${totalCount}件中)`,
    );

    return {
      programsList,
      totalCount,
      hasMore,
    };
  }

  /**
   * 収益データを取得（単一ページ・生データ）
   */
  async fetchEarnings(
    userId: string,
    cookiesId: string,
    offset: number,
    limit: number,
  ): Promise<{
    contents: NiconicoIncomeContent[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const cookies = await this.getCookies(cookiesId);
    if (!cookies) {
      throw new Error('クッキーが取得できません。ニコニコ動画に再ログインしてください。');
    }

    const { year, month } = await this.determineTargetYearMonth(cookies);
    const baseApiUrl = 'https://public-api.commons.nicovideo.jp/v1/my/cpp/forecasts';
    const apiUrl = `${baseApiUrl}/${year}/${month}`;

    console.log(
      `[NiconicoApiClient] 収益データ取得: ${year}年${month}月, offset=${offset}, limit=${limit} for user: ${userId}`,
    );

    const response = await this.request<NiconicoIncomeApiResponse>(apiUrl, cookies, {
      _offset: offset,
      _limit: limit,
      _sort: '-createdAt',
      with_filter: 0,
    });

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

    const { contents, total } = response.data;
    // まだ取得すべきデータが残っていて、かつ今回のリクエストでデータが取得できた場合は継続
    const hasMore = offset + limit < total && contents.length > 0;

    console.log(`[NiconicoApiClient] offset=${offset}: ${contents.length}件取得 (全${total}件中)`);

    return {
      contents,
      totalCount: total,
      hasMore,
    };
  }

  /**
   * 収益履歴データを取得（単一ページ・生データ）
   */
  async fetchEarningsHistory(
    yearMonth: string,
    userId: string,
    cookiesId: string,
    offset: number,
    limit: number,
  ): Promise<{
    contents: NiconicoMonthlyHistoryItem[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const cookies = await this.getCookies(cookiesId);
    if (!cookies) {
      throw new Error('クッキーが取得できません。ニコニコ動画に再ログインしてください。');
    }

    // yearMonth を年月に分解
    const year = yearMonth.substring(0, 4);
    const month = yearMonth.substring(4, 6);

    // 年月フォーマットの検証
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error(`無効な年月フォーマット: ${yearMonth}`);
    }

    // 制限チェック
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
        `月別履歴は2ヶ月前以前のデータのみ取得可能です。指定された期間: ${year}/${month} (制限: ${twoMonthsAgoYear}/${limitMonth}以前)`,
      );
    }

    const baseApiUrl = 'https://public-api.commons.nicovideo.jp/v1/my/cpp/histories';
    const apiUrl = `${baseApiUrl}/${year}/${month}`;

    console.log(
      `[NiconicoApiClient] 収益履歴データ取得: ${year}/${month}, offset=${offset}, limit=${limit} for user: ${userId}`,
    );

    const response = await this.request<NiconicoMonthlyHistoryApiResponse>(apiUrl, cookies, {
      _offset: offset,
      _limit: limit,
      _sort: '-score.thisMonth.allTotal',
    });

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

    const { contents, total } = response.data;
    // 修正：まだ取得すべきデータが残っていて、かつ今回のリクエストでデータが取得できた場合は継続
    const hasMore = contents.length > 0 && offset + limit < total;

    console.log(`[NiconicoApiClient] offset=${offset}: ${contents.length}件取得 (全${total}件中)`);

    return {
      contents,
      totalCount: total,
      hasMore,
    };
  }

  /**
   * HTTPリクエストを実行
   * レート制限を適用し、安全にAPIにアクセスします
   */
  private async request<T>(
    url: string,
    cookies: NiconicoCookie[],
    params?: Record<string, unknown>,
  ): Promise<T> {
    await this.enforceRateLimit();

    // クッキーをヘッダーに設定
    const cookieHeader = this.buildCookieHeader(cookies);
    const headers = {
      Cookie: cookieHeader,
    };

    // 絶対URLかどうかで判定
    const isAbsoluteUrl = url.startsWith('http');
    const requestConfig: AxiosRequestConfig = {
      method: 'GET',
      url: isAbsoluteUrl ? url : `${this.baseURL}${url}`,
      params,
      headers,
      withCredentials: true,
    };

    // 絶対URLの場合は、baseURLをクリア
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
      (error) => Promise.reject(error),
    );

    this.axios.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error),
    );
  }

  /**
   * クッキーヘッダーの構築
   */
  private buildCookieHeader(cookies: NiconicoCookie[]): string {
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
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

  /**
   * レスポンスプロパティを持つエラーかどうかを判定
   */
  private hasResponseProperty(
    error: unknown,
  ): error is { response: { status: number; data: unknown } } {
    return typeof error === 'object' && error !== null && 'response' in error;
  }

  /**
   * codeプロパティを持つエラーかどうかを判定
   */
  private hasCodeProperty(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error;
  }

  /**
   * エラーデータからメッセージを抽出
   */
  private extractErrorMessage(data: unknown): string {
    if (typeof data === 'object' && data !== null && 'message' in data) {
      const message = (data as { message: unknown }).message;
      return typeof message === 'string' ? message : '詳細不明';
    }
    return '詳細不明';
  }

  /**
   * 保存されたクッキーを取得
   */
  private async getCookies(cookiesId: string): Promise<NiconicoCookie[] | null> {
    const redisKey = `niconico_cookies:${cookiesId}`;

    const cookiesJson = await this.redis.get(redisKey);

    if (!cookiesJson) {
      return null;
    }

    const cookies = JSON.parse(cookiesJson);
    return cookies;
  }

  /**
   * 保存されたニコニコユーザーIDを取得
   */
  private async getUserId(cookiesId: string): Promise<string | null> {
    const redisKey = `niconico_user_id:${cookiesId}`;

    return this.redis.get(redisKey);
  }

  /**
   * 適切な収益データ取得対象年月を決定
   */
  private async determineTargetYearMonth(
    cookies: NiconicoCookie[],
  ): Promise<{ year: number; month: number }> {
    // デフォルトで現在の年月を使用
    const currentDate = dayjs();
    const requestedYear = currentDate.year();
    const requestedMonth = currentDate.month() + 1;

    // 現在の年月での利用可能性をチェック
    const isCurrentMonthAvailable = await this.checkEarningsAvailability(
      cookies,
      requestedYear,
      requestedMonth,
    );

    if (isCurrentMonthAvailable) {
      console.log(`${requestedYear}年${requestedMonth}月の収益データは利用可能です`);
      return { year: requestedYear, month: requestedMonth };
    }

    // 409 Conflict の場合は前月を使用
    const previousMonth = this.getPreviousMonth(requestedYear, requestedMonth);
    console.log(
      `${requestedYear}年${requestedMonth}月の収益データは集計中のため、前月 ${previousMonth.year}年${previousMonth.month}月のデータを取得します`,
    );
    return previousMonth;
  }

  /**
   * 収益データの利用可能性をチェック
   */
  private async checkEarningsAvailability(
    cookies: NiconicoCookie[],
    year: number,
    month: number,
  ): Promise<boolean> {
    const baseApiUrl = 'https://public-api.commons.nicovideo.jp/v1/my/cpp/forecasts';
    const totalApiUrl = `${baseApiUrl}/total/${year}/${month}`;

    const response = await this.request<NiconicoIncomeTotalResponse>(totalApiUrl, cookies, {
      _limit: 1,
    }).catch((error) => {
      // 409 Conflictの場合は集計中として扱う
      if (error?.response?.status === 409) {
        console.log(`集計中エラー詳細: ${JSON.stringify(error.response.data)}`);
        return { meta: { status: 409 }, data: error.response.data };
      }
      throw error; // その他のエラーは再スロー
    });

    console.log(
      `収益データ利用可能性チェック ${year}年${month}月: ステータス ${response.meta.status}`,
    );

    // 200 OK の場合は利用可能
    if (response.meta.status === 200) {
      return true;
    }

    // 409 Conflict の場合は利用不可（集計中）
    if (response.meta.status === 409) {
      console.log(`集計中エラー詳細: ${JSON.stringify(response.data)}`);
      return false;
    }

    // その他のステータスコードの場合は警告を出して利用可能として扱う
    console.warn(`予期しないステータスコード: ${response.meta.status}, 利用可能として扱います`);
    return true;
  }

  /**
   * 前月の年月を計算
   */
  private getPreviousMonth(year: number, month: number): { year: number; month: number } {
    if (month === 1) {
      return { year: year - 1, month: 12 };
    }
    return { year, month: month - 1 };
  }

  /**
   * マイリスト一覧を取得
   */
  async fetchMylists(
    cookiesId: string,
    sampleItemCount = 3,
  ): Promise<{
    mylists: NiconicoMylist[];
  }> {
    const cookies = await this.getCookies(cookiesId);
    if (!cookies) {
      throw new Error('クッキーが取得できません。ニコニコ動画に再ログインしてください。');
    }

    console.log(`[NiconicoApiClient] マイリスト一覧取得 sampleItemCount=${sampleItemCount}`);

    const response = await this.request<NiconicoMylistsApiResponse>(
      'https://nvapi.nicovideo.jp/v1/users/me/mylists',
      cookies,
      { sampleItemCount },
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
    cookiesId: string,
    page = 1,
    pageSize = 100,
  ): Promise<{
    mylist: NiconicoMylistDetail;
  }> {
    const cookies = await this.getCookies(cookiesId);
    if (!cookies) {
      throw new Error('クッキーが取得できません。ニコニコ動画に再ログインしてください。');
    }

    console.log(
      `[NiconicoApiClient] マイリスト詳細取得 mylistId=${mylistId}, page=${page}, pageSize=${pageSize}`,
    );

    const response = await this.request<NiconicoMylistDetailApiResponse>(
      `https://nvapi.nicovideo.jp/v1/users/me/mylists/${mylistId}`,
      cookies,
      { page, pageSize },
    );

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

    const { mylist } = response.data;

    console.log(
      `[NiconicoApiClient] マイリスト「${mylist.name}」: ${mylist.items.length}件取得 (全${mylist.totalItemCount}件中)`,
    );

    return { mylist };
  }

  /**
   * マイリストに動画を追加
   */
  async addToMylist(mylistId: string, videoIds: string[], cookiesId: string): Promise<void> {
    const cookies = await this.getCookies(cookiesId);
    if (!cookies) {
      throw new Error('クッキーが取得できません。ニコニコ動画に再ログインしてください。');
    }

    const cookieHeader = this.buildCookieHeader(cookies);
    const headers = {
      Cookie: cookieHeader,
    };

    for (const videoId of videoIds) {
      console.log(
        `[NiconicoApiClient] マイリストに動画追加 mylistId=${mylistId}, videoId=${videoId}`,
      );

      const url = `https://nvapi.nicovideo.jp/v1/users/me/mylists/${mylistId}/items?itemId=${videoId}`;

      await this.enforceRateLimit();

      const _response = await this.axios.post<NiconicoMylistOperationApiResponse>(
        url,
        {},
        {
          headers,
          withCredentials: true,
        },
      );

      console.log(`[NiconicoApiClient] 動画 ${videoId} をマイリストに追加しました`);
    }
  }

  /**
   * マイリストから動画を削除
   */
  async removeFromMylist(mylistId: string, itemIds: number[], cookiesId: string): Promise<void> {
    const cookies = await this.getCookies(cookiesId);
    if (!cookies) {
      throw new Error('クッキーが取得できません。ニコニコ動画に再ログインしてください。');
    }

    const itemIdsStr = itemIds.join(',');

    console.log(
      `[NiconicoApiClient] マイリストから動画削除 mylistId=${mylistId}, itemIds=${itemIdsStr}`,
    );

    const url = `https://nvapi.nicovideo.jp/v1/users/me/mylists/${mylistId}/items?itemIds=${itemIdsStr}`;

    // DELETEリクエストの場合は、request メソッドを拡張する必要がある
    await this.enforceRateLimit();

    const cookieHeader = this.buildCookieHeader(cookies);
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
    to: string,
    cookiesId: string,
  ): Promise<{
    stats: NiconicoAnalyticsStatsResponse[];
  }> {
    const cookies = await this.getCookies(cookiesId);
    if (!cookies) {
      throw new Error('クッキーが取得できません。ニコニコ動画に再ログインしてください。');
    }

    console.log(
      `[NiconicoApiClient] アナリティクス統計データ取得 videoId=${videoId}, from=${from}, to=${to}`,
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

    const response = await this.request<NiconicoAnalyticsStatsApiResponse>(url, cookies, params);

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

    // API レスポンスを処理済みの形式に変換
    const stats: NiconicoAnalyticsStatsResponse[] = response.data.map((item) => {
      const date = item.dimensions.find((d) => d.type === 'date')?.label;
      if (!date) {
        throw new Error('日付データが見つかりません');
      }

      // YYYY-MM-DD形式をYYYYMMDD形式に変換
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
}
