/**
 * Any of the JavaScript primitive types: everything that is not an object and
 * has no methods of its own.
 *
 * @remarks
 * Expands to `bigint | boolean | number | string | symbol | null | undefined`,
 * which is the full set the language defines. Reach for it when a value is
 * "anything scalar" - a key, an identifier, a cell value - and the alternative
 * would be {@link ExpectedAny}.
 *
 * It is also the natural argument to `Exclude` when you want the object-shaped
 * members of a union and nothing else.
 *
 * @example
 * ```ts
 * type CellValue = Primitive;
 *
 * type Various = string | number | { id: string } | Date;
 * type OnlyObjects = Exclude<Various, Primitive>; // { id: string } | Date
 * ```
 *
 * @public
 */
export type Primitive = bigint | boolean | number | string | symbol | null | undefined;
