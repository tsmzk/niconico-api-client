export type NiconicoCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
};

export interface NiconicoClientConfig {
  cookies: NiconicoCookie[];
  userId?: string;
  requestInterval?: number;
}

export interface NiconicoApiResponse<T = unknown> {
  meta: {
    status: number;
    errorCode?: string;
    errorMessage?: string;
  };
  data: T;
}
