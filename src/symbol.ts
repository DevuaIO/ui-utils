/**
 * Well-known symbol consumers can attach to a function or object to control the
 * ping identity explicitly. Registered via `Symbol.for` so it is stable across
 * module boundaries and package duplicates.
 *
 * @example
 * ```ts
 * const myMethod = Object.assign(
 *   async () => { ... },
 *   { [PING_ID]: "requisites.list" }
 * );
 * ping(myMethod);     // pings "requisites.list"
 * usePing(myMethod);  // listens on "requisites.list"
 * ```
 *
 * @public
 */
export const PING_ID: unique symbol = Symbol.for("ping.id") as never;

/**
 * Marker symbol carrying the contract id attached by `@Tracked`.
 *
 * @public
 */
export const CONTRACT_ID = Symbol.for("contract.id");

/**
 * Marker symbol carrying the {@link ErrorSerializer} attached by
 * `@Tracked({ serializer })`, so `contract()` can serialize errors without a
 * global registry.
 *
 * @public
 */
export const CONTRACT_SERIALIZER = Symbol.for("contract.serializer");
