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
   *
   */
  setValue: (next: T) => void;
}

export function useDebounce<T = unknown>(initial?: T, delay = 300): UseDebounceResult<T> {
  const [value, setValue] = useState<T | undefined>(initial);
  const [debounced, setDebounced] = useState<T | undefined>(initial);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return { debounced, value, setValue };
}
