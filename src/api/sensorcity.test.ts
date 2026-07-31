import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchHourlyBuckets } from "./sensorcity";

const HOUR = 3_600_000;
const DAY = Date.UTC(2026, 6, 29);

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubQuery(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("fetchHourlyBuckets", () => {
  it("rebuilds each bucket's start from the day and hour group-by expressions", async () => {
    stubQuery({
      features: [
        {
          attributes: {
            EXPR_1: DAY,
            EXPR_2: 14,
            mean_value: 20.5,
            min_value: 15.1,
            max_value: 24.7,
            sample_count: 568,
          },
        },
        {
          attributes: {
            EXPR_1: DAY,
            EXPR_2: 2,
            mean_value: 18,
            min_value: 17,
            max_value: 19,
            sample_count: 4,
          },
        },
      ],
    });

    // Returned oldest-first regardless of the order the service replies in.
    await expect(fetchHourlyBuckets(2, "temp", { since: new Date(DAY) })).resolves.toEqual([
      { timestamp: DAY + 2 * HOUR, mean: 18, min: 17, max: 19, sampleCount: 4 },
      { timestamp: DAY + 14 * HOUR, mean: 20.5, min: 15.1, max: 24.7, sampleCount: 568 },
    ]);
  });

  it("skips rows missing a bucket or an aggregate", async () => {
    stubQuery({
      features: [
        { attributes: { EXPR_1: DAY, EXPR_2: null, mean_value: 20, min_value: 19, max_value: 21 } },
        { attributes: { EXPR_1: DAY, EXPR_2: 3, mean_value: null, min_value: 19, max_value: 21 } },
        {
          attributes: {
            EXPR_1: DAY,
            EXPR_2: 4,
            mean_value: 20,
            min_value: 19,
            max_value: 21,
            sample_count: null,
          },
        },
      ],
    });

    // The last row survives: a null count is a missing tally, not a missing hour.
    await expect(fetchHourlyBuckets(2, "temp", { since: new Date(DAY) })).resolves.toEqual([
      { timestamp: DAY + 4 * HOUR, mean: 20, min: 19, max: 21, sampleCount: 0 },
    ]);
  });

  it("asks the service to aggregate, bounded by a UTC timestamp literal", async () => {
    const fetchMock = stubQuery({ features: [] });
    await fetchHourlyBuckets(2, "temp", {
      since: new Date(Date.UTC(2026, 6, 21, 9, 5, 30)),
    });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toContain("/2/query");
    expect(url.searchParams.get("where")).toBe(
      "temp IS NOT NULL AND measured_at >= TIMESTAMP '2026-07-21 09:05:30'",
    );
    expect(url.searchParams.get("groupByFieldsForStatistics")).toBe(
      "CAST(measured_at AS DATE),EXTRACT(HOUR FROM measured_at)",
    );
    // Grouping without a matching order would leave the series unsorted upstream.
    expect(url.searchParams.get("orderByFields")).toBe(
      url.searchParams.get("groupByFieldsForStatistics"),
    );
    expect(
      JSON.parse(String(url.searchParams.get("outStatistics"))).map(
        (stat: { statisticType: string }) => stat.statisticType,
      ),
    ).toEqual(["avg", "min", "max", "count"]);
  });
});
