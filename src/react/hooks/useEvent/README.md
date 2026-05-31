# useEvent

A tiny keyed event bus on zustand — emit payloads from anywhere, subscribe in React by key.

Subscribe with a key to re-render whenever that key's payload changes; call it without a key for a stable `emit` that
fires events. The store lives at module level, so `emit` works outside React too — WebSocket handlers, timers, services.

---

## Quick start

```ts
import {useEvent} from "@devua-lab/ui-utils/react";

// component A — subscriber
const {data} = useEvent<User[]>("users");
console.log(data); // User[] | undefined, updates when "users" is emitted

// component B — emitter
const {emit} = useEvent();
emit("users", users);
```

Emitting from outside React:

```ts
import {emit} from "@devua-lab/ui-utils/react";

socket.on("message", (msg) => emit("users", msg.users));
```

---

## API

### `useEvent(key?)`

```ts
function useEvent<T = unknown>(key: string): {data: T | undefined; emit: EmitFn};
function useEvent(): {data: undefined; emit: EmitFn};
```

- With a `key` — subscribes; `data` holds the latest payload for that key and the component re-renders on change.
- Without a `key` — emit-only; `data` is `undefined` and the component never subscribes.
- `emit` is returned in both forms and is stable across renders.

### `emit(key, payload)`

Stores `payload` under `key` and notifies all subscribers. Callable anywhere — React or not.

### `on(key, listener)`

Non-React subscription. Calls `listener` whenever the key's payload changes (compared with `Object.is`); returns an
unsubscribe function.

```ts
const off = on<User[]>("users", (users) => cache.set(users));
off(); // stop listening
```

---

## Behavior

- **Per-key isolation.** Each emit preserves the references of untouched keys, so a component subscribed to one key does
  not re-render when another changes.
- **Last value retained.** `data` carries the most recent payload for its key, so a component that mounts *after* an
  emit still reads it on first render — the bus behaves like a small keyed store, not a fire-once event.
- **Stable `emit`.** Its identity never changes; safe to place in effect dependency arrays.

---

## Payload-less signaling

If you only need to signal that *something happened* (refetch, re-render) without carrying data, use
[`usePing`](../usePing).
