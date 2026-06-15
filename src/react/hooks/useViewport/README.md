# useViewport

Reactive mobile breakpoint — returns `true` when the viewport is at or below a given width.

Subscribes to `matchMedia("change")` for precise, zero-overhead breakpoint detection, with a throttled `resize`
listener as a safety fallback for browsers that may miss the exact crossing event. SSR-safe: returns `false`
server-side where `window` is unavailable.

---

## Quick start

```tsx
import {useViewport} from "@devua-lab/ui-utils/react";

function Layout() {
    const isMobile = useViewport();      // true when ≤ 768px (default)
    const isTablet = useViewport(1024);  // true when ≤ 1024px

    return isMobile ? <MobileNav /> : <DesktopNav />;
}
```

---

## API

### `useViewport(width?)`

```ts
function useViewport(width?: number): boolean
```

- `width` — the breakpoint in pixels (inclusive upper bound). Defaults to `768`.
- Returns `true` when `window.innerWidth ≤ width`, `false` otherwise.
- On the server (`typeof window === "undefined"`) always returns `false`.

---

## Behavior

### Breakpoint detection

The hook evaluates `window.matchMedia(`(max-width: ${width}px)`)`. State is initialized synchronously on mount from the
current match, so there is no flicker on first render — the correct value is available immediately.

### Event strategy

Two listeners run in parallel:

| Listener                    | Purpose                                                                    |
|-----------------------------|----------------------------------------------------------------------------|
| `matchMedia` → `"change"`   | Primary. Fires exactly when the breakpoint is crossed. Zero polling cost.  |
| `window` → `"resize"` (250ms throttle) | Fallback. Corrects state if a `"change"` event is missed under heavy load. |

Both are removed on unmount. If a throttle timer is pending at unmount, it is cancelled.

### `width` changes

Changing the `width` argument tears down the existing listeners, builds a new `MediaQueryList` for the new breakpoint,
and re-subscribes. The initial value for the new breakpoint is evaluated immediately, so state is always consistent with
the current argument.

### SSR

`window` is never accessed during server-side rendering. The initial value (`false`) is also used for hydration, so the
component renders consistently between server and client on first paint.

---

## Behavior reference

```ts
// default breakpoint — 768px
useViewport();       // false when viewport is 1280px
useViewport();       // true  when viewport is 375px

// custom breakpoint
useViewport(1024);   // true  when viewport is 768px
useViewport(480);    // false when viewport is 768px

// server-side
useViewport();       // false — window is unavailable
```

---

## Common use: hiding elements by breakpoint

```tsx
function Page() {
    const isMobile = useViewport();

    return (
        <aside style={{display: isMobile ? "none" : "block"}}>
            <Sidebar />
        </aside>
    );
}
```

Multiple breakpoints in one component:

```tsx
function AdaptiveGrid() {
    const isMobile  = useViewport(767);
    const isTablet  = useViewport(1023);
    const isDesktop = !isTablet;

    const columns = isMobile ? 1 : isTablet ? 2 : 3;
    return <Grid columns={columns} />;
}
```
