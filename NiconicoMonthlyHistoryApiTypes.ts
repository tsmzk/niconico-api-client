/**
 * ニコニコ月別履歴API専用型定義
 *
 * Infrastructure層でニコニコAPIから取得する生データとそれを整理した型を定義します。
 * Domain層の型とは分離されており、API処理に特化しています。
 */

/**
 * ニコニコAPI月別履歴レスポンスの型定義
 * APIから直接取得する生データの型
 */
export interface NiconicoMonthlyHistoryApiResponse {
  meta: {
    status: number;
  };
  data: {
    total: number;
    contents: NiconicoMonthlyHistoryItem[];
  };
}

/**
 * ニコニコAPI月別履歴アイテムの型定義
 * APIレスポンス内の個別コンテンツの生データ
 */
export interface NiconicoMonthlyHistoryItem {
  globalId: string;
  title: string;
  contentKind: 'video' | 'live';
  score: {
    thisMonth: {
      allTotal: number;
      originTotal: number;
      royaltiesTotal: number;
    };
  };
}

/**
 * 整理された月別履歴データ型
 * Repository層がAPIから取得したデータを整理して返す型
 */
export interface NiconicoMonthlyHistoryResponse {
  globalId: string;
  title: string;
  contentKind: 'video' | 'live';
  score: {
    thisMonth: {
      allTotal: number;
      originTotal: number;
      royaltiesTotal: number;
    };
  };
  createdAt: string;
}
