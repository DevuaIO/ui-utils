# Validate

Validates a method's arguments against Zod schemas, positionally, before the method body runs.

Each schema is matched to the argument at the same position; `null` or `undefined` skips that parameter. On failure it
throws the original `ZodError` — inside a [`contract`](../../react/hooks/useContract) procedure that error is caught,
serialized, and surfaced through `useContract`, so payloads are validated in one place: the service.

---

## Quick start

```ts
import {Validate} from "@devua-lab/ui-utils/react";

class DepositsService {
    @Validate(SCHEMA_DEPOSITS_CREATE)
    async create(payload: DepositPayload) {
        const {data} = await API.post("/Deposit", payload);
        return data;
    }
}
```

```ts
// invalid payload → ZodError; under contract() it lands in useContract().errors.validation
contract(Service.Deposit.create, async () => {
    await Service.Deposit.create(payload);
});
```

---

## API

### `@Validate(...schemas)`

```ts
@Validate(userSchema)              createUser(data: User) {}
@Validate(null, idSchema)          update(ctx: Ctx, id: string) {}
@Validate(userSchema, roleSchema)  assign(u: User, r: Role) {}
```

| Argument     | Type                                  | Description                                                |
|--------------|---------------------------------------|------------------------------------------------------------|
| `...schemas` | `(ZodType \| null \| undefined)[]`    | One schema per parameter, by position; `null`/`undefined` skips it. |

Validated values replace the originals passed to the method, so parsed/transformed output (defaults, coercions) reaches
the body.

---

## Behavior

The thrown error is the unmodified `ZodError`. Pair the method with [`@Tracked`](../Tracked) and run it through
[`contract`](../../react/hooks/useContract): the [`ZodErrorPlugin`](../../utils/error-serialization) turns the issues
into `errors.validation`, keyed by field, ready for the form.

Schemas beyond the number of arguments are ignored; arguments without a schema pass through untouched.
