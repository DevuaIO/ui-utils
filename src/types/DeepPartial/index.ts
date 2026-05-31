/**
 * Recursively makes every property of `T` optional — with arrays kept whole.
 *
 * @remarks
 * Unlike a naive recursive partial, arrays (and readonly arrays / tuples) are
 * preserved **whole** rather than being deep-partialed, and primitive
 * properties keep their original type. This mirrors the atomic array handling
 * of {@link diff}, whose return value this type describes: a changed array is
 * returned in full, never as a sparse, index-keyed fragment.
 *
 * @typeParam T - The object type the diff was computed from.
 *
 * @example
 * ```ts
 * type User = { id: number; tags: string[]; meta: { seen: boolean } };
 * type D = DeepPartial<User>;
 * // {
 * //   id?: number;
 * //   tags?: string[];           // whole array, not partialed
 * //   meta?: { seen?: boolean };  // nested object is recursed
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
