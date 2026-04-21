# CleanSense

Recursive empty-value filter with context-aware rule overrides.

Strips `null`, `undefined`, empty strings, `NaN`, empty arrays, and empty objects from any data structure — with
per-URL (or any context) exceptions declared as rules instead of inline conditionals.

---

## Quick start

```ts
import {CleanSense} from "@devua-labs/ui-utils";

const cleaner = new CleanSense({allowNull: true});

cleaner.process({name: "", age: null, tags: []});
// → { age: null }
//   name removed  — empty string, not allowed by default
//   age preserved — null allowed globally
//   tags removed  — empty array, not allowed by default
```

---

## The problem it solves

Without `CleanSense`, URL-specific filtering logic ends up scattered across interceptors as ad-hoc whitelist arrays:

```ts
// before — hard to extend, easy to break
const whiteListedAllowEmptyString = [
    "/requisites/create",
    "/requisites/:requisiteId/fields/create",
    "/requisites/:id/fields/:fieldId",
];
const isWhiteListed = whiteListedAllowEmptyString.some((pattern) => {
    const regex = new RegExp(`^${pattern.replace(/:[^/]+/g, "[^/]+")}$`);
    return regex.test(config.url ?? "");
});

config.data = filterEmptyValues(config.data, {
    allowNull: true,
    allowEmptyArray: true,
    allowEmptyString: isWhiteListed,
});
```

With `CleanSense` the same intent is expressed as a rule set defined once:

```ts
// after — declarative, co-located, no conditionals in the interceptor
const cleaner = new CleanSense({allowNull: true, allowEmptyArray: true})
    .addRule("/requisites/create", {allowEmptyString: true})
    .addRule("/requisites/:id/fields/create", {allowEmptyString: true})
    .addRule("/requisites/:id/fields/:fieldId", {allowEmptyString: true})
    .addRule("/requisites/:id/fields/:fieldId/items", {allowEmptyObject: true});

config.data = cleaner.process(config.data, {url: config.url});
```

---

## API

### `new CleanSense(config?)`

Creates a new instance. `config` sets the global defaults applied to every `process()` call.

```ts
const cleaner = new CleanSense({
    allowNull: true,  // keep null
    allowEmptyArray: true,  // keep []
});
```

All options default to `false` (the value type is removed) when omitted.

| Option             | Type      | Default | Description      |
|--------------------|-----------|---------|------------------|
| `allowEmptyString` | `boolean` | `false` | Keep `""`        |
| `allowNaN`         | `boolean` | `false` | Keep `NaN`       |
| `allowNull`        | `boolean` | `false` | Keep `null`      |
| `allowNullString`  | `boolean` | `false` | Keep `"null"`    |
| `allowUndefined`   | `boolean` | `false` | Keep `undefined` |
| `allowEmptyArray`  | `boolean` | `false` | Keep `[]`        |
| `allowEmptyObject` | `boolean` | `false` | Keep `{}`        |

---

### `.addRule(matcher, options)`

Registers a scoped override. Returns `this` for fluent chaining.

```ts
cleaner
    .addRule("/drafts/:id", {allowEmptyString: true})
    .addRule(/^\/admin\//, {allowEmptyObject: true})
    .addRule((ctx) => ctx.method === "PATCH", {allowNull: true});
```

When `process()` is called, all rules whose matcher returns `true` for the supplied context are merged over the global
defaults in **insertion order** — the last matching rule wins for any given option key.

#### Matcher types

| Type                            | Match logic                                                                |
|---------------------------------|----------------------------------------------------------------------------|
| `string`                        | Exact match against `ctx.url` after expanding `:param` segments to `[^/]+` |
| `RegExp`                        | Tested against `ctx.url ?? ""`                                             |
| `(ctx: RuleContext) => boolean` | Called with the full context object; any custom logic                      |

---

### `.process(value, ctx?)`

Recursively filters `value` and returns the cleaned result with the same type.

```ts
const result = cleaner.process(
    {title: "", body: null, tags: []},
    {url: "/drafts/99"}
);
```

