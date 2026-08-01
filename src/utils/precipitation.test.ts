import { describe, expect, it } from "vitest";

import {
  canObserveChange,
  sumIncrements,
  summarizePrecipitation,
} from "./precipitation";

describe("sumIncrements", () => {
  it("adds up the rises of a running counter", () => {
    expect(sumIncrements([10, 12, 12, 15])).toBe(5);
  });

  it("reads a drop as a device reset rather than negative rain", () => {
    // 245 → 4 is the wrap the gauges do; the 11 after it is still rain.
    expect(sumIncrements([243, 245, 4, 15])).toBe(13);
  });

  it("is zero for a standing counter, however high it stands", () => {
    expect(sumIncrements([244, 244, 244])).toBe(0);
  });

  it("has nothing to add for fewer than two readings", () => {
    expect(sumIncrements([244])).toBe(0);
    expect(sumIncrements([])).toBe(0);
    expect(canObserveChange([244])).toBe(false);
    expect(canObserveChange([244, 244])).toBe(true);
  });
});

describe("summarizePrecipitation", () => {
  const SINCE = 1_000;

  /** Stations arrive keyed by device id, each carrying the archive's name. */
  const stations = (entries: Record<string, number[]>) =>
    new Map(
      Object.entries(entries).map(([deviceId, values]) => [
        deviceId,
        { name: `Station ${deviceId}`, values },
      ]),
    );

  it("counts only the stations whose counter rose", () => {
    const status = summarizePrecipitation(
      stations({
        "dry-but-high": [244, 244],
        wet: [10, 13],
        "also-wet": [0, 1],
      }),
      SINCE,
    );

    expect(status).toEqual({
      wet: 2,
      reporting: 3,
      wettest: { deviceId: "wet", name: "Station wet" },
      since: SINCE,
    });
  });

  it("leaves a station that reported once out of the answer entirely", () => {
    // Counting it as dry would claim an observation nobody made.
    const status = summarizePrecipitation(
      stations({ once: [244], twice: [1, 1] }),
      SINCE,
    );

    expect(status).toEqual({
      wet: 0,
      reporting: 1,
      wettest: null,
      since: SINCE,
    });
  });

  it("has no answer when no station can be judged", () => {
    expect(summarizePrecipitation(stations({ once: [5] }), SINCE)).toBeNull();
    expect(summarizePrecipitation(new Map(), SINCE)).toBeNull();
  });
});
