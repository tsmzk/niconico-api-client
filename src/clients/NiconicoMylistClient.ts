import type {
  NiconicoMylist,
  NiconicoMylistDetail,
  NiconicoMylistDetailApiResponse,
  NiconicoMylistOperationApiResponse,
  NiconicoMylistsApiResponse,
} from '../types/NiconicoMylistApiTypes';
import { BaseNiconicoClient } from './BaseNiconicoClient';

export class NiconicoMylistClient extends BaseNiconicoClient {
  async fetchMylists(sampleItemCount = 3): Promise<{
    mylists: NiconicoMylist[];
  }> {
    console.log(`[NiconicoMylistClient] マイリスト一覧取得 sampleItemCount=${sampleItemCount}`);

    const response = await this.request<NiconicoMylistsApiResponse>(
      'https://nvapi.nicovideo.jp/v1/users/me/mylists',
      { sampleItemCount }
    );

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

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

    const response = await this.request<NiconicoMylistDetailApiResponse>(
      `https://nvapi.nicovideo.jp/v1/users/me/mylists/${mylistId}`,
      { page, pageSize }
    );

    if (response.meta.status !== 200) {
      throw new Error(`API応答エラー: status=${response.meta.status}`);
    }

    const { mylist } = response.data;

    console.log(
      `[NiconicoMylistClient] マイリスト「${mylist.name}」: ${mylist.items.length}件取得 (全${mylist.totalItemCount}件中)`
    );

    return { mylist };
  }

  async addToMylist(mylistId: string, videoIds: string[]): Promise<void> {
    const cookieHeader = this.buildCookieHeader();
    const headers = {
      Cookie: cookieHeader,
    };

    for (const videoId of videoIds) {
      console.log(
        `[NiconicoMylistClient] マイリストに動画追加 mylistId=${mylistId}, videoId=${videoId}`
      );

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

      console.log(`[NiconicoMylistClient] 動画 ${videoId} をマイリストに追加しました`);
    }
  }

  async removeFromMylist(mylistId: string, itemIds: number[]): Promise<void> {
    const itemIdsStr = itemIds.join(',');

    console.log(
      `[NiconicoMylistClient] マイリストから動画削除 mylistId=${mylistId}, itemIds=${itemIdsStr}`
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

    console.log(`[NiconicoMylistClient] アイテム ${itemIdsStr} をマイリストから削除しました`);
  }
}
