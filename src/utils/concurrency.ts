// Small, dependency-free async helpers shared by the domain client and the
// Node-run snapshot capture script (scripts/capture-demo.ts). Keep this module
// free of browser- or Node-specific imports so both can use it.

/**
 * Run `task` over `items` with at most `limit` promises in flight, preserving
 * input order in the results. Used to bound concurrency when fanning out many
 * per-sensor API requests.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await task(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
