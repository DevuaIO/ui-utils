import { createStore, useStore } from "zustand";

interface EventState {
  payloads: Record<string, unknown>;
}

/**
 * Module-level store holding the last payload emitted for each key. It lives
 * outside React, so {@link emit} and {@link on} work anywhere; React components
 * read from it via {@link useEvent}.
 *
 * @internal
 */
const eventStore = createStore<EventState>(() => ({ payloads: {} }));

/**
 * Fires an event: stores `payload` under `key` and notifies every listener of
 * that key. Identity is stable across renders, so it is safe to drop into
 * effect dependency arrays.
 *
 * @public
 */
type EmitFn = <P = unknown>(key: string, payload: P) => void;

/**
 * Emits an event from anywhere — React or not.
 *
 * @remarks
 * Writes `payload` into the shared store under `key`, which re-renders every
 * subscribed {@link useEvent} consumer and invokes every {@link on} listener
 * for that key. Because the store is module-level, this can be called from
 * outside React entirely: WebSocket handlers, timers, service methods.
 *
 * The payload is retained as the key's last value, so a consumer that mounts
 * *after* the emit still reads it on first render (the bus behaves like a small
 * keyed store, not a fire-once event).
 *
 * @typeParam P - The payload type.
 * @param key - The event key.
 * @param payload - The value delivered to subscribers of `key`.
 *
 * @example
 * ```ts
 * socket.on("message", (msg) => emit("users", msg.users));
 * ```
 *
 * @public
 */
export const emit: EmitFn = (key, payload) => {
  eventStore.setState((state) => ({
    payloads: { ...state.payloads, [key]: payload },
  }));
};

/**
 * Subscribes to a key outside React, mirroring what {@link useEvent} does for
 * components.
 *
 * @remarks
 * The listener is invoked whenever the payload stored under `key` changes
 * (compared with `Object.is`). Use it for non-React consumers — caches, loggers,
 * other stores.
 *
 * @typeParam P - The payload type.
 * @param key - The event key to listen on.
 * @param listener - Called with the new payload on each change.
 * @returns An unsubscribe function.
 *
 * @public
 */
export function on<P = unknown>(key: string, listener: (payload: P) => void): () => void {
  let prev = eventStore.getState().payloads[key];

  return eventStore.subscribe((state) => {
    const next = state.payloads[key];

    if (!Object.is(next, prev)) {
      prev = next;
      listener(next as P);
    }
  });
}

/**
 * A tiny keyed event bus on top of zustand: subscribe to a key and re-render
 * with its latest payload, and/or get a stable {@link emit} to fire events.
 *
 * @remarks
 * Pass a `key` to subscribe — `data` holds the most recent payload for that key
 * and the component re-renders when it changes. Per-key isolation is exact:
 * since each emit preserves the references of untouched keys, a component
 * subscribed to one key does not re-render when another key changes.
 *
 * Call it without a `key` for emit-only components — `data` is `undefined` and
 * the component never subscribes.
 *
 * `data` carries the last emitted payload (see {@link emit}), so a late-mounting
 * consumer reads it immediately. For payload-less "something happened"
 * signaling, use {@link usePing} instead.
 *
 * @typeParam T - The payload type for the subscribed key.
 * @param key - The event key to subscribe to. Omit for an emit-only consumer.
 * @returns `{ data, emit }` — `data` is the latest payload for `key` (or
 *   `undefined` when no key is given), `emit` fires events.
 *
 * @example
 * ```tsx
 * // subscriber
 * const { data } = useEvent<User[]>("users");
 *
 * // emitter
 * const { emit } = useEvent();
 * emit("users", users);
 * ```
 *
 * @public
 */
export function useEvent<T = unknown>(key: string): { data: T | undefined; emit: EmitFn };
export function useEvent(): { data: undefined; emit: EmitFn };
export function useEvent<T = unknown>(key?: string) {
  const data = useStore(eventStore, (state) =>
    key !== undefined ? (state.payloads[key] as T | undefined) : undefined
  );

  return { data, emit };
}
