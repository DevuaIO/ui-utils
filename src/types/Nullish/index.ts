import type { Nullable } from "../Nullable";

/**
 * A value that may be of type `T`, `null`, or `undefined`.
 *
 * @remarks
 * Built on top of {@link Nullable} — it expands to `Nullable<T> | undefined`,
 * i.e. `T | null | undefined`. Use it for the broadest "value might not be
 * here" case: optional inputs, possibly unset fields, and parameters fed by
 * optional chaining (`obj?.field`). When a value can only ever be `null` (never
 * `undefined`), prefer the narrower {@link Nullable}.
 *
 * @typeParam T - The non-nullish value type.
 *
 * @example
 * ```ts
 * function greet(name: Nullish<string>) {
 *   return name == null ? "hello" : `hello ${name}`;
 * }
 * greet("ann"); greet(null); greet(undefined); // all ok
 * ```
 *
 * @public
 */
export type Nullish<T> = Nullable<T> | undefined;
