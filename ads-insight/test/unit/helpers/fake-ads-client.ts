import type { AdsClient, AdsRow, MutateResponse } from '../../../src/ads/client';

/**
 * A stand-in `AdsClient` for tool tests: queue one row set per expected
 * `search()` call (tools that fetch two ranges, like `gads_get_performance`,
 * call it twice — current period first, then the comparison period).
 */
export function fakeAdsClient(queuedRows: AdsRow[][]): AdsClient & { queries: string[] } {
  const queue = [...queuedRows];
  const queries: string[] = [];
  let ops = 0;

  return {
    queries,
    async search(_customerId, query) {
      queries.push(query);
      ops += 1;
      return queue.shift() ?? [];
    },
    async mutate(): Promise<MutateResponse> {
      throw new Error('fakeAdsClient: mutate() is not used by any read tool');
    },
    opsUsed: () => ops,
  };
}
