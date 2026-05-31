# useThrottle

Throttled state — an immediate value plus a copy that updates at most once per interval.

`setValue` updates `value` synchronously (use it for the controlled input); `throttled` follows at a capped rate — once
on the leading edge, then at most once per `delay` ms, always landing the latest value on the trailing edge.

---

## Quick start

```tsx
import {useThrottle} from "@devua-lab/ui-utils/react";

const {value, throttled, setValue} = useThrottle("", 200);

useEffect(() => {
    renderPreview(throttled);
}, [throttled]);

return <textarea value={value ?? ""} onChange={(e) => setValue(e.target.value)} />;
```

---

## API

### `useThrottle(initial?, delay?)`

```ts
function useThrottle<T = unknown>(initial?: T, delay?: number): {
    value: T | undefined;
    throttled: T | undefined;
    setValue: (next: T) => void;
};
```

- `initial` — starting value for both `value` and `throttled`.
- `delay` — minimum interval in milliseconds between `throttled` updates. Defaults to `300`.

| Field       | Description                                                  |
|-------------|--------------------------------------------------------------|
| `value`     | Immediate value — bind it to the controlled input.           |
| `throttled` | Latest `value`, updated at most once per `delay` ms.         |
| `setValue`  | Updates `value` now; `throttled` catches up on an edge.      |

The result type includes `undefined` because `initial` is optional.

---

## Behavior

- **Leading edge.** The first change after a quiet period reaches `throttled` immediately.
- **Trailing edge.** Changes within the window schedule a single trailing update with the latest value; it reschedules
  if `value` changes again first, so nothing intermediate is emitted and the final value is never dropped.
- The initial mount is skipped — `throttled` already equals `initial`.

Need to wait until updates stop instead of capping their rate? See [`useDebounce`](../useDebounce).
