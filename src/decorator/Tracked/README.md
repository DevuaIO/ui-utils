# Tracked

Tags a function with a stable contract id (and an optional serializer) so it can be used as a key for
[`contract`](../../react/hooks/useContract) and `useContract`.

Tagging only — `@Tracked` does not wrap or change a method's behavior. It attaches an id derived from
`ClassName.methodName`, a matching ping id for [`usePing`](../../react/hooks/usePing), and, when given, the
[`ErrorSerializer`](../../utils/error-serialization) that `contract()` should serialize errors with — no global
registry.

---

## Quick start

```ts
import {Tracked, Validate} from "@devua-lab/ui-utils/react";

@Tracked({serializer})
class DepositsService {
    @Validate(SCHEMA_DEPOSITS_CREATE)
    async create(payload: DepositPayload): Promise<IDeposit> {
        const {data} = await API.post("/Deposit", payload);
        return data;
    }
}
```

```ts
// the tagged method is now a contract key — id "DepositsService.create"
contract(Service.Deposit.create, async () => {
    await Service.Deposit.create(payload);
});
```

To avoid repeating `{ serializer }` on every service, bind it once in your app:

```ts
import {Tracked as RawTracked} from "@devua-lab/ui-utils/react";

export const Tracked = (options?: string | {id?: string}) =>
    RawTracked(typeof options === "string" ? {id: options, serializer} : {...options, serializer});
```

---

## API

### `@Tracked(options?)`

Applies to a class or a method. On a class, every prototype method is tagged `ClassName.methodName`. On a method, the id
defaults to the method name or an explicit one.

```ts
@Tracked()                       class Svc { async m() {} }  // id: "Svc.m"
@Tracked("custom-id")            async doThing() {}           // method-level explicit id
@Tracked({serializer})           class Svc { ... }            // attach a serializer to every method
@Tracked({id: "x", serializer})  async doThing() {}           // method-level id + serializer
```

| Option       | Type              | Description                                                                      |
|--------------|-------------------|----------------------------------------------------------------------------------|
| `id`         | `string`          | Explicit id. Method-level only; passing it to a class throws.                    |
| `serializer` | `ErrorSerializer` | Serializer carried by the tagged function(s) for `contract()` to use.            |

A string argument is shorthand for `{ id }`.

`Tracked<T>` is the identity type (the decorator does not change signatures); keep `as Tracked<T>` annotations or drop
them.

---

## Behavior

Arrow-function class fields are not tagged — they live on the instance, not the prototype. Use the method form, or a
string key with [`contract`](../../react/hooks/useContract).

Tagging mutates the function in place, so the method keeps its identity: `Service.Deposit.create` is the same reference
you pass as a contract key. The id is read off that reference, so keys must be stable (a singleton method, not a closure
recreated per render).
