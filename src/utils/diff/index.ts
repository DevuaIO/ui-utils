import { dequal } from "dequal";
import type { DeepPartial, Nullable } from "@/types";

/**
 * Narrows a value to a plain object — an object literal or one created via
 * `Object.create(null)`.
 *
 * Class instances, arrays, and exotic built-ins (`Date`, `Map`, `Set`,
 * `RegExp`, …) are intentionally **not** considered plain. {@link diff} relies
 * on this to decide what it recurses into versus what it treats as an atomic,
 * replace-whole value.
 *
 * @param v - The value to test.
 * @returns `true` if `v` is a plain object.
 *
 * @internal
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== "object" || v === null) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/**
 * Computes the deep difference between a baseline object `a` and a candidate
 * object `b`, returning only the parts of `b` that differ.
 *
 * @remarks
 * The result describes how to turn `a` into `b`, expressed entirely in terms of
 * `b`'s values:
 *
 * - **Equality** is deep, delegated to {@link https://github.com/lukeed/dequal | `dequal`}.
 *   A key is included only when `dequal(a[key], b[key])` is `false`.
 * - **Plain objects** (see {@link isPlainObject}) are recursed into, so the
 *   result contains only the nested keys that actually changed.
 * - **Arrays, primitives, and non-plain objects** (`Date`, `Map`, class
 *   instances, …) are treated atomically: when they differ, the entire `b`
 *   value is returned, never a partial or index-keyed fragment.
 * - **Direction.** The result holds `b`-side values for both *changed* and
 *   *added* keys (keys present in `b` but absent from `a`).
 * - **Deletions are not reported.** Keys present in `a` but missing from `b` do
 *   not appear in the result, since iteration is driven by `b`'s keys. If you
 *   need removals, compute them separately (e.g. a complementary pass).
 * - **No-op semantics.** Returns `null` — not an empty object — when either
 *   `a` or `b` is `null`/`undefined`, when `a` and `b` are the same reference,
 *   or when no differences are found. This lets callers treat a falsy result
 *   as "nothing changed".
 * - The function is **not symmetric**: `diff(a, b)` is generally not equal to
 *   `diff(b, a)`.
 *
 * Complexity is a single pass over `b`'s own enumerable keys at each level,
 * with equality cost delegated to `dequal`.
 *
 * @typeParam T - The shape of both operands.
 * @param a - The baseline (original) object to compare against. May be
 *   `null` or `undefined`.
 * @param b - The candidate (updated) object. May be `null` or `undefined`.
 * @returns A {@link DeepPartial} of `T` containing the changed and added keys
 *   from `b`, or `null` when there is no difference or either operand is
 *   nullish.
 *
 * @example
 * Identical or nullish input yields `null`:
 * ```ts
 * diff(a, a);         // => null
 * diff(a, null);      // => null
 * diff(null, b);      // => null
 * diff(undefined, b); // => null
 * ```
 *
 * @example
 * Changed and added keys return their `b`-side value; unchanged keys are
 * dropped, and a differing array comes back whole:
 * ```ts
 * const a = { id: 1, name: "foo", tags: ["x"] };
 * const b = { id: 1, name: "bar", tags: ["x", "y"] };
 * diff(a, b);
 * // => { name: "bar", tags: ["x", "y"] }
 * ```
 *
 * @example
 * Nested plain objects are recursed; only the changed leaf is reported:
 * ```ts
 * const a = { meta: { seen: false, score: 10 } };
 * const b = { meta: { seen: true,  score: 10 } };
 * diff(a, b);
 * // => { meta: { seen: true } }
 * ```
 *
 * @public
 */
export function diff<T extends object>(a: Nullable<T>, b: Nullable<T>): Nullable<DeepPartial<T>> {
  if (a == null || b == null || a === b) return null;

  const result: Record<string, unknown> = {};

  for (const key of Object.keys(b) as (keyof T)[]) {
    const av = a[key];
    const bv = b[key];

    if (dequal(av, bv)) continue;

    if (isPlainObject(av) && isPlainObject(bv)) {
      const nested = diff(av, bv);
      if (nested != null) result[key as string] = nested;
    } else {
      result[key as string] = bv;
    }
  }

  return Object.keys(result).length ? (result as DeepPartial<T>) : null;
}
