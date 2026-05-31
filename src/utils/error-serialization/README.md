# error-serialization

Standardized error serialization — turn any error (Zod, Axios, native `Error`, raw values) into one predictable shape.

A small pipeline of plugins matches an error by type and serializes it into an `AppErrorResponse` with a consistent
`global` message, `code`, `status`, and `validation` map. Pick the right handler automatically by priority; subscribe
for global side effects (logging, toasts).

> Peer dependencies: `axios` and `zod`.

---

## Quick start

```ts
import {ErrorSerializer, AxiosErrorPlugin, ZodErrorPlugin} from "@devua-lab/ui-utils";

const serializer = new ErrorSerializer()
    .register(new AxiosErrorPlugin())
    .register(new ZodErrorPlugin({structure: "nested"}));

try {
    await api.post("/login", data);
} catch (err) {
    const result = serializer.process(err);
    result.global; // "Invalid credentials"
    result.status; // 401
}
```

---

## Use with tracking

The library ships **no default instance** — which plugins and subscriptions to use differs per app, so the consuming
app builds and owns the serializer, then hands it to `@Tracked`. No global registry.

```ts
import {
    ErrorSerializer,
    StandardErrorPlugin,
    AxiosErrorPlugin,
    ZodErrorPlugin,
} from "@devua-lab/ui-utils";

export const serializer = new ErrorSerializer()
    .register(new StandardErrorPlugin())
    .register(new AxiosErrorPlugin())
    .register(new ZodErrorPlugin({structure: "flat", messageFormat: "string"}))
    .subscribe((ctx) => {
        if (ctx.status && ctx.status >= 500) reportToSentry(ctx.error);
    });
```

```ts
import {Tracked} from "@devua-lab/ui-utils/react";

@Tracked({serializer})
class DepositsService { ... }
```

`contract()` then serializes errors with the instance carried by the `@Tracked` target. For string-key contracts (which
carry no function), pass it explicitly: `contract(KEY, run, {serializer})`. To avoid repeating `{ serializer }` on every
service, bind it once in your app: `const Tracked = (o) => RawTracked({ ...o, serializer })`.

---

## API

### `new ErrorSerializer()`

| Method               | Description                                                                  |
|----------------------|------------------------------------------------------------------------------|
| `register(plugin)`   | Adds a plugin and re-sorts the pipeline by priority. Chainable.              |
| `subscribe(cb)`      | Adds a callback fired for every processed error. Chainable.                 |
| `process(error)`     | Serializes via the first matching plugin (or a fallback). Returns the shape. |

### `AppErrorResponse`

```ts
{
    metadata: {plugin: string; priority: number};
    error: unknown;                       // the ORIGINAL error
    global?: string;                      // main human-readable message
    code?: string[];                      // error codes, e.g. ["102", "CONFLICT"]
    status?: number;                      // 422, 500, 0, …
    validation?: Record<string, unknown>; // field-level errors
}
```

The `validation` map uses [`ExpectedAny`](../../types/ExpectedAny) values, since field shapes vary per backend.

### Plugins & priority

| Plugin                  | Priority | Matches                                     |
|-------------------------|----------|---------------------------------------------|
| `ZodErrorPlugin`        | 2        | `instanceof ZodError`                       |
| `AxiosErrorPlugin`      | 1        | `axios.isAxiosError(error)`                 |
| `StandardErrorPlugin`   | 0        | `instanceof Error`                          |
| `ErrorSerializer`       | -1       | Fallback for strings, numbers, `null`       |

`ZodErrorPlugin` takes `{ structure: "flat" | "nested"; messageFormat: "array" | "string"; keySeparator?; mapIssue? }`.
`AxiosErrorPlugin` flattens nested backend validation into dot-notation keys and unwraps single-element arrays.
