import { useEffect, useState } from "react";

interface UseDebounceResult<T> {
  /**
   * Value that lags behind `value` by `delay` ms after the last update.
   */
  debounced: T | undefined;

  /**
   * Immediate value — use this for the controlled input.
   */
  value: T | undefined;

  /**
   * Update `value` now and (re)start the debounce timer.
   */
  setValue: (next: T) => void;
}

/**
 * Debounced state: an immediate `value` plus a `debounced` copy that only
 * catches up after updates have paused for `delay` ms.
 *
 * @remarks
 * `setValue` updates `value` synchronously — drive your controlled input from
 * it — and restarts a timer. `debounced` moves to the latest `value` only once
 * `delay` ms pass with no further `setValue` call; intermediate values are
 * skipped, because every update clears the pending timer. Use `debounced` as
 * the trigger for expensive work: search requests, validation, persistence.
 *
 * For rate-limiting a continuously changing value rather than waiting for it to
 * settle, see {@link useThrottle}.
 *
 * @typeParam T - The stored value type. Defaults to `unknown`; the result
 *   includes `undefined` because `initial` is optional.
 * @param initial - Initial value for both `value` and `debounced`.
 * @param delay - Quiet period in milliseconds before `debounced` catches up.
 *   Defaults to `300`.
 * @returns An object with the immediate `value`, the lagging `debounced`, and
 *   `setValue`.
 *
 * @example
 * Debounced search input:
 * ```tsx
 * const { value, debounced, setValue } = useDebounce("", 500);
 *
 * useEffect(() => {
 *   if (debounced) fetchResults(debounced);
 * }, [debounced]);
 *
 * return <input value={value ?? ""} onChange={(e) => setValue(e.target.value)} />;
 * ```
 *
 * @public
 */
export function useDebounce<T = unknown>(initial?: T, delay = 300): UseDebounceResult<T> {
  const [value, setValue] = useState<T | undefined>(initial);
  const [debounced, setDebounced] = useState<T | undefined>(initial);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return { debounced, value, setValue };
}
