import { create } from "zustand";

/**
 * Any value that can be used as a ping channel identifier.
 *
 * - Strings and numbers are used verbatim.
 * - Functions are identified by their `name` property, optionally
 *   augmented with a `Symbol.for("ping.id")` marker for stable
 *   cross-file identity (useful when functions are wrapped by
 *   decorators and the original `name` is no longer reliable).
 * - Objects that expose a `Symbol.for("ping.id")` string property
 *   use that value directly.
 */
export type PingKey = string | number | ((...args: never[]) => unknown) | { [PING_ID]: string };

/**
 * Well-known symbol consumers can attach to a function or object to
 * control the ping identity explicitly. Registered via `Symbol.for`
 * so it's stable across module boundaries and package duplicates.
 *
 * @example
 *   const myMethod = Object.assign(
 *     async () => { ... },
 *     { [PING_ID]: "requisites.list" }
 *   );
 *   emit(myMethod);    // pings "requisites.list"
 *   usePing(myMethod); // listens on "requisites.list"
 */
export const PING_ID: unique symbol = Symbol.for("ping.id") as never;

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
 * Converts a PingKey to its stable string form. Exposed so callers that
 * build their own dependency arrays can derive the exact identity used
 * internally by `usePing` and `emit`.
 */
export function pingKey(key: PingKey): string {
  return toStringKey(key);
}

/**
 * Lightweight event bus built for one narrow purpose — signaling that
 * "something happened" so downstream consumers can re-run work (refetch
 * queries, re-render, re-trigger effects). Does NOT carry payloads; treat
 * it as a ping, not a message.
 *
 * The returned `tick` is a monotonically increasing counter for the given
 * key. Include it in a React Query `queryKey`, `useEffect` deps, or any
 * other dependency list to re-run when someone calls `emit(key)`
 * elsewhere in the app.
 *
 * Calling `usePing()` without an argument returns just `{ emit }` for
 * components that only fire events and never listen.
 *
 * @example
 *   // emitter side
 *   const { emit } = usePing();
 *   emit("REQUISITES_UPDATED");
 *
 * @example
 *   // listener side — refetch a query on every ping
 *   const { tick } = usePing("REQUISITES_UPDATED");
 *   const { data } = useQuery({
 *     queryKey: ["requisites", tick],
 *     queryFn: fetchRequisites,
 *   });
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
 * Non-hook version of `emit`, usable from service methods, event
 * handlers, or anywhere outside React components.
 *
 * @example
 *   async function onCreate() {
 *     await api.create(payload);
 *     ping("REQUISITES_UPDATED");
 *   }
 */
export function ping(key: PingKey): void {
  usePingStore.getState().bump(toStringKey(key));
}
