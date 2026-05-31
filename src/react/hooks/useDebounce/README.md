# useDebounce

Debounced state — an immediate value plus a copy that lags behind it until updates pause.

`setValue` updates `value` synchronously (use it for the controlled input); `debounced` only catches up once `delay` ms
pass with no further update. Drive expensive work — search requests, validation, persistence — off `debounced`.

---

## Quick start

```tsx
import {useDebounce} from "@devua-lab/ui-utils/react";

const {value, debounced, setValue} = useDebounce("", 500);

useEffect(() => {
    if (debounced) fetchResults(debounced);
}, [debounced]);

return <input value={value ?? ""} onChange={(e) => setValue(e.target.value)} />;
```

---

## API

### `useDebounce(initial?, delay?)`

```ts
function useDebounce<T = unknown>(initial?: T, delay?: number): {
    value: T | undefined;
    debounced: T | undefined;
    setValue: (next: T) => void;
};
```

- `initial` — starting value for both `value` and `debounced`.
- `delay` — quiet period in milliseconds before `debounced` catches up. Defaults to `300`.

| Field       | Description                                                       |
|-------------|-------------------------------------------------------------------|
| `value`     | Immediate value — bind it to the controlled input.                |
| `debounced` | Latest `value`, applied only after `delay` ms of no updates.      |
| `setValue`  | Updates `value` now and restarts the timer.                       |

The result type includes `undefined` because `initial` is optional.

---

## Behavior

```ts
const {value, debounced, setValue} = useDebounce("", 300);

setValue("a");   // value → "a"  immediately
setValue("ab");  // value → "ab" immediately, timer restarts
// ...300ms of no calls...
// debounced → "ab"   (intermediate "a" never reached debounced)
```

Each `setValue` clears the pending timer, so only the value that "wins" the quiet period reaches `debounced`.

Need to cap the update rate of a continuously changing value instead of waiting for it to settle? See
[`useThrottle`](../useThrottle).
