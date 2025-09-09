/**
 * ニコニコ収益API専用型定義
 *
 * このファイルはInfrastructure層のAPI処理専用の型を定義します。
 * Domain層のScrapedData型とは完全に分離されており、API処理とデータ取得処理の混在を防ぎます。
 */

/**
 * ニコニコAPIの共通メタデータ型
 */
export interface NiconicoApiMeta {
  status: number;
}

/**
 * ニコニコ収益APIのレスポンス型（CPP Forecasts API）
 */
export interface NiconicoIncomeApiResponse {
  meta: NiconicoApiMeta;
  data: {
    total: number;
    scoreDisclosedStatus: number;
    contents: NiconicoIncomeContent[];
  };
}

/**
 * ニコニコ収益API /total エンドポイントの成功レスポンス型
 */
export interface NiconicoIncomeTotalSuccessResponse {
  meta: NiconicoApiMeta;
  data: Record<string, unknown>;
}

/**
 * ニコニコ収益API /total エンドポイントのエラーレスポンス型（409 Conflict）
 */
export interface NiconicoIncomeTotalErrorResponse {
  meta: NiconicoApiMeta;
  data: {
    code: string;
    message: string;
  };
}

/**
 * ニコニコ収益API /total エンドポイントのレスポンス型（Union型）
 */
export type NiconicoIncomeTotalResponse =
  | NiconicoIncomeTotalSuccessResponse
  | NiconicoIncomeTotalErrorResponse;

/**
 * ニコニコ収益コンテンツの詳細型定義
 * 削除されたコンテンツなどでは一部のプロパティが欠ける可能性があります
 */
export interface NiconicoIncomeContent {
  title?: string;
  logoURL?: string;
  watchURL?: string;
  treeURL?: string;
  treeEditURL?: string;
  thumbnailURL?: string;
  description?: string;
  userId: number;
  globalId: string;
  contentId: number;
  contentKind: 'video' | 'live';
  scoreDisclosedStatus: number;
  scoreImpartmentStatus: number;
  createdAt: string;
  score?: {
    sum?: {
      allTotal?: number;
      originTotal?: number;
      royaltiesTotal?: number;
    };
    thisMonth?: {
      allTotalExpectationMin?: number;
      allTotalExpectationMax?: number;
      originTotalExpectationMin?: number;
      originTotalExpectationMax?: number;
      royaltiesTotalExpectationMin?: number;
      royaltiesTotalExpectationMax?: number;
    };
    lastMonth?: {
      allTotalExpectationMin?: number;
      allTotalExpectationMax?: number;
      originTotalExpectationMin?: number;
      originTotalExpectationMax?: number;
      royaltiesTotalExpectationMin?: number;
      royaltiesTotalExpectationMax?: number;
    };
  };
}

/**
 * ニコニコ収益API処理の戻り値型
 * Repository層からService層への返却用
 */
export interface NiconicoIncomeResponse {
  contentId: string;
  contentType: 'Video' | 'Live';
  title: string;
  thumbnailUrl: string;
  registeredAt: Date;
  totalIncome: number;
  monthlyIncome: number;
}
