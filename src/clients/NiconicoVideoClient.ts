import type { NiconicoVideoApiResponse, NiconicoVideoItem } from '../types/NiconicoVideoApiTypes';
import { BaseNiconicoClient } from './BaseNiconicoClient';

export class NiconicoVideoClient extends BaseNiconicoClient {
  private static readonly BASE_URL = 'https://nvapi.nicovideo.jp/v2';
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

    const response = await this.get<NiconicoVideoApiResponse>(
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
