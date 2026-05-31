/**
 * An intentional, lint-safe escape hatch for `any`.
 *
 * @remarks
 * `ExpectedAny` is a direct alias of `any`. It exists so that the rare,
 * deliberate uses of `any` — generic plumbing, third-party shims, variadic
 * callback signatures — can be expressed without sprinkling
 * `// biome-ignore` / `// eslint-disable` comments at every call site. The name
 * documents intent: the `any` here is *expected*, not an oversight.
 *
 * Reach for it only when a precise type genuinely cannot be expressed. Prefer
 * `unknown` whenever the value will be narrowed before use — `unknown` keeps
 * type-checking on, `ExpectedAny` turns it off.
 *
 * @example
 * A variadic callback whose argument types are irrelevant to the wrapper:
 * ```ts
 * type AnyFn = (...args: ExpectedAny[]) => unknown;
 * ```
 *
 * @public
 */
// biome-ignore lint/suspicious/noExplicitAny: this type intentionally aliases `any` — that is its purpose
export type ExpectedAny = any;
