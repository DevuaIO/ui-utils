import type { Nullish } from "../types";

/**
 * Type guard returning `true` if the value is a non-blank string — i.e.
 * a string with at least one non-whitespace character. Narrows the type
 * to `string` on success.
 *
 * @example
 *   const name: string | null | undefined = getName();
 *   if (isNonBlank(name)) {
 *     submit(name.trim());
 *   }
 */
export function isNonBlank(value: Nullish<string>): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
