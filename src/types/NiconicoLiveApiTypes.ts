/**
 * ニコニコ生放送API専用型定義
 *
 * このファイルは、ニコニコ生放送APIから取得したデータを表現するための型定義を提供します。
 * データ取得用の型（ScrapedLive）とは完全に分離し、API処理とデータ取得処理のアーキテクチャ違反を防ぎます。
 */

/**
 * 生放送プログラムの型定義（APIレスポンス内の個別アイテム）
 */
export interface NiconicoLiveProgramData {
  id: {
    value: string;
  };
  program: {
    title: string;
    schedule: {
      status: string;
      beginTime: {
        seconds: number;
        nanos: number;
      };
      endTime?: {
        seconds: number;
        nanos: number;
      };
    };
  };
  statistics: {
    viewers: {
      value: number;
    };
    comments: {
      value: number;
    };
  };
  thumbnail?: {
    listing?: {
      middle?: string;
      large?: {
        value: string;
      };
    };
  };
}

/**
 * 生放送履歴APIのレスポンス型（API直接レスポンス）
 */
export interface NiconicoLiveBroadcastApiResponse {
  meta: {
    status: number;
  };
  data: {
    programsList: NiconicoLiveProgramData[];
    hasNext: boolean;
    totalCount: number;
  };
}

/**
 * 整理されたニコニコ生放送データ（Repository層から返される型）
 *
 * この型はAPIレスポンスを整理・正規化した後の形式を表現します。
 * ScrapedLiveとは完全に分離されており、API処理専用の型として機能します。
 */
export interface NiconicoLiveResponse {
  id: string;
  title: string;
  thumbnailUrl: string;
  uploadedAt: Date;
  durationSeconds: number;
  viewCount: number;
  commentCount: number;
}
