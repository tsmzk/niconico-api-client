// メインAPIクライアント（ファサードパターン）
export { NiconicoClient } from './NiconicoClient';
export type { NiconicoCookie, NiconicoClientConfig } from './NiconicoClient';

// オリジナルの実装クラス（上級者向け）
export { NiconicoApiClient } from './NiconicoApiClient';

// インターフェース
export type { INiconicoApiClient } from './INiconicoApiClient';

// 全ての型定義をエクスポート
export * from './types';