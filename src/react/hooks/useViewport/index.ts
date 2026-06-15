import { useEffect, useState } from "react";

/**
 * Reactive mobile breakpoint — returns `true` when the viewport width is at
 * or below `width` pixels.
 *
 * Subscribes to `matchMedia("change")` for precise, zero-overhead breakpoint
 * detection, with a throttled `resize` listener as a safety fallback for
 * browsers that may miss the exact crossing event under heavy load.
 *
 * SSR-safe: returns `false` on the server where `window` is unavailable.
 *
 * @param width - The breakpoint in pixels (inclusive upper bound). Defaults to `768`.
 * @returns `true` when `window.innerWidth <= width`, `false` otherwise.
 *
 * @example
 * const isMobile = useViewport();      // true when ≤ 768px
 * const isTablet = useViewport(1024);  // true when ≤ 1024px
 */
export function useViewport(width: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${width}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(`(max-width: ${width}px)`);

    // Sync immediately in case width changed between render and effect.
    setIsMobile(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    let throttleId: ReturnType<typeof setTimeout> | null = null;

    const handleResizeFallback = () => {
      if (throttleId) return;
      throttleId = setTimeout(() => {
        setIsMobile(mediaQuery.matches);
        throttleId = null;
      }, 250);
    };

    mediaQuery.addEventListener("change", handleChange);
    window.addEventListener("resize", handleResizeFallback);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      window.removeEventListener("resize", handleResizeFallback);
      if (throttleId) clearTimeout(throttleId);
    };
  }, [width]);

  return isMobile;
}
