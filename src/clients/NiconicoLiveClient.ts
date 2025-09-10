import type { NiconicoClientConfig } from '../types/common';
import type {
  NiconicoLiveBroadcastApiResponse,
  NiconicoLiveProgramData,
} from '../types/NiconicoLiveApiTypes';
import { HttpClient } from '../utils/httpClient';
import { RateLimiter } from '../utils/rateLimiter';

export class NiconicoLiveClient {
  private static readonly BASE_URL = 'https://live.nicovideo.jp/front/api/v2';
  private readonly httpClient: HttpClient;
  private readonly rateLimiter: RateLimiter;
  private readonly userId?: string;

  constructor(config: NiconicoClientConfig) {
    this.httpClient = new HttpClient({
      cookies: config.cookies,
      timeout: 30000,
    });
    this.rateLimiter = new RateLimiter(config.requestInterval);
    this.userId = config.userId;
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
    const actualUserId = this.userId || userId;

    console.log(
      `[NiconicoLiveClient] 生放送データ取得 offset=${offset}, limit=${limit} for user: ${userId}`
    );

    await this.rateLimiter.enforce();

    const apiParams = {
      providerId: actualUserId,
      providerType: 'user',
      isIncludeNonPublic: true,
      offset,
      limit,
      withTotalCount: true,
    };

    const response = await this.httpClient.get<NiconicoLiveBroadcastApiResponse>(
      `${NiconicoLiveClient.BASE_URL}/user-broadcast-history`,
      apiParams
    );

    const { programsList, totalCount } = response.data;
    const hasMore = !response.data.hasNext === false && offset + limit < totalCount;

    console.log(
      `[NiconicoLiveClient] offset=${offset}: ${programsList.length}件取得 (全${totalCount}件中)`
    );

    return {
      programsList,
      totalCount,
      hasMore,
    };
  }
}
