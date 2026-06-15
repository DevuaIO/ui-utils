# useContract

Run a procedure — one request or many — as a single tracked unit, and read its loading/error state anywhere.

`contract(key, run, options?)` flips loading on, runs the procedure, and on failure serializes the thrown error (through
the registered serializer — see [`error-serialization`](../../../utils/error-serialization)) and stores it under `key`.
`useContract(key)` reads that state. No pre-validation, no `try/catch` at the call site.

> The serializer travels with `@Tracked({ serializer })`; for string-key contracts pass `{ serializer }` to `contract`.

---

## Quick start

A single call, keyed by the service method itself:

```ts
const {loading, errors} = useContract(Service.Deposit.create);

const onSubmit = () => {
    contract(Service.Deposit.create, async () => {
        await Service.Deposit.create(payload);
    }, {
        onSuccess: () => console.log("success"),
        onError: (error) => console.error(error),
        onFinally: () => console.log("done"),
    });
};
```

Many calls under one string key — the whole block is tracked as one contract:

```ts
const CONTRACT_CREATE_TEMPLATE = "CONTRACT_CREATE_TEMPLATE";

const {loading, errors} = useContract(CONTRACT_CREATE_TEMPLATE);

const onSubmit = () => {
    contract(CONTRACT_CREATE_TEMPLATE, async () => {
        await Service.Deposit.create(payload);
        await Service.Manager.update(payload2);
        await Service.Cashier.update(payload3);
    }, {serializer});
};
```

If any call throws — a `ZodError` from `@Validate` on a bad payload, or an Axios failure — the block stops, the error is
serialized and stored, `onError` fires with the `AppErrorResponse`, and the component re-renders via `useContract`.
`errors.validation.<field>` gives field messages; `errors.global` the global one.

---

## API

### `contract(target, run, options?)`

```ts
function contract<R>(
    target: ContractKey,
    run: () => Promise<R> | R,
    options?: ContractOptions<R>,
): Promise<R | undefined>;
```

- `target` — a `@Tracked` function or a string id (the same key `useContract` takes).
- `run` — the procedure; may issue any number of requests.
- Returns the result, or `undefined` if it failed (the error is in `useContract` / `onError`).

| Option       | Type                                | Description                                  |
|--------------|-------------------------------------|----------------------------------------------|
| `onSuccess`  | `(result: R) => void`               | After the procedure resolves.                |
| `onError`    | `(error: AppErrorResponse) => void` | If the procedure throws (serialized error).  |
| `onFinally`  | `() => void`                        | Always, after success or failure.            |
| `serializer` | `ErrorSerializer`                   | Serializer to use; defaults to the `@Tracked` target's. Required for string keys. |

### `useContract(target)`

```ts
function useContract(target: ContractKey): ContractState;
```

Returns `{ loading, errors }`; `errors` is the full `AppErrorResponse` or `null`. Passing an untagged function throws —
apply `@Tracked` or pass a string id. Keys must be stable references (a string constant or a singleton method).

### `resetContract(target, granular?)`

```ts
function resetContract(target: ContractKey, granular?: string[]): void;
```

Clears a contract's error state, keyed the same way as `contract`.

- `target` — a `@Tracked` function or a string id.
- `granular` — optional list of `errors.validation` paths to clear instead of the whole entry.

**Without `granular`** the entire contract is removed and `useContract` falls back to `EMPTY_CONTRACT_STATE`.

**With `granular`** only the listed paths are deleted from `errors.validation`; any other field errors and the global
message stay intact. If clearing those paths leaves no validation errors and there is no `global` message, the whole
entry is dropped automatically.

#### Path syntax

Each `granular` entry is a dot-notation path into `errors.validation`:

| Path                                | Targets                                                   |
|-------------------------------------|-----------------------------------------------------------|
| `"amount"`                          | A top-level field.                                        |
| `"settings.0.input"`                | A nested value — `settings → [0] → input`.                |
| `"method_data.2.commission_rate"`   | An array element's field (numeric segments index arrays). |

Resolution tries the **literal flat key first** (matching `AxiosErrorPlugin`'s dot-notation output, e.g. a real key
`"settings.0.input"`), then falls back to **segment traversal** for nested structures (e.g. `ZodErrorPlugin` with
`structure: "nested"`). Only the leaf is removed — array elements are deleted in place without reindexing, so other
paths in the same call stay valid. Missing paths are a no-op.

```ts
// clear everything
resetContract(Service.Deposit.create);

// clear a single top-level field as the user edits it
resetContract(Service.Deposit.create, ["amount"]);

// clear nested and array-indexed paths together
resetContract(Service.Merchant.addMethods, [
    "method_data.0.settings.commission_rate",
    "amount",
    "settings.2.input",
]);
```

#### Clearing a field error on edit

```ts
const {loading, errors} = useContract(Service.Deposit.create);

const onAmountChange = (value: string) => {
    setAmount(value);
    resetContract(Service.Deposit.create, ["amount"]);
};

<Input
    value={amount}
    onChange={onAmountChange}
    slots={{errorText: errors?.validation?.amount}}
    invalid={!!errors?.validation?.amount}
/>;
```
