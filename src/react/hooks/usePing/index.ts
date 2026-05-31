import { create } from "zustand";
import { PING_ID } from "@/symbol";

/**
 * Any value that can be used as a ping channel identifier.
 *
 * @remarks
 * - Strings and numbers are used verbatim.
 * - Functions are identified by their `name` (`fn:<name>`), optionally
 *   overridden by a {@link PING_ID} marker for stable cross-file identity —
 *   useful when functions are wrapped by decorators and the original `name` is
 *   no longer reliable.
 * - Objects exposing a {@link PING_ID} string property use that value directly.
 *
 * Resolve a key to its canonical string form with {@link pingKey}.
 *
 * @public
 */
export type PingKey = string | number | ((...args: never[]) => unknown) | { [PING_ID]: string };

interface PingStore {
  counters: Record<string, number>;
  bump: (key: string) => void;
}

const usePingStore = create<PingStore>((set) => ({
  counters: {},
  bump: (key) =>
    set((state) => ({
      counters: {
        ...state.counters,
        [key]: (state.counters[key] ?? 0) + 1,
      },
    })),
}));

function toStringKey(key: PingKey): string {
  if (typeof key === "string") return key;
  if (typeof key === "number") return String(key);

  const tagged = (key as { [PING_ID]?: unknown })[PING_ID];
  if (typeof tagged === "string") return tagged;

  if (typeof key === "function") {
    if (key.name) return `fn:${key.name}`;
    throw new Error("[usePing] anonymous function used as key — assign a name or attach a PING_ID symbol.");
  }

  throw new Error(`[usePing] unsupported key type: ${typeof key}`);
}

/**
 * Converts a {@link PingKey} to its stable string form.
 *
 * @remarks
 * Exposed so callers building their own dependency arrays can derive the exact
 * identity {@link usePing} and {@link ping} use internally.
 *
 * @param key - The key to resolve.
 * @returns The canonical string identity for `key`.
 *
 * @public
 */
export function pingKey(key: PingKey): string {
  return toStringKey(key);
}

/**
 * Lightweight event bus for one narrow purpose: signaling that "something
 * happened" so downstream consumers can re-run work — refetch queries,
 * re-render, re-trigger effects.
 *
 * @remarks
 * This bus carries **no payload** — it is a ping, not a message. The returned
 * `tick` is a monotonically increasing counter for `key`; include it in a React
 * Query `queryKey`, a `useEffect` dependency list, or any other deps array to
 * re-run when someone calls `emit(key)` (or {@link ping}) elsewhere.
 *
 * Called without an argument, it returns just `{ emit }` for components that
 * only fire pings and never listen. To pass data along with the signal, use
 * {@link useEvent} instead.
 *
 * @param key - The channel to observe. Omit for an emit-only consumer.
 * @returns `{ tick, emit }` — `tick` is the current counter for `key` (`0` when
 *   no key is given), `emit` bumps a channel's counter.
 *
 * @example
 * Emitter side:
 * ```ts
 * const { emit } = usePing();
 * emit("REQUISITES_UPDATED");
 * ```
 *
 * @example
 * Listener side — refetch a query on every ping:
 * ```ts
 * const { tick } = usePing("REQUISITES_UPDATED");
 * const { data } = useQuery({
 *   queryKey: ["requisites", tick],
 *   queryFn: fetchRequisites,
 * });
 * ```
 *
 * @public
 */
export function usePing(key?: PingKey): { tick: number; emit: (key: PingKey) => void } {
  const bump = usePingStore((s) => s.bump);
  const tick = usePingStore((s) => (key === undefined ? 0 : (s.counters[toStringKey(key)] ?? 0)));

  return {
    tick,
    emit: (target: PingKey) => bump(toStringKey(target)),
  };
}

/**
 * Non-hook version of {@link usePing}'s `emit`, usable from service methods,
 * event handlers, or anywhere outside React components.
 *
 * @param key - The channel to ping.
 *
 * @example
 * ```ts
 * async function onCreate() {
 *   await api.create(payload);
 *   ping("REQUISITES_UPDATED");
 * }
 * ```
 *
 * @public
 */
export function ping(key: PingKey): void {
  usePingStore.getState().bump(toStringKey(key));
}
