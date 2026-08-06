# isNullish

Type guard returning `true` when a value is `null` or `undefined`.

```ts
function isNullish(value: unknown): value is null | undefined;
```

The parameter is `unknown` by design. This is a gate you put in front of a value whose type you have not established
yet - a lookup result, a prop of unknown provenance, an index into a sparse collection - so constraining it to
[`Nullish<T>`](../../types/Nullish) would reject the calls that need it most.

---

## Usage

```ts
import {isNullish} from "@devua-lab/ui-utils";

function widthOf(column: Nullish<Column>) {
    if (isNullish(column)) return 0;

    return column.width; // narrowed to Column
}
```

It narrows on both branches, so the `false` side is the non-nullish type:

```ts
const rows: Nullish<Row[]> = load();

if (!isNullish(rows)) {
    rows.forEach(render); // Row[]
}
```

---

## Why not just `== null`?

`value == null` is exactly what this does, and it is correct: loose equality against `null` is true for `null` and
`undefined` and for nothing else. The guard exists because that fact is not obvious at a glance - a reader has to recall
the coercion table to trust the line - and because linters flag loose equality by default, so every inline use invites a
suppression comment.

Do not reach for `!value`. That also swallows `0`, `""`, `NaN` and `false`, which is a different question and a common
source of bugs around numeric and boolean fields.
