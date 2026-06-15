# Enums

Extract a TypeScript enum into a clean `{ key, value }[]` — without the reverse-mapping noise.

Numeric enums compile to an object with **both** directions (`{ 0: "Pending", Pending: 0 }`), so naive iteration yields
duplicate, half-bogus entries. `Enums.extract` strips the synthetic numeric keys and returns only the real
members, ready to map into options, selects, or lookup tables.

---

## Quick start

```ts
import {Enums} from "@devua-lab/ui-utils";

enum Status {
    Pending,
    Approved,
}

Enums.extract(Status);
// → [{ key: "Pending", value: 0 }, { key: "Approved", value: 1 }]
```

String enums work the same way — no reverse mapping to filter, but the API is identical:

```ts
enum Direction {
    Up = "UP",
    Down = "DOWN",
}

Enums.extract(Direction);
// → [{ key: "Up", value: "UP" }, { key: "Down", value: "DOWN" }]
```

---

## The problem it solves

A numeric enum is just an object with entries pointing both ways. Iterating it directly leaks the reverse mapping:

```ts
enum Status {
    Pending,
    Approved,
}

Object.entries(Status);
// → [["0", "Pending"], ["1", "Approved"], ["Pending", 0], ["Approved", 1]]
//   the "0"/"1" keys are TypeScript's reverse map — not real members
```

`extract` drops every key that parses as a number, leaving only the declared members:

```ts
Enums.extract(Status);
// → [{ key: "Pending", value: 0 }, { key: "Approved", value: 1 }]
//   clean, one entry per member, in declaration order
```

---

## API

### `Enums.extract(target)`

```ts
class Enums {
    static extract(target: ExpectedAny): ExtractOutput[];
}
```

Extracts an enum's members into an ordered array of `{ key, value }` pairs.

- `target` — the enum object to read. Anything that isn't an object returns `[]`.
- Returns one `ExtractOutput` per real member, in declaration order.

```ts
type ExtractOutput = {
    key: string;            // the member name, e.g. "Pending"
    value: number | string; // the member value, e.g. 0 or "PENDING"
};
```

#### Behavior

- **Reverse mapping is stripped.** Any key that parses as a number (`Number.isNaN(Number(key))` is `false`) is dropped,
  so numeric enums yield one entry per member instead of two.
- **String enums pass through untouched** — they have no reverse mapping, so every key is kept.
- **Order follows the object's key order**, which matches declaration order for standard enums.
- **Non-object input returns `[]`** — safe to call on `undefined`, `null`, primitives.

---

## Behavior reference

### Numeric enum

```ts
enum Role {
    Admin,
    Editor,
    Viewer,
}

Enums.extract(Role);
// → [
//     { key: "Admin",  value: 0 },
//     { key: "Editor", value: 1 },
//     { key: "Viewer", value: 2 },
//   ]
```

### String enum

```ts
enum Currency {
    USD = "usd",
    EUR = "eur",
}

Enums.extract(Currency);
// → [
//     { key: "USD", value: "usd" },
//     { key: "EUR", value: "eur" },
//   ]
```

### Explicit numeric values

```ts
enum HttpStatus {
    Ok = 200,
    NotFound = 404,
}

Enums.extract(HttpStatus);
// → [
//     { key: "Ok",       value: 200 },
//     { key: "NotFound", value: 404 },
//   ]
```

### Non-object input

```ts
Enums.extract(undefined); // → []
Enums.extract(null);      // → []
Enums.extract(42);        // → []
```

---

## Common use: building options

```ts
const statusOptions = Enums.extract(Status).map(({key, value}) => ({
    label: key,
    value,
}));
```
