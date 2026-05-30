// biome-ignore lint/suspicious/noExplicitAny: this type is allow any type, because is the expected behavior
export type ExpectedAny = any;

/**
 * Represents a value that may be of type `T`, or `null`.
 */
export type Nullable<T> = T | null;

/**
 * Represents a value that may be of type `T`, or `null`, or `undefined`.
 */
export type Nullish<T> = Nullable<T> | undefined;

/**
 * Recursively makes every property of `T` optional, mirroring the shape that
 * {@link diff} produces.
 *
 * Unlike a naive recursive partial, arrays (and readonly arrays / tuples) are
 * preserved **whole** rather than being deep-partialed. This matches
 * {@link diff}'s atomic array handling: a changed array is returned in full,
 * never as a sparse, index-keyed fragment. Primitive properties keep their
 * original type.
 *
 * @typeParam T - The object type the diff was computed from.
 *
 * @example
 * ```ts
 * type User = { id: number; tags: string[]; meta: { seen: boolean } };
 * type D = DeepPartial<User>;
 * // {
 * //   id?: number;
 * //   tags?: string[];              // whole array, not partialed
 * //   meta?: { seen?: boolean };    // nested object is recursed
 * // }
 * ```
 *
 * @public
 */
export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
