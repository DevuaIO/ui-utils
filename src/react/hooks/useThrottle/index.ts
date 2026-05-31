import { useEffect, useRef, useState } from "react";

interface UseThrottleResult<T> {
  /**
   * Value updated at most once per `delay` ms.
   */
  throttled: T | undefined;

  /**
   * Immediate value — use this for the controlled input.
   */
  value: T | undefined;

  /**
   * Update `value` now; `throttled` catches up on the leading/trailing edge.
   */
  setValue: (next: T) => void;
}

/**
 * Throttled state: an immediate `value` plus a `throttled` copy that updates at
 * most once per `delay` ms.
 *
 * @remarks
 * `setValue` updates `value` synchronously — drive your controlled input from
 * it. `throttled` follows at a capped rate:
 *
 * - **Leading edge.** The first change after a quiet period propagates to
 *   `throttled` immediately (`lastRun` starts at `0`, so the first real update
 *   always fires at once).
 * - **Trailing edge.** Updates that arrive inside the window schedule a single
 *   trailing update carrying the *latest* `value`; it reschedules if `value`
 *   changes again before it fires, so nothing intermediate is emitted and the
 *   final value is never lost.
 * - The initial mount is skipped — `throttled` already equals `initial`.
 *
 * Use it to bound the rate of work driven by a fast-changing value: scroll or
 * resize handlers, live-preview computation, frequent autosaves. To instead
 * wait until updates *stop*, see {@link useDebounce}.
 *
 * @typeParam T - The stored value type. Defaults to `unknown`; the result
 *   includes `undefined` because `initial` is optional.
 * @param initial - Initial value for both `value` and `throttled`.
 * @param delay - Minimum interval in milliseconds between `throttled` updates.
 *   Defaults to `300`.
 * @returns An object with the immediate `value`, the rate-limited `throttled`,
 *   and `setValue`.
 *
 * @example
 * Throttled live preview:
 * ```tsx
 * const { value, throttled, setValue } = useThrottle("", 200);
 *
 * useEffect(() => {
 *   renderPreview(throttled);
 * }, [throttled]);
 *
 * return <textarea value={value ?? ""} onChange={(e) => setValue(e.target.value)} />;
 * ```
 *
 * @public
 */
export function useThrottle<T = unknown>(initial?: T, delay = 300): UseThrottleResult<T> {
  const [value, setValue] = useState<T | undefined>(initial);
  const [throttled, setThrottled] = useState<T | undefined>(initial);

  const lastRun = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const elapsed = Date.now() - lastRun.current;

    if (elapsed >= delay) {
      lastRun.current = Date.now();
      setThrottled(value);
    } else {
      const id = setTimeout(() => {
        lastRun.current = Date.now();
        setThrottled(value);
      }, delay - elapsed);
      return () => clearTimeout(id);
    }
  }, [value, delay]);

  return { throttled, value, setValue };
}
