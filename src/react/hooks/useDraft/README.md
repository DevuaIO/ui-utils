# useDraft

Local editable copy of a server-owned object — tracks edits, detects dirty state, and syncs with upstream changes without clobbering in-progress work.

`draft` starts as a copy of `source`. When `source` changes (deep equality via `dequal`), `draft` follows — unless the user has already made edits, in which case their work is preserved. `update` applies changes via an immer recipe or a partial merge. `isDirty` tells you whether to show a save button.

---

## Quick start

```tsx
import {useDraft} from "@devua-lab/ui-utils/react";

const {draft, update, createUpdater, isDirty, reset} = useDraft(serverData);

const onNameChange = createUpdater("name");

return (
    <>
        <input value={draft?.name ?? ""} onChange={(e) => onNameChange(e.target.value)} />
        {isDirty && <button onClick={() => onSave(draft!)}>Save</button>}
        <button onClick={() => reset()}>Discard</button>
    </>
);
```

---

## API

### `useDraft(source)`

```ts
function useDraft<T extends Record<PropertyKey, unknown>>(source: T | undefined): {
    draft:         T | undefined;
    source:        T | undefined;
    isDirty:       boolean;
    update:        (recipe: Recipe<T> | Partial<T>) => void;
    reset:         (value?: T) => void;
    createUpdater: <K extends keyof T>(key: K, defaultValue?: T[K]) => Updater<T[K]>;
};
```

- `source` — the authoritative object (e.g. from a server response). May be `undefined` while loading.

| Field           | Description                                                                        |
|-----------------|------------------------------------------------------------------------------------|
| `draft`         | Local editable copy. Mutate it; never write to `source` directly.                 |
| `source`        | The last synced upstream value. Useful for computing a diff before saving.        |
| `isDirty`       | `true` when `draft` deep-differs from `source`. Use to gate the save button.      |
| `update`        | Apply changes as an immer recipe (mutation style) or a plain partial object.       |
| `reset`         | Restore `draft` to `source`, or to an explicit value when provided.                |
| `createUpdater` | Build a typed setter for one field — pass directly to an `onChange` handler.       |

---

## `update(recipe | partial)`

Accepts two forms:

```ts
// immer recipe — full mutation access
update((state) => { state.amount = 100; state.currency = "USD"; });

// partial merge — shallow spread
update({ amount: 100 });
```

The recipe form uses `immer`'s `produce` — nested structures are safe to mutate directly. The partial form is a plain `{ ...prev, ...partial }`.

---

## `createUpdater(key, defaultValue?)`

Returns a setter `(next) => void` scoped to `key`. `next` may be a value or an updater function `(prev) => next`:

```ts
const onAmountChange = createUpdater("amount", 0);

onAmountChange(100);                  // draft.amount → 100
onAmountChange((prev) => prev + 1);   // draft.amount → 101
onAmountChange(null);                 // draft.amount → defaultValue (0)
```

`defaultValue` is used when `next` is `null` or `undefined`.

---

## Behavior: upstream sync

When `source` changes, `useDraft` reconciles without a `useEffect`:

- **No edits in progress** (`draft === lastSource`) → `draft` follows `source`.
- **Edits in progress** (`draft !== lastSource`) → `draft` is left untouched; the user's work is not clobbered.

```ts
// source arrives: { name: "Alice" }
// user edits:     { name: "Bob"   }   ← isDirty = true

// source updates: { name: "Alice", age: 30 }
// draft stays:    { name: "Bob"   }   ← edits preserved
```

Call `reset()` to abandon local edits and pull in the latest `source`.
