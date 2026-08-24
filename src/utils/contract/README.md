# contract

The contract runtime: a store keyed by contract id, plus the runner that drives one procedure through it. Framework
agnostic and not an entry point of its own - [`@Tracked`](../../decorator/Tracked) calls into it directly, and
[`useContract`](../../react/hooks/useContract) re-exports the public half of it under `@devua-lab/ui-utils/react`.

Read [`useContract`](../../react/hooks/useContract) for the API you call from a component. This file describes the
mechanics underneath it: how a run settles, what happens when runs nest, and what the store holds.

Requires `zustand`.

---

## A contract id

Every run is keyed by a string id, resolved from a `ContractKey`:

```ts
type ContractKey = string | AnyFn;

getContractId(target): string;          // "DepositsService.create"
getContractSerializer(target): ErrorSerializer | undefined;
```

A `@Tracked` function carries its id and serializer on the `CONTRACT_ID` and `CONTRACT_SERIALIZER` symbols, so passing
the method itself is enough. An untagged function throws, which turns a missing decorator into an error at the call site
instead of a contract that silently never updates. A string id carries no serializer, so `contract()` needs one in its
options.

Keys must be stable references: a string constant or a singleton method, never a closure recreated per render.

---

## The store

```ts
interface ContractState {
    loading: boolean;
    errors: Nullable<AppErrorResponse>;
}

contractStore: StoreApi<{ contracts: Record<string, ContractState> }>;
```

An id has an entry only while it is running or holding an error. A contract that has never run, or that last succeeded,
has no entry at all, and readers fall back to the shared `EMPTY_CONTRACT_STATE` constant - a stable reference, so a
reader subscribed to an untouched contract never re-renders.

Three functions move an entry through its states:

| Function                     | Effect                                                                |
|------------------------------|-----------------------------------------------------------------------|
| `startContract(id)`          | Opens a run: `loading: true`, and clears the previous error (outermost run only). |
| `successContract(id)`        | Closes a run and deletes the entry.                                   |
| `failContract({id, errors})` | Closes a run, stores the serialized error and drops `loading`.        |

---

## Nested runs

A `@Tracked` method is a contract on its own, so `contract(Service.Deposit.create, () => Service.Deposit.create(p))`
runs two of them under one id: the outer procedure and the tracked call inside it.

The store counts how many runs are open per id, and only the outermost one settles the entry. Without that count the
inner call would delete the entry (or clear `loading`) the moment it resolved, while the outer procedure still had work
to do, and the UI would report success halfway through.

A nested `startContract` therefore keeps whatever a sibling already recorded; only the outermost start opens a clean
slate.

---

## Adopting a failure

A tracked call resolves with `undefined` instead of throwing, so a procedure built from tracked calls resolves even when
a step failed. A runner that only watched for a thrown error would call `successContract` and delete the error the
tracked call had just written.

So the store stamps every failure with a monotonic sequence number, and `contract()` takes a checkpoint before running
its procedure:

```ts
const checkpoint = failureCheckpoint();
startContract(id);

const result = await run();
const failed = failureSince(checkpoint);   // did anything fail while we ran?
```

If something failed, the contract fails too and keys that already-serialized error under its own id. The error is
serialized once, so an `ErrorSerializer.subscribe` side effect - a toast, a log - fires a single time no matter how many
contracts the failure passes through.

The window is wall-clock, not the async call tree, which the browser gives no way to follow. A tracked call that fails
while an unrelated contract happens to be in flight is attributed to that contract as well. Nothing is thrown either
way, and the failing call still records its own id.

---

## Granular error clearing

`resetContract(target, granular?)` deletes an entry outright, or removes single paths from `errors.validation` while
leaving the rest of the entry intact. Paths resolve against both layouts the serializer plugins produce:

- a **flat literal key**, matched first, as `AxiosErrorPlugin` emits it (`"settings.0.input"` as one key);
- a **dot-notation path**, traversed segment by segment, as `ZodErrorPlugin` with `structure: "nested"` emits it
  (`settings` -> `[0]` -> `input`).

Only the leaf is removed. Array elements are deleted in place without reindexing, so other paths in the same call stay
valid, and a missing path is a no-op. When clearing leaves no validation errors and no global message, the whole entry
is dropped.

See [`useContract`](../../react/hooks/useContract) for the call-site examples.
