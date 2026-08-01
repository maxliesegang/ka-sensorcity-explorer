// Small, dependency-free async helpers shared by the domain client and the
// Node-run snapshot capture script (scripts/capture-demo.ts). Keep this module
// free of browser- or Node-specific imports so both can use it.

/** How far a bounded batch has got: `completed` of `total` tasks settled. */
export interface BatchProgress {
  readonly completed: number;
  readonly total: number;
}

/**
 * Run `task` over `items` with at most `limit` promises in flight, preserving
 * input order in the results. Used to bound concurrency when fanning out many
 * per-sensor API requests.
 *
 * `onBatchProgress` — optional — is called after every settled task. It exists so a
 * fan-out that takes seconds can say how far along it is: the total is known up
 * front, so the wait can be reported honestly rather than as an open-ended
 * spinner. It says nothing about *what* arrived; callers still receive the whole
 * result at the end.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
  onBatchProgress?: (batchProgress: BatchProgress) => void,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("Concurrency limit must be a positive integer");
  }

  const results = new Array<R>(items.length);
  let next = 0;
  let completed = 0;
  onBatchProgress?.({ completed: 0, total: items.length });
  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      try {
        results[i] = await task(items[i], i);
      } finally {
        completed += 1;
        onBatchProgress?.({ completed, total: items.length });
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
