import { describe, expect, it } from "vitest";

import { mapWithConcurrency, type BatchProgress } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("preserves input order and bounds the number of in-flight tasks", async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (item) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return item * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it("reports progress from zero up to the total, once per settled task", async () => {
    const batchProgressReports: BatchProgress[] = [];
    await mapWithConcurrency([1, 2, 3], 2, async (item) => item, (batchProgress) =>
      batchProgressReports.push(batchProgress),
    );

    expect(batchProgressReports).toEqual([
      { completed: 0, total: 3 },
      { completed: 1, total: 3 },
      { completed: 2, total: 3 },
      { completed: 3, total: 3 },
    ]);
  });

  it("reports the total even when there is nothing to do", async () => {
    const batchProgressReports: BatchProgress[] = [];
    const results = await mapWithConcurrency([], 4, async (item) => item, (batchProgress) =>
      batchProgressReports.push(batchProgress),
    );

    expect(results).toEqual([]);
    expect(batchProgressReports).toEqual([{ completed: 0, total: 0 }]);
  });

  it("counts rejected tasks as settled before propagating the error", async () => {
    let releasePendingTask!: () => void;
    const pendingTask = new Promise<void>((resolve) => {
      releasePendingTask = resolve;
    });
    const batchProgressReports: BatchProgress[] = [];
    const batch = mapWithConcurrency(
      ["failed", "pending"],
      2,
      async (item) => {
        if (item === "failed") throw new Error("request failed");
        await pendingTask;
        return item;
      },
      (batchProgress) => batchProgressReports.push(batchProgress),
    );

    await expect(batch).rejects.toThrow("request failed");
    expect(batchProgressReports).toEqual([
      { completed: 0, total: 2 },
      { completed: 1, total: 2 },
    ]);

    releasePendingTask();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(batchProgressReports).toEqual([
      { completed: 0, total: 2 },
      { completed: 1, total: 2 },
      { completed: 2, total: 2 },
    ]);
  });

  it("rejects invalid concurrency limits", async () => {
    await expect(mapWithConcurrency([1], 0, async (item) => item)).rejects.toThrow(
      "Concurrency limit must be a positive integer",
    );
  });
});
