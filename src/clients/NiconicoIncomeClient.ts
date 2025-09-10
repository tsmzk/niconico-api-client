import dayjs from 'dayjs';
import type {
  NiconicoIncomeApiResponse,
  NiconicoIncomeContent,
  NiconicoIncomeTotalResponse,
} from '../types/NiconicoIncomeApiTypes';
import type {
  NiconicoMonthlyHistoryApiResponse,
  NiconicoMonthlyHistoryItem,
} from '../types/NiconicoMonthlyHistoryApiTypes';
import { BaseNiconicoClient } from './BaseNiconicoClient';

export class NiconicoIncomeClient extends BaseNiconicoClient {
  private static readonly BASE_URL = 'https://public-api.commons.nicovideo.jp/v1/my/cpp';
  async fetchEarnings(
    userId: string,
    offset: number,
    limit: number
  ): Promise<{
    contents: NiconicoIncomeContent[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const { year, month } = await this.determineTargetYearMonth();
    const apiUrl = `${NiconicoIncomeClient.BASE_URL}/forecasts/${year}/${month}`;

    console.log(
      `[NiconicoIncomeClient] 収益データ取得: ${year}年${month}月, offset=${offset}, limit=${limit} for user: ${userId}`
    );

    const response = await this.get<NiconicoIncomeApiResponse>(apiUrl, {
      _offset: offset,
      _limit: limit,
      _sort: '-createdAt',
      with_filter: 0,
    });

    const { contents, total } = response.data;
    const hasMore = offset + limit < total && contents.length > 0;

    console.log(
      `[NiconicoIncomeClient] offset=${offset}: ${contents.length}件取得 (全${total}件中)`
    );

    return {
      contents,
      totalCount: total,
      hasMore,
    };
  }

  async fetchEarningsHistory(
    yearMonth: string,
    userId: string,
    offset: number,
    limit: number
  ): Promise<{
    contents: NiconicoMonthlyHistoryItem[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const year = yearMonth.substring(0, 4);
    const month = yearMonth.substring(4, 6);

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error(`無効な年月フォーマット: ${yearMonth}`);
    }

    const now = dayjs();
    const currentYear = now.year();
    const currentMonth = now.month() + 1;

    if (yearNum > currentYear || (yearNum === currentYear && monthNum > currentMonth)) {
      throw new Error(`未来の月のデータは取得できません。指定された期間: ${year}/${month}`);
    }

    const twoMonthsAgoYear = currentMonth > 2 ? currentYear : currentYear - 1;
    const twoMonthsAgoMonth = currentMonth > 2 ? currentMonth - 2 : currentMonth + 10;
    const isAfterTwoMonthsAgo =
      yearNum > twoMonthsAgoYear || (yearNum === twoMonthsAgoYear && monthNum > twoMonthsAgoMonth);

    if (isAfterTwoMonthsAgo) {
      const limitMonth = String(twoMonthsAgoMonth).padStart(2, '0');
      throw new Error(
        `月別履歴は2ヶ月前以前のデータのみ取得可能です。指定された期間: ${year}/${month} (制限: ${twoMonthsAgoYear}/${limitMonth}以前)`
      );
    }

    const apiUrl = `${NiconicoIncomeClient.BASE_URL}/histories/${year}/${month}`;

    console.log(
      `[NiconicoIncomeClient] 収益履歴データ取得: ${year}/${month}, offset=${offset}, limit=${limit} for user: ${userId}`
    );

    const response = await this.get<NiconicoMonthlyHistoryApiResponse>(apiUrl, {
      _offset: offset,
      _limit: limit,
      _sort: '-score.thisMonth.allTotal',
    });

    const { contents, total } = response.data;
    const hasMore = contents.length > 0 && offset + limit < total;

    console.log(
      `[NiconicoIncomeClient] offset=${offset}: ${contents.length}件取得 (全${total}件中)`
    );

    return {
      contents,
      totalCount: total,
      hasMore,
    };
  }

  private async determineTargetYearMonth(): Promise<{ year: number; month: number }> {
    const currentDate = dayjs();
    const requestedYear = currentDate.year();
    const requestedMonth = currentDate.month() + 1;

    const isCurrentMonthAvailable = await this.checkEarningsAvailability(
      requestedYear,
      requestedMonth
    );

    if (isCurrentMonthAvailable) {
      console.log(`${requestedYear}年${requestedMonth}月の収益データは利用可能です`);
      return { year: requestedYear, month: requestedMonth };
    }

    const previousMonth = this.getPreviousMonth(requestedYear, requestedMonth);
    console.log(
      `${requestedYear}年${requestedMonth}月の収益データは集計中のため、前月 ${previousMonth.year}年${previousMonth.month}月のデータを取得します`
    );
    return previousMonth;
  }

  private async checkEarningsAvailability(year: number, month: number): Promise<boolean> {
    const totalApiUrl = `${NiconicoIncomeClient.BASE_URL}/forecasts/total/${year}/${month}`;

    try {
      const response = await this.requestWithSpecialHandling<NiconicoIncomeTotalResponse>(
        totalApiUrl,
        {
          method: 'GET',
          params: { _limit: 1 },
        }
      );

      // 手動でステータスチェック（409も含めて）
      if (this.hasMetaStatus(response)) {
        console.log(
          `収益データ利用可能性チェック ${year}年${month}月: ステータス ${response.meta.status}`
        );

        if (response.meta.status === 200) {
          return true;
        }

        if (response.meta.status === 409) {
          console.log(`集計中エラー詳細: ${JSON.stringify(response.data)}`);
          return false;
        }

        console.warn(`予期しないステータスコード: ${response.meta.status}, 利用可能として扱います`);
        return true;
      }

      // metaプロパティがない場合は利用可能として扱う
      return true;
    } catch {
      // ネットワークエラーなど、その他のエラーは処理できないため利用不可として扱う
      return false;
    }
  }

  private hasMetaStatus(data: unknown): data is { meta: { status: number } } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'meta' in data &&
      typeof (data as { meta: unknown }).meta === 'object' &&
      (data as { meta: unknown }).meta !== null &&
      'status' in (data as { meta: { status: unknown } }).meta
    );
  }

  private getPreviousMonth(year: number, month: number): { year: number; month: number } {
    if (month === 1) {
      return { year: year - 1, month: 12 };
    }
    return { year, month: month - 1 };
  }
}
