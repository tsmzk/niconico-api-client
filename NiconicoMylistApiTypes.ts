/**
 * ニコニコマイリストAPI関連の型定義
 */

/**
 * マイリストオーナー情報
 */
export interface NiconicoMylistOwner {
  ownerType: string;
  type: string;
  visibility: string;
  id: string;
  name: string;
  iconUrl: string;
}

/**
 * マイリストサンプルアイテム
 */
export interface NiconicoMylistSampleItem {
  itemId: number;
  watchId: string;
  title: string;
  thumbnailUrl: string;
}

/**
 * マイリスト情報
 */
export interface NiconicoMylist {
  id: number;
  isPublic: boolean;
  name: string;
  description: string;
  decoratedDescriptionHtml: string;
  defaultSortKey: string;
  defaultSortOrder: string;
  itemsCount: number;
  owner: NiconicoMylistOwner;
  sampleItems: NiconicoMylistSampleItem[];
  followerCount: number;
  createdAt: string;
  isFollowing: boolean;
}

/**
 * マイリスト一覧APIレスポンス
 */
export interface NiconicoMylistsApiResponse {
  meta: {
    status: number;
  };
  data: {
    mylists: NiconicoMylist[];
  };
}

/**
 * マイリスト内動画情報
 */
export interface NiconicoMylistVideo {
  type: string;
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
  playbackPosition: number;
  owner: NiconicoMylistOwner;
  requireSensitiveMasking: boolean;
  videoLive: null;
  isMuted: boolean;
  '9d091f87': boolean;
  acf68865: boolean;
}

/**
 * マイリストアイテム
 */
export interface NiconicoMylistItem {
  itemId: number;
  watchId: string;
  description: string;
  decoratedDescriptionHtml: string;
  addedAt: string;
  status: string;
  video: NiconicoMylistVideo;
}

/**
 * マイリスト詳細
 */
export interface NiconicoMylistDetail {
  id: number;
  name: string;
  description: string;
  decoratedDescriptionHtml: string;
  defaultSortKey: string;
  defaultSortOrder: string;
  items: NiconicoMylistItem[];
  totalItemCount: number;
  hasNext: boolean;
  isPublic: boolean;
  owner: NiconicoMylistOwner;
  hasInvisibleItems: boolean;
  followerCount: number;
  isFollowing: boolean;
}

/**
 * マイリスト詳細APIレスポンス
 */
export interface NiconicoMylistDetailApiResponse {
  meta: {
    status: number;
  };
  data: {
    mylist: NiconicoMylistDetail;
  };
}

/**
 * マイリスト操作APIレスポンス
 */
export interface NiconicoMylistOperationApiResponse {
  meta: {
    status: number;
  };
}
