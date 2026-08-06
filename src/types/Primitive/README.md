# Primitive

Any of the JavaScript primitive types.

```ts
type Primitive = bigint | boolean | number | string | symbol | null | undefined;
```

The full set the language defines: everything that is not an object and carries no methods of its own. Reach for it when
a value is "anything scalar" - a key, an identifier, a cell value - and the alternative would be
[`ExpectedAny`](../ExpectedAny).

---

## Usage

```ts
import {Primitive} from "@devua-lab/ui-utils/types";

type CellValue = Primitive;

function render(value: CellValue) {
    return value == null ? "-" : String(value);
}
```

It is also the natural argument to `Exclude` when you want the object-shaped members of a union and nothing else:

```ts
type Various = string | number | { id: string } | Date;
type OnlyObjects = Exclude<Various, Primitive>; // { id: string } | Date
```

---

## Note on `null` and `undefined`

Both are included, because both are primitives in the specification. If you mean "a scalar that is definitely present",
write `Exclude<Primitive, null | undefined>`; if you mean "a scalar that may be missing", `Primitive` already covers it
and [`Nullish<T>`](../Nullish) would be redundant on top.
