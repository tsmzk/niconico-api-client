import type { NiconicoClientConfig } from '../types/common';
import type {
  NiconicoAnalyticsStatsApiResponse,
  NiconicoAnalyticsStatsResponse,
} from '../types/NiconicoAnalyticsStatsApiTypes';
import { HttpClient } from '../utils/httpClient';
import { RateLimiter } from '../utils/rateLimiter';

export class NiconicoAnalyticsClient {
  private static readonly BASE_URL = 'https://nvapi.nicovideo.jp/v1';
  private readonly httpClient: HttpClient;
  private readonly rateLimiter: RateLimiter;

  constructor(config: NiconicoClientConfig) {
    this.httpClient = new HttpClient({
      cookies: config.cookies,
      timeout: 30000,
    });
    this.rateLimiter = new RateLimiter(config.requestInterval);
  }

  async fetchAnalyticsStats(
    videoId: string,
    from: string,
    to: string
  ): Promise<{
    stats: NiconicoAnalyticsStatsResponse[];
  }> {
    console.log(
      `[NiconicoAnalyticsClient] アナリティクス統計データ取得 videoId=${videoId}, from=${from}, to=${to}`
    );

    await this.rateLimiter.enforce();

    const url = `${NiconicoAnalyticsClient.BASE_URL}/users/me/analytics/stats`;
    const params = {
      from,
      to,
      videoId,
      term: 'custom',
      metrics: 'viewCount,commentCount,likeCount,mylistCount',
      dimensions: 'date',
    };

    const response = await this.httpClient.get<NiconicoAnalyticsStatsApiResponse>(url, params);

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

    console.log(`[NiconicoAnalyticsClient] ${stats.length}件の統計データを取得しました`);

    return { stats };
  }
}
