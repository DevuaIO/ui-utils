/**
 * A value that may be of type `T` or `null`.
 *
 * @remarks
 * Expands to `T | null`. Use it for values that are explicitly absent (cleared,
 * not-yet-loaded, "no match") as opposed to merely undeclared. For values that
 * can also be `undefined`, use {@link Nullish}.
 *
 * @typeParam T - The non-null value type.
 *
 * @example
 * ```ts
 * let selectedId: Nullable<string> = null;
 * selectedId = "abc"; // ok
 * ```
 *
 * @public
 */
export type Nullable<T> = T | null;
