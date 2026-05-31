# DeepPartial

Recursively makes every property of `T` optional — with arrays kept whole.

```ts
type DeepPartial<T> = T extends readonly unknown[]
    ? T
    : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;
```

Unlike a naive recursive partial, **arrays** (and readonly arrays / tuples) are preserved whole rather than being
deep-partialed, and primitive properties keep their original type. This mirrors the atomic array handling of
[`diff`](../../utils/diff), whose return value this type describes — a changed array comes back in full, never as a
sparse, index-keyed fragment.

---

## Behavior

```ts
import {DeepPartial} from "@devua-lab/ui-utils/types";

type User = {id: number; tags: string[]; meta: {seen: boolean}};

type D = DeepPartial<User>;
// {
//   id?: number;
//   tags?: string[];           // whole array, not partialed
//   meta?: { seen?: boolean };  // nested object is recursed
// }
```

| Property kind                        | In `DeepPartial<T>`                  |
|--------------------------------------|--------------------------------------|
| Primitive (`string`, `number`, …)    | Optional, same type                  |
| Array / readonly array / tuple       | Optional, **whole** (not partialed)  |
| Plain object                         | Optional, recursed into              |
