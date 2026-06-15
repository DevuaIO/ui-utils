# diff

Structural diff that returns only what changed — with arrays kept whole.

Deep-compares a baseline object against a candidate and returns just the parts of the candidate that differ. Plain
objects are recursed into; arrays, primitives, and exotic values (`Date`, `Map`, class instances, …) are treated
atomically — a changed array comes back in full, never as a sparse, index-keyed fragment.

Equality is delegated to [`dequal`](https://github.com/lukeed/dequal), so `diff` is essentially "`dequal`, but it tells
you _what_ differs instead of just _whether_ it differs".

---

## Quick start

```ts
import {diff} from "@devua-lab/ui-utils";

const a = {id: 1, name: "foo", permissions: [{value: "read"}]};
const b = {id: 1, name: "bar", permissions: [{value: "read"}, {value: "write"}]};

diff(a, b);
// → { name: "bar", permissions: [{ value: "read" }, { value: "write" }] }
//   id          dropped   — unchanged
//   name        included  — changed, candidate-side value
//   permissions included  — array differs → returned whole
```

---

## The problem it solves

The popular `deep-object-diff` recurses _into_ arrays by index, so a single changed element produces a sparse fragment
that is awkward to consume — it is neither the old array nor a usable new one:

```ts
// before — deep-object-diff
import {updatedDiff} from "deep-object-diff";

const a = {permissions: [{value: "read"}, {value: "other"}]};
const c = {permissions: [{value: "read"}, {value: "changed"}]};

updatedDiff(a, c);
// → { permissions: { 1: { value: "changed" } } }
//   index-keyed object, not an array — you can't spread or map it
```

`diff` treats arrays as atomic values: if anything inside changed, you get the entire new array back, ready to use as-is.

```ts
// after — diff
import {diff} from "@devua-lab/ui-utils";

diff(a, c);
// → { permissions: [{ value: "read" }, { value: "changed" }] }
//   the whole candidate array, no reassembly needed
```

---

## API

### `diff(a, b)`

```ts
function diff<T extends object>(a: Nullable<T>, b: Nullable<T>): Nullable<DeepPartial<T>>;
```

Compares baseline `a` against candidate `b` and returns a [`DeepPartial<T>`](../../types/DeepPartial) describing how to
turn `a` into `b`, expressed entirely in terms of `b`'s values — or `null` when there is no difference.

- `a` — the baseline (original) object. May be `null` or `undefined` ([`Nullable<T>`](../../types/Nullable)).
- `b` — the candidate (updated) object. May be `null` or `undefined` ([`Nullable<T>`](../../types/Nullable)).

If **either** operand is `null` or `undefined`, the result is `null` — see [No-op cases](#no-op-cases).

#### How each value is handled

| Value kind                                     | Equality check | Result when different           |
|------------------------------------------------|----------------|---------------------------------|
| Plain object (`{}` / `Object.create(null)`)    | `dequal`, deep | Nested diff — only changed keys |
| Array                                          | `dequal`, deep | The whole `b` array             |
| Primitive (`string`, `number`, `boolean`, …)   | `dequal`       | The `b` value                   |
| `Date`, `Map`, `Set`, `RegExp`, class instance | `dequal`, deep | The whole `b` value (atomic)    |

#### Semantics

- **Direction.** The result holds `b`-side values for both **changed** and **added** keys (present in `b`, absent
  from `a`).
- **Deletions are not reported.** Keys present in `a` but missing from `b` do not appear — iteration is driven by `b`'s
  keys. Compute removals separately if you need them.
- **No-op returns `null`**, not an empty object — when either operand is `null`/`undefined`, when `a === b`, or when
  nothing differs. A falsy result means "nothing changed".
- **Not symmetric.** `diff(a, b)` is generally not equal to `diff(b, a)`.

---

## Behavior reference

### No-op cases

Returns `null` when either operand is nullish, when both are the same reference, or when they are deeply equal.

```ts
diff(a, a);           // → null  (same reference)
diff(a, null);        // → null  (null candidate)
diff(a, undefined);   // → null  (undefined candidate)
diff(null, b);        // → null  (null baseline)
diff(undefined, b);   // → null  (undefined baseline)
diff({x: 1}, {x: 1}); // → null  (deeply equal)
```

### Changed and added keys

Unchanged keys are dropped; changed and added keys return their candidate-side value.

```ts
const a = {id: 1, name: "foo"};
const b = {id: 1, name: "bar", extra: true};

diff(a, b);
// → { name: "bar", extra: true }
//   id    dropped   — unchanged
//   name  included  — changed
//   extra included  — added (absent from a)
```

### Nested objects

Plain objects are recursed; only the changed leaf is reported.

```ts
const a = {meta: {seen: false, score: 10}};
const b = {meta: {seen: true, score: 10}};

diff(a, b);
// → { meta: { seen: true } }
//   score dropped — unchanged
```

### Arrays

Atomic: any internal change returns the entire candidate array.

```ts
const a = {tags: ["x", "y"]};
const b = {tags: ["x", "z"]};

diff(a, b);
// → { tags: ["x", "z"] }   (whole array, not a per-index fragment)
```

### Non-plain objects

`Date`, `Map`, `Set`, and class instances are compared with `dequal` and returned whole when they differ — never
recursed into.

```ts
const a = {at: new Date("2024-01-01")};
const b = {at: new Date("2024-06-01")};

diff(a, b);
// → { at: Date(2024-06-01) }
```

### Deletions

Keys removed in the candidate are not reported.

```ts
const a = {id: 1, name: "foo"};
const b = {id: 1};

diff(a, b);
// → null
//   name's removal is NOT surfaced — iteration follows b's keys
```
