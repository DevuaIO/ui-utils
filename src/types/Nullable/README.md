# Nullable

A value that may be of type `T` or `null`.

```ts
type Nullable<T> = T | null;
```

Use it for values that are **explicitly absent** — cleared, not-yet-loaded, "no match" — as opposed to merely
undeclared. For values that can also be `undefined`, use [`Nullish<T>`](../Nullish).

---

## Usage

```ts
import {Nullable} from "@devua-lab/ui-utils/types";

let selectedId: Nullable<string> = null;
selectedId = "abc"; // ok
```

A common output pattern is to signal "nothing" with exactly `null` (never `undefined`), as
[`diff`](../../utils/diff) does.
