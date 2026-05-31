import { CONTRACT_ID, CONTRACT_SERIALIZER, PING_ID } from "@/symbol";
import type { ExpectedAny } from "@/types";
import type { ErrorSerializer } from "@/utils/error-serialization";

type AnyFn = (...args: ExpectedAny[]) => unknown;

/**
 * Retained as a marker for `as Tracked<T>` annotations. `@Tracked` only tags ids
 * (and an optional serializer) — it does not wrap execution — so this is the
 * identity type and may be dropped.
 *
 * @public
 */
export type Tracked<T> = T;

/**
 * Options for {@link Tracked}.
 *
 * @public
 */
export interface TrackedOptions {
  /**
   * Explicit id. Method-level only; on a class, ids are auto-generated as
   * `ClassName.methodName`.
   */
  id?: string;

  /**
   * Serializer attached to the tagged function(s), so `contract()` can serialize
   * errors with it — no global registry needed.
   */
  serializer?: ErrorSerializer;
}

type Tagged = AnyFn & {
  [CONTRACT_ID]?: string;
  [PING_ID]?: string;
  [CONTRACT_SERIALIZER]?: ErrorSerializer;
};

function tag(fn: AnyFn, id: string, serializer?: ErrorSerializer): void {
  (fn as Tagged)[CONTRACT_ID] = id;
  (fn as Tagged)[PING_ID] = id;
  if (serializer) (fn as Tagged)[CONTRACT_SERIALIZER] = serializer;
}

function tagClass<T extends abstract new (...args: unknown[]) => unknown>(value: T, serializer?: ErrorSerializer): T {
  const proto = value.prototype as Record<PropertyKey, unknown>;
  const className = value.name;

  for (const name of Object.getOwnPropertyNames(proto)) {
    if (name === "constructor") continue;
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (!descriptor || typeof descriptor.value !== "function") continue;
    tag(descriptor.value as AnyFn, `${className}.${String(name)}`, serializer);
  }

  return value;
}

/**
 * Class or method decorator that tags a function with a stable contract id (and
 * an optional serializer), so it can be used as a key for `contract` and
 * `useContract`.
 *
 * @remarks
 * Tagging only — it does not wrap or change behavior. On a class, every
 * prototype method is tagged `ClassName.methodName`. On a method, the id
 * defaults to the method name or an explicit one. A serializer passed here
 * travels with the function so `contract(target, ...)` serializes errors with it
 * — no global registry. Arrow-function class fields live on the instance, not
 * the prototype, and are not tagged; use the method form or a string key.
 *
 * @param options - A string id (method-level) or {@link TrackedOptions}.
 *
 * @example
 * ```ts
 * @Tracked({ serializer })
 * class DepositsService {
 *   @Validate(SCHEMA_DEPOSITS_CREATE)
 *   async create(payload: DepositPayload) { ... } // key: "DepositsService.create"
 * }
 * ```
 *
 * @public
 */
export function Tracked(options?: string | TrackedOptions) {
  const opts: TrackedOptions = typeof options === "string" ? { id: options } : (options ?? {});
  const explicitId = opts.id;
  const serializer = opts.serializer;

  function decorator<T extends abstract new (...args: unknown[]) => unknown>(
    value: T,
    context: ClassDecoratorContext<T>
  ): T;
  function decorator<T extends AnyFn>(value: T, context: ClassMethodDecoratorContext): T;
  function decorator(
    value: AnyFn | (abstract new (...args: unknown[]) => unknown),
    context: ClassDecoratorContext | ClassMethodDecoratorContext
  ) {
    if (context.kind === "class") {
      if (explicitId !== undefined) {
        throw new Error(
          "@Tracked(id) cannot be used on a class — method ids are auto-generated as ClassName.methodName."
        );
      }
      return tagClass(value as abstract new (...args: unknown[]) => unknown, serializer);
    }

    if (context.kind === "method") {
      const id = explicitId ?? String(context.name);
      tag(value as AnyFn, id, serializer);
      return value;
    }

    throw new Error(`@Tracked can be applied only to classes or methods, got: ${(context as { kind: unknown })?.kind}`);
  }

  return decorator;
}
