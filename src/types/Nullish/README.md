# Nullish

A value that may be of type `T`, `null`, or `undefined`.

```ts
type Nullish<T> = Nullable<T> | undefined;
```

Built on [`Nullable<T>`](../Nullable), so it expands to `T | null | undefined`. Use it for the broadest "value might not
be here" case: optional inputs, possibly-unset fields, and parameters fed by optional chaining (`obj?.field`). When a
value can only ever be `null`, prefer [`Nullable<T>`](../Nullable).

---

## Usage

```ts
import {Nullish} from "@devua-lab/ui-utils/types";

function greet(name: Nullish<string>) {
    return name == null ? "hello" : `hello ${name}`;
}

greet("ann");
greet(null);
greet(undefined); // all ok
```

A `== null` check (loose equality) narrows away **both** `null` and `undefined` in one go — handy with `Nullish`.
