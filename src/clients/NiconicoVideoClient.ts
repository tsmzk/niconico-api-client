import type { NiconicoClientConfig } from '../types/common';
import type { NiconicoVideoApiResponse, NiconicoVideoItem } from '../types/NiconicoVideoApiTypes';
import { HttpClient } from '../utils/httpClient';
import { RateLimiter } from '../utils/rateLimiter';

export class NiconicoVideoClient {
  private static readonly BASE_URL = 'https://nvapi.nicovideo.jp/v2';
  private readonly httpClient: HttpClient;
  private readonly rateLimiter: RateLimiter;

  constructor(config: NiconicoClientConfig) {
    this.httpClient = new HttpClient({
      cookies: config.cookies,
      timeout: 30000,
    });
    this.rateLimiter = new RateLimiter(config.requestInterval);
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
    console.log(
      `[NiconicoVideoClient] 動画データ取得 page=${page}, pageSize=${pageSize} for user: ${userId}`
    );

    await this.rateLimiter.enforce();

    const response = await this.httpClient.get<NiconicoVideoApiResponse>(
      `${NiconicoVideoClient.BASE_URL}/users/me/videos`,
      {
        sortKey: 'registeredAt',
        sortOrder: 'desc',
        pageSize,
        page,
      }
    );

    const { items, totalCount } = response.data;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasMore = page < totalPages;

    console.log(`[NiconicoVideoClient] ページ${page}: ${items.length}件取得 (全${totalCount}件中)`);

    return {
      items,
      totalCount,
      hasMore,
    };
  }
}
