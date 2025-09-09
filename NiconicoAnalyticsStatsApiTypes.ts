/**
 * ニコニコアナリティクス統計API型定義
 *
 * 動画の過去最大6ヶ月間の日次メトリクス（再生数、コメント数、いいね数、マイリスト数）を取得するAPIの型定義
 */

/**
 * ニコニコアナリティクス統計APIレスポンス（生APIデータ）
 * APIから直接受け取るレスポンスの型定義
 */
export interface NiconicoAnalyticsStatsApiResponse {
  meta: {
    status: number;
  };
  data: NiconicoAnalyticsStatsItem[];
}

/**
 * アナリティクス統計の日次データ項目（生APIデータ）
 * APIレスポンスに含まれる個別統計データの型定義
 */
export interface NiconicoAnalyticsStatsItem {
  dimensions: {
    type: 'date';
    label: string; // YYYY-MM-DD形式
  }[];
  metrics: {
    type: 'viewCount' | 'commentCount' | 'likeCount' | 'mylistCount';
    value: number;
  }[];
}

/**
 * ニコニコアナリティクス統計レスポンス（整理済み）
 * APIから取得したデータを整理した形で保持する型
 */
export interface NiconicoAnalyticsStatsResponse {
  /** 日付（YYYYMMDD形式） */
  date: string;
  /** 再生数 */
  viewCount: number;
  /** コメント数 */
  commentCount: number;
  /** いいね数 */
  likeCount: number;
  /** マイリスト数 */
  mylistCount: number;
}