- `value` — any primitive, plain object, array, or `FormData`. `FormData` is returned as-is.
- `ctx` — optional [`RuleContext`](#rulecontext). Typically `{ url: config.url }` in an Axios interceptor. Omit when no
  rules are registered or rules use function matchers that don't need a URL.

#### Option resolution order

```
global constructor options
  ← merged with each matching rule's options, left-to-right
     (last matching rule wins per option key)
```

---

### `RuleContext`

An open-ended object forwarded to every function matcher. Extend it with whatever fields your matchers need.

```ts
interface RuleContext {
    url?: string;

    [key: string]: unknown;
}
```

---

## Axios interceptor

The most common use case. Define the instance once at module level — not inside the interceptor function — so the rule
list is compiled only once.

```ts
import type {InternalAxiosRequestConfig} from "axios";
import {CleanSense} from "@devua-labs/ui-utils";

const dataCleaner = new CleanSense({allowNull: true, allowEmptyArray: true})
    .addRule("/requisites/create", {allowEmptyString: true})
    .addRule("/requisites/:id/fields/create", {allowEmptyString: true})
    .addRule("/requisites/:id/fields/:fieldId", {allowEmptyString: true})
    .addRule("/requisites/:id/fields/:fieldId/items", {allowEmptyObject: true});

const paramsCleaner = new CleanSense();

export class AxiosFilter {
    public static async interceptor(
        config: InternalAxiosRequestConfig
    ): Promise<InternalAxiosRequestConfig> {
        config.data = dataCleaner.process(config.data, {url: config.url});
        config.params = paramsCleaner.process(config.params);
        return config;
    }
}
```

Register as a request interceptor:

```ts
axios.interceptors.request.use(AxiosFilter.interceptor);
```

---

## Behavior reference

### Primitives

```ts
cleaner.process("");          // → undefined  (empty string removed)
cleaner.process(0);           // → 0          (zero is kept — not empty)
cleaner.process(false);       // → false      (boolean false is kept)
cleaner.process(NaN);         // → undefined  (NaN removed by default)
cleaner.process(null);        // → undefined  (null removed by default)
cleaner.process(undefined);   // → undefined  (undefined removed by default)
```

### Arrays

Items are filtered recursively. Empty items are removed. If the resulting array itself becomes empty and
`allowEmptyArray` is `false`, the array is also removed.

```ts
cleaner.process(["a", "", null, "b"]);
// → ["a", "b"]

new CleanSense({allowEmptyArray: true}).process([]);
// → []
```

### Objects

Keys with empty values are removed. Nested objects are processed recursively. If the resulting object ends up empty and
`allowEmptyObject` is `false`, the object is removed entirely.

```ts
cleaner.process({a: 1, b: "", c: {d: null}});
// → { a: 1 }

cleaner.process({nested: {x: ""}});
// → undefined  (nested object became empty → removed → parent became empty → removed)
```

### `FormData`

Returned unchanged — no filtering is applied.

```ts
const fd = new FormData();
cleaner.process(fd); // → fd (same reference)
```

---

## Multiple rules, same URL

Rules stack. Later rules override earlier ones for any overlapping option key.

```ts
const cleaner = new CleanSense()
    .addRule("/items/:id", {allowEmptyString: true, allowNull: true})
    .addRule("/items/:id", {allowNull: false});  // narrows the first rule

cleaner.process({name: "", owner: null}, {url: "/items/7"});
// → { name: "" }
//   name preserved  — allowEmptyString: true  (from rule 1, not overridden)
//   owner removed   — allowNull: false         (rule 2 overrides rule 1)
```

---

## Function matchers

Use a function matcher for logic that can't be expressed as a URL pattern:

```ts
const cleaner = new CleanSense()
    .addRule(
        (ctx) => ctx.method === "PATCH",
        {allowNull: true, allowEmptyString: true}
    )
    .addRule(
        (ctx) => ctx.role === "admin",
        {allowEmptyObject: true}
    );

cleaner.process(payload, {url: "/users/1", method: "PATCH", role: "admin"});
```