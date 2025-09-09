import type { BaseNiconicoClientConfig, NiconicoCookie } from './clients/BaseNiconicoClient';
import { NiconicoAnalyticsClient } from './clients/NiconicoAnalyticsClient';
import { NiconicoIncomeClient } from './clients/NiconicoIncomeClient';
import { NiconicoLiveClient } from './clients/NiconicoLiveClient';
import { NiconicoMylistClient } from './clients/NiconicoMylistClient';
import { NiconicoVideoClient } from './clients/NiconicoVideoClient';

import type { NiconicoAnalyticsStatsResponse } from './types/NiconicoAnalyticsStatsApiTypes';
import type { NiconicoIncomeContent } from './types/NiconicoIncomeApiTypes';
import type { NiconicoLiveProgramData } from './types/NiconicoLiveApiTypes';
import type { NiconicoMonthlyHistoryItem } from './types/NiconicoMonthlyHistoryApiTypes';
import type { NiconicoMylist, NiconicoMylistDetail } from './types/NiconicoMylistApiTypes';
import type { NiconicoVideoItem } from './types/NiconicoVideoApiTypes';

export type { NiconicoCookie };

export interface NiconicoApiClientConfig extends BaseNiconicoClientConfig {}

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
  private readonly videoClient: NiconicoVideoClient;
  private readonly liveClient: NiconicoLiveClient;
  private readonly incomeClient: NiconicoIncomeClient;
  private readonly mylistClient: NiconicoMylistClient;
  private readonly analyticsClient: NiconicoAnalyticsClient;

  constructor(config: NiconicoApiClientConfig) {
    this.videoClient = new NiconicoVideoClient(config);
    this.liveClient = new NiconicoLiveClient(config);
    this.incomeClient = new NiconicoIncomeClient(config);
    this.mylistClient = new NiconicoMylistClient(config);
    this.analyticsClient = new NiconicoAnalyticsClient(config);
  }

  async fetchVideos(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<{
    items: NiconicoVideoItem[];
    totalCount: number;
    hasMore: boolean;
  }> {
    return this.videoClient.fetchVideos(userId, page, pageSize);
  }

  async fetchLives(
    userId: string,
    offset: number,
    limit: number
  ): Promise<{
    programsList: NiconicoLiveProgramData[];
    totalCount: number;
    hasMore: boolean;
  }> {
    return this.liveClient.fetchLives(userId, offset, limit);
  }

  async fetchEarnings(
    userId: string,
    offset: number,
    limit: number
  ): Promise<{
    contents: NiconicoIncomeContent[];
    totalCount: number;
    hasMore: boolean;
  }> {
    return this.incomeClient.fetchEarnings(userId, offset, limit);
  }

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
    return this.incomeClient.fetchEarningsHistory(yearMonth, userId, offset, limit);
  }

  async fetchMylists(sampleItemCount = 3): Promise<{
    mylists: NiconicoMylist[];
  }> {
    return this.mylistClient.fetchMylists(sampleItemCount);
  }

  async fetchMylistItems(
    mylistId: string,
    page = 1,
    pageSize = 100
  ): Promise<{
    mylist: NiconicoMylistDetail;
  }> {
    return this.mylistClient.fetchMylistItems(mylistId, page, pageSize);
  }

  async addToMylist(mylistId: string, videoIds: string[]): Promise<void> {
    return this.mylistClient.addToMylist(mylistId, videoIds);
  }

  async removeFromMylist(mylistId: string, itemIds: number[]): Promise<void> {
    return this.mylistClient.removeFromMylist(mylistId, itemIds);
  }

  async fetchAnalyticsStats(
    videoId: string,
    from: string,
    to: string
  ): Promise<{
    stats: NiconicoAnalyticsStatsResponse[];
  }> {
    return this.analyticsClient.fetchAnalyticsStats(videoId, from, to);
  }
}
