# ExpectedAny

An intentional, lint-safe escape hatch for `any`.

```ts
type ExpectedAny = any;
```

`ExpectedAny` is a direct alias of `any`. It exists so the rare, deliberate uses of `any` can be written without a
`// biome-ignore` (or `// eslint-disable`) comment at every site — the alias carries the suppression once, at its
definition, and the name documents intent: the `any` here is _expected_, not an oversight.

---

## When to use it

Reach for `ExpectedAny` only when a precise type genuinely cannot be expressed:

- Generic plumbing where the concrete type is irrelevant to the wrapper.
- Variadic callback signatures (`(...args: ExpectedAny[]) => unknown`).
- Thin shims over untyped third-party code.

```ts
import {ExpectedAny} from "@devua-lab/ui-utils/types";

type AnyFn = (...args: ExpectedAny[]) => unknown;
```

---

## When **not** to use it

Prefer [`unknown`](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown) whenever the value will be
narrowed before use. `unknown` keeps type-checking on and forces a guard; `ExpectedAny` turns checking off entirely.

If the value is "might be absent" rather than "could be anything", use a nullability type instead of `any`:
[`Nullable<T>`](../Nullable) or [`Nullish<T>`](../Nullish).
