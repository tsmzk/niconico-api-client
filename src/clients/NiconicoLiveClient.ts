import type {
  NiconicoLiveBroadcastApiResponse,
  NiconicoLiveProgramData,
} from '../types/NiconicoLiveApiTypes';
import { BaseNiconicoClient } from './BaseNiconicoClient';

export class NiconicoLiveClient extends BaseNiconicoClient {
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

    const apiParams = {
      providerId: actualUserId,
      providerType: 'user',
      isIncludeNonPublic: true,
      offset,
      limit,
      withTotalCount: true,
    };

    const response = await this.get<NiconicoLiveBroadcastApiResponse>(
      'https://live.nicovideo.jp/front/api/v2/user-broadcast-history',
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
