import type { NiconicoAnalyticsStatsResponse } from './NiconicoAnalyticsStatsApiTypes';
import type { NiconicoIncomeContent } from './NiconicoIncomeApiTypes';
import type { NiconicoLiveProgramData } from './NiconicoLiveApiTypes';
import type { NiconicoMonthlyHistoryItem } from './NiconicoMonthlyHistoryApiTypes';
import type { NiconicoMylist, NiconicoMylistDetail } from './NiconicoMylistApiTypes';
import type { NiconicoVideoItem } from './NiconicoVideoApiTypes';

/**
 * ニコニコAPIクライアントインターフェース
 */
export interface INiconicoApiClient {
  /**
   * 動画データを取得
   */
  fetchVideos(
    userId: string,
    cookiesId: string,
    page: number,
    pageSize: number,
  ): Promise<{
    items: NiconicoVideoItem[];
    totalCount: number;
    hasMore: boolean;
  }>;

  /**
   * 生放送データを取得
   */
  fetchLives(
    userId: string,
    cookiesId: string,
    offset: number,
    limit: number,
  ): Promise<{
    programsList: NiconicoLiveProgramData[];
    totalCount: number;
    hasMore: boolean;
  }>;

  /**
   * 収益データを取得
   */
  fetchEarnings(
    userId: string,
    cookiesId: string,
    offset: number,
    limit: number,
  ): Promise<{
    contents: NiconicoIncomeContent[];
    totalCount: number;
    hasMore: boolean;
  }>;

  /**
   * 収益履歴データを取得
   */
  fetchEarningsHistory(
    yearMonth: string,
    userId: string,
    cookiesId: string,
    offset: number,
    limit: number,
  ): Promise<{
    contents: NiconicoMonthlyHistoryItem[];
    totalCount: number;
    hasMore: boolean;
  }>;

  /**
   * マイリスト一覧を取得
   */
  fetchMylists(
    cookiesId: string,
    sampleItemCount?: number,
  ): Promise<{
    mylists: NiconicoMylist[];
  }>;

  /**
   * マイリスト詳細を取得
   */
  fetchMylistItems(
    mylistId: string,
    cookiesId: string,
    page?: number,
    pageSize?: number,
  ): Promise<{
    mylist: NiconicoMylistDetail;
  }>;

  /**
   * マイリストに動画を追加
   */
  addToMylist(mylistId: string, videoIds: string[], cookiesId: string): Promise<void>;

  /**
   * マイリストから動画を削除
   */
  removeFromMylist(mylistId: string, itemIds: number[], cookiesId: string): Promise<void>;

  /**
   * 動画のアナリティクス統計データを取得
   */
  fetchAnalyticsStats(
    videoId: string,
    from: string,
    to: string,
    cookiesId: string,
  ): Promise<{
    stats: NiconicoAnalyticsStatsResponse[];
  }>;
}
