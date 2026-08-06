/**
 * Type guard returning `true` when the value is `null` or `undefined`, and
 * narrowing it away on the `false` branch.
 *
 * @remarks
 * The parameter is `unknown` on purpose. This is a gate you put in front of a
 * value whose type you have not established yet - a lookup result, a prop of
 * unknown provenance, an index into a sparse collection - so constraining it to
 * {@link Nullish} would defeat the point and reject the calls that need it most.
 *
 * `value == null` is the whole implementation: loose equality against `null` is
 * true for exactly `null` and `undefined` and nothing else. Prefer this guard
 * over writing that comparison inline, because a reader has to remember the
 * coercion table to trust `== null`, and linters routinely flag it.
 *
 * @param value - The value to test.
 * @returns `true` if the value is `null` or `undefined`.
 *
 * @example
 * ```ts
 * function widthOf(column: Nullish<Column>) {
 *   if (isNullish(column)) return 0;
 *   return column.width; // narrowed to Column
 * }
 * ```
 *
 * @public
 */
export function isNullish(value: unknown): value is null | undefined {
  return value == null;
}
