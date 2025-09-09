/**
 * ニコニコ動画API専用型定義
 *
 * ScrapedVideo型との分離により、Infrastructure層の責務を明確化
 * API処理とデータ取得処理の完全分離を実現
 */

/**
 * ニコニコAPI動画レスポンス（整理済み）
 * APIから取得したデータを整理した形で保持する型
 */
export interface NiconicoVideoResponse {
  /** 動画ID */
  id: string;
  /** 動画タイトル */
  title: string;
  /** サムネイルURL */
  thumbnailUrl: string;
  /** アップロード日時 */
  uploadedAt: Date;
  /** 動画の長さ（秒） */
  durationSeconds: number;
  /** 再生数 */
  viewCount: number;
  /** コメント数 */
  commentCount: number;
  /** いいね数 */
  likeCount: number;
  /** マイリスト数 */
  myListCount: number;
  /** ギフトポイント */
  gift: number;
  /** シリーズID（任意） */
  seriesId?: string;
  /** シリーズタイトル（任意） */
  seriesTitle?: string;
  /** 非公開フラグ */
  isHidden: boolean;
  /** 削除フラグ */
  isDeleted: boolean;
  /** 動画説明 */
  description: string;
}

/**
 * ニコニコAPI動画一覧レスポンス（生APIデータ）
 * APIから直接受け取るレスポンスの型定義
 */
export interface NiconicoVideoApiResponse {
  meta: {
    status: number;
  };
  data: {
    limitation: {
      borderId: number;
      user: {
        uploadableCount: number | null;
        uploadedCountForLimitation: number;
      };
    };
    totalCount: number;
    totalItemCount: number;
    items: NiconicoVideoItem[];
  };
}

/**
 * ニコニコAPI動画アイテム（生APIデータ）
 * APIレスポンスに含まれる個別動画データの型定義
 */
export interface NiconicoVideoItem {
  isCaptureTweetAllowed: boolean;
  isClipTweetAllowed: boolean;
  isCommunityMemberOnly: boolean;
  description: string;
  isHidden: boolean;
  isDeleted: boolean;
  isCppRegistered: boolean;
  isContentsTreeExists: boolean;
  publishTimerDetail: unknown | null;
  autoDeleteDetail: unknown | null;
  isExcludeFromUploadList: boolean;
  likeCount: number;
  giftPoint: number;
  series?: {
    id: number;
    title: string;
    order: number;
  };
  threadId: number;
  essential: {
    type: 'essential';
    id: string;
    title: string;
    registeredAt: string;
    count: {
      view: number;
      comment: number;
      mylist: number;
      like: number;
    };
    thumbnail: {
      url: string;
      middleUrl: string;
      largeUrl: string;
      listingUrl: string;
      nHdUrl: string;
    };
    duration: number;
    shortDescription: string;
    latestCommentSummary: string;
    isChannelVideo: boolean;
    isPaymentRequired: boolean;
    playbackPosition: number | null;
    owner: {
      ownerType: 'user';
      type: 'user';
      visibility: 'visible' | 'hidden';
      id: string;
      name: string;
      iconUrl: string;
    };
    requireSensitiveMasking: boolean;
    videoLive: unknown | null;
    isMuted: boolean;
    '9d091f87': boolean;
    acf68865: boolean;
  };
  f516281b: boolean;
}
