# Tracked

Runs a class's methods as tracked contracts: loading on, and a thrown error serialized and stored under a stable id on
its way past the wrapper. Read the outcome with [`useContract`](../../react/hooks/useContract).

The id is `ClassName.methodName`. It doubles as the [`usePing`](../../react/hooks/usePing) channel and as the key for
`contract`, `useContract` and `resetContract` - pass the method itself and the id is read off it.

---

## Quick start

```ts
import {Tracked, Validate} from "@devua-lab/ui-utils/decorator";

@Tracked({serializer})
class DepositsService {
    @Validate(SCHEMA_DEPOSITS_CREATE)
    async create(payload: DepositPayload): Promise<IDeposit> {
        const {data} = await API.post("/Deposit", payload);
        return data;
    }
}
```

```tsx
// no try/catch - `contract` catches the rejection, and the error is already
// serialized under the method's id by the time it gets there
const {loading, errors} = useContract(Service.Deposit.create);

const onSubmit = () => {
    void contract(Service.Deposit.create, async () => {
        await Service.Deposit.create(payload);
        close();   // skipped when the call above rejects
    });
};
```

`Tracked<T>` maps each method to itself, so the cast is optional and there for naming what a registry holds:

```ts
export const Service = {
    Deposit: new DepositsService() as Tracked<DepositsService>,
};
```

To avoid repeating `{ serializer }` on every service, bind it once in your app:

```ts
import {Tracked as RawTracked, type TrackedOptions} from "@devua-lab/ui-utils/decorator";

export const Tracked = (options?: string | TrackedOptions) =>
    RawTracked(typeof options === "string" ? {id: options, serializer} : {...options, serializer});
```

---

## API

### `@Tracked(options?)`

Applies to a class or a method. On a class, every prototype method is tracked under `ClassName.methodName`. On a method,
the id defaults to the method name or an explicit one.

```ts
@Tracked()                       class Svc { async m() {} }  // id: "Svc.m"
@Tracked("custom-id")            async doThing() {}           // method-level explicit id
@Tracked({serializer})           class Svc { ... }            // serialize errors with it
@Tracked({id: "x", serializer})  async doThing() {}           // method-level id + serializer
```

| Option       | Type              | Description                                                                       |
|--------------|-------------------|-----------------------------------------------------------------------------------|
| `id`         | `string`          | Explicit id. Method-level only; passing it to a class throws.                     |
| `serializer` | `ErrorSerializer` | Turns a thrown error into an `AppErrorResponse`. Without one it is stored raw.    |

A string argument is shorthand for `{ id }`.

Requires `zustand`, the store the contract state lives in.

---

## Behavior

**A tracked method rejects with the error it was given.** The wrapper serializes it under the method's id first, so it
sits in `useContract(method).errors` until the next call or a `resetContract`, and then rethrows the original error
rather than the serialized copy - a call site that catches one wants the error itself.

Rethrowing is what lets a caller stop. Wrap the call in [`contract`](../../utils/contract) and everything the procedure
was going to do next - close a panel, refetch, navigate - is skipped when the call fails, without the call site testing
anything.

**A synchronous method stays synchronous.** The wrapper only chains onto the result when the original returns a
thenable; a sync method that throws throws on the spot, with its failure already recorded.

**Without a serializer** the error is still caught, and stored as `String(error)` under an `UNHANDLED_EXCEPTION` code.
Register [`ErrorSerializer`](../../utils/error-serialization) plugins to get validation fields, status codes and global
messages instead.

**Errors serialize once.** The wrapper keeps the value it threw beside the serialized copy, so a `contract()` the
rejection reaches recognises it and reuses that copy rather than processing it again - and so does one whose procedure
swallowed the failure instead of rethrowing it. An `ErrorSerializer.subscribe` side effect - a toast, a log - therefore
fires a single time no matter how many contracts the failure passes through.

**Decorator order matters.** Decorators apply bottom-up, so one listed *below* a method-level `@Tracked` runs inside
the tracked call and its throw is caught, while one listed *above* wraps the tracked call and runs outside it.
`@Tracked` on the class wraps whatever the method decorators produced, so `@Validate`'s `ZodError` is caught either way.
A method carrying its own `@Tracked` id is left alone by the class-level decorator rather than being tracked twice.

**Arrow-function class fields are not tracked** - they live on the instance, not the prototype. Use the method form, or
a string key with [`contract`](../../react/hooks/useContract).

**Keys must be stable references.** The id is read off the function you pass, so use a singleton method, not a closure
recreated per render.
