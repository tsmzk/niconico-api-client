import type { NiconicoClientConfig } from '../types/common';
import type {
  NiconicoMylist,
  NiconicoMylistDetail,
  NiconicoMylistDetailApiResponse,
  NiconicoMylistOperationApiResponse,
  NiconicoMylistsApiResponse,
} from '../types/NiconicoMylistApiTypes';
import { HttpClient } from '../utils/httpClient';
import { RateLimiter } from '../utils/rateLimiter';

export class NiconicoMylistClient {
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
  async fetchMylists(sampleItemCount = 3): Promise<{
    mylists: NiconicoMylist[];
  }> {
    console.log(`[NiconicoMylistClient] マイリスト一覧取得 sampleItemCount=${sampleItemCount}`);

    await this.rateLimiter.enforce();

    const response = await this.httpClient.get<NiconicoMylistsApiResponse>(
      `${NiconicoMylistClient.BASE_URL}/users/me/mylists`,
      { sampleItemCount }
    );

    const { mylists } = response.data;

    console.log(`[NiconicoMylistClient] マイリスト: ${mylists.length}件取得`);

    return { mylists };
  }

  async fetchMylistItems(
    mylistId: string,
    page = 1,
    pageSize = 100
  ): Promise<{
    mylist: NiconicoMylistDetail;
  }> {
    console.log(
      `[NiconicoMylistClient] マイリスト詳細取得 mylistId=${mylistId}, page=${page}, pageSize=${pageSize}`
    );

    await this.rateLimiter.enforce();

    const response = await this.httpClient.get<NiconicoMylistDetailApiResponse>(
      `${NiconicoMylistClient.BASE_URL}/users/me/mylists/${mylistId}`,
      { page, pageSize }
    );

    const { mylist } = response.data;

    console.log(
      `[NiconicoMylistClient] マイリスト「${mylist.name}」: ${mylist.items.length}件取得 (全${mylist.totalItemCount}件中)`
    );

    return { mylist };
  }

  async addToMylist(mylistId: string, videoIds: string[]): Promise<void> {
    for (const videoId of videoIds) {
      console.log(
        `[NiconicoMylistClient] マイリストに動画追加 mylistId=${mylistId}, videoId=${videoId}`
      );

      await this.rateLimiter.enforce();

      const url = `${NiconicoMylistClient.BASE_URL}/users/me/mylists/${mylistId}/items?itemId=${videoId}`;

      await this.httpClient.post<NiconicoMylistOperationApiResponse>(url, {});

      console.log(`[NiconicoMylistClient] 動画 ${videoId} をマイリストに追加しました`);
    }
  }

  async removeFromMylist(mylistId: string, itemIds: number[]): Promise<void> {
    const itemIdsStr = itemIds.join(',');

    console.log(
      `[NiconicoMylistClient] マイリストから動画削除 mylistId=${mylistId}, itemIds=${itemIdsStr}`
    );

    await this.rateLimiter.enforce();

    const url = `${NiconicoMylistClient.BASE_URL}/users/me/mylists/${mylistId}/items`;

    await this.httpClient.delete<NiconicoMylistOperationApiResponse>(url, { itemIds: itemIdsStr });

    console.log(`[NiconicoMylistClient] アイテム ${itemIdsStr} をマイリストから削除しました`);
  }
}
