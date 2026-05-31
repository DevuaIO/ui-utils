# usePing

Payload-less event bus — bump a counter so consumers re-run (refetch, re-render, re-trigger effects).

`usePing(key)` returns a monotonically increasing `tick` for that key; drop it into a React Query `queryKey`, a
`useEffect` dependency list, or any deps array to re-run when someone emits the same key elsewhere. It carries **no
payload** — it is a ping, not a message.

---

## Quick start

```ts
import {usePing} from "@devua-lab/ui-utils/react";

// emitter side
const {emit} = usePing();
emit("REQUISITES_UPDATED");

// listener side — refetch a query on every ping
const {tick} = usePing("REQUISITES_UPDATED");
const {data} = useQuery({
    queryKey: ["requisites", tick],
    queryFn: fetchRequisites,
});
```

---

## API

### `usePing(key?)`

```ts
function usePing(key?: PingKey): {tick: number; emit: (key: PingKey) => void};
```

- With a `key` — `tick` is the current counter for that channel and changes whenever it is pinged.
- Without a `key` — emit-only; `tick` is `0`.

### `ping(key)`

Non-hook emitter, usable outside React (service methods, event handlers).

```ts
import {ping} from "@devua-lab/ui-utils/react";

async function onCreate() {
    await api.create(payload);
    ping("REQUISITES_UPDATED");
}
```

### `pingKey(key)`

Resolves a `PingKey` to the exact internal string identity — handy when building your own dependency arrays.

---

## Channel keys (`PingKey`)

```ts
type PingKey = string | number | ((...args: never[]) => unknown) | {[PING_ID]: string};
```

| Key                          | Resolved identity                                  |
|------------------------------|----------------------------------------------------|
| `string`                     | used verbatim                                       |
| `number`                     | `String(key)`                                       |
| Object with `[PING_ID]`      | the `PING_ID` string value                          |
| Named function               | `fn:<name>`                                          |
| Anonymous function           | throws — assign a name or attach `PING_ID`          |

### `PING_ID`

A `Symbol.for("ping.id")` you can attach to a function or object to fix its identity explicitly — stable across module
boundaries, useful when decorators rewrite a function's `name`.

```ts
const myMethod = Object.assign(async () => { /* ... */ }, {[PING_ID]: "requisites.list"});
ping(myMethod);    // pings "requisites.list"
usePing(myMethod); // listens on "requisites.list"
```

---

## Carrying a payload

`usePing` signals only that something happened. To deliver data alongside the signal, use [`useEvent`](../useEvent).
