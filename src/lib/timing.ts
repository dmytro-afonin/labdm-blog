/**
 * Lightweight timing helpers for measuring DB / network calls in API routes.
 *
 * Usage:
 *   const timings: Timings = {};
 *   const row = await timed("db.getSubscriberByEmail", () => sql`...`, timings);
 *   // in dev only: console [timing] db.getSubscriberByEmail: 142ms
 *   // timings === { "db.getSubscriberByEmail": 142 }
 *
 * The collected `Timings` map is also useful as a property bag on PostHog
 * events so per-step durations show up in dashboards (PostHog itself does
 * not auto-instrument any I/O — every number you see has to be passed in).
 */

export type Timings = Record<string, number>;

const PERF_NOW: () => number =
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? () => performance.now()
    : () => Date.now();

/**
 * Run `fn`, log how long it took, and (optionally) record the duration into
 * the supplied `store` under `label`. Errors are re-thrown after the timing
 * is logged so failed calls are still observable.
 */
export async function timed<T>(
  label: string,
  fn: () => Promise<T>,
  store?: Timings,
): Promise<T> {
  const start = PERF_NOW();
  try {
    return await fn();
  } finally {
    const ms = Math.round(PERF_NOW() - start);
    if (store) store[label] = ms;
    if (import.meta.env.DEV) {
      console.log(`[timing] ${label}: ${ms}ms`);
    }
  }
}

/** Sum of every timing in `store`. */
export function totalTiming(store: Timings): number {
  let total = 0;
  for (const value of Object.values(store)) total += value;
  return total;
}
