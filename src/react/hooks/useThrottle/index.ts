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
