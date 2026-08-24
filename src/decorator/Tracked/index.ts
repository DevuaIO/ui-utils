import { CONTRACT_ID, CONTRACT_SERIALIZER, PING_ID } from "@/symbol";
import type { ExpectedAny } from "@/types";
import { failContract, startContract, successContract } from "@/utils/contract/store";
// Imported from the module rather than the barrel: the barrel pulls in the Axios
// and Zod plugins, and with them their optional peer dependencies.
import { ErrorSerializer } from "@/utils/error-serialization/ErrorSerializer";

type AnyFn = (...args: ExpectedAny[]) => unknown;

/**
 * The shape a `@Tracked` class takes on: a failed call resolves with `undefined`
 * instead of throwing, so every tracked method widens its result.
 *
 * @example
 * ```ts
 * export const Service = {
 *   Deposit: new DepositsService() as Tracked<DepositsService>,
 * };
 * ```
 *
 * @public
 */
export type Tracked<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => Promise<infer R>
    ? (...args: A) => Promise<R | undefined>
    : T[K] extends (...args: infer A) => infer R
      ? (...args: A) => R | undefined
      : T[K];
};

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
   * Serializer the wrapper turns a thrown error into an `AppErrorResponse`
   * with. Without one the error is stored in its raw fallback shape.
   */
  serializer?: ErrorSerializer;
}

type Tagged = AnyFn & {
  [CONTRACT_ID]?: string;
  [PING_ID]?: string;
  [CONTRACT_SERIALIZER]?: ErrorSerializer;
};

/**
 * Serializer for methods tagged without one: it has no plugins, so every error
 * lands in the `UNHANDLED_EXCEPTION` fallback shape. Built on first use.
 *
 * @internal
 */
let fallbackSerializer: ErrorSerializer | undefined;

function resolveSerializer(serializer?: ErrorSerializer): ErrorSerializer {
  if (serializer) return serializer;
  fallbackSerializer ??= new ErrorSerializer();
  return fallbackSerializer;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null)?.then === "function";
}

function settleFailure(id: string, serializer: ErrorSerializer | undefined, error: unknown): undefined {
  failContract({ id, errors: resolveSerializer(serializer).process(error) });
  return undefined;
}

/**
 * Wraps a function so it runs as a contract: loading on, error caught,
 * serialized and stored under `id`, `undefined` returned in its place.
 *
 * A synchronous function stays synchronous: the wrapper only chains onto the
 * result when the original returns a thenable.
 *
 * @internal
 */
function track(fn: AnyFn, id: string, serializer?: ErrorSerializer): Tagged {
  const tracked = function (this: unknown, ...args: ExpectedAny[]): unknown {
    startContract(id);

    let result: unknown;
    try {
      result = fn.apply(this, args);
    } catch (error) {
      return settleFailure(id, serializer, error);
    }

    if (!isThenable(result)) {
      successContract(id);
      return result;
    }

    return Promise.resolve(result)
      .then((value) => {
        successContract(id);
        return value;
      })
      .catch((error) => settleFailure(id, serializer, error));
  } as Tagged;

  Object.defineProperty(tracked, "name", { value: fn.name, configurable: true });

  tracked[CONTRACT_ID] = id;
  tracked[PING_ID] = id;
  if (serializer) tracked[CONTRACT_SERIALIZER] = serializer;

  return tracked;
}

function trackClass<T extends abstract new (...args: unknown[]) => unknown>(value: T, serializer?: ErrorSerializer): T {
  const proto = value.prototype as Record<PropertyKey, unknown>;
  const className = value.name;

  for (const name of Object.getOwnPropertyNames(proto)) {
    if (name === "constructor") continue;

    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (!descriptor || typeof descriptor.value !== "function") continue;

    // A method that carries its own id was tracked by a method-level @Tracked;
    // wrapping it again would run it under two contracts.
    if ((descriptor.value as Tagged)[CONTRACT_ID]) continue;

    Object.defineProperty(proto, name, {
      ...descriptor,
      value: track(descriptor.value as AnyFn, `${className}.${String(name)}`, serializer),
    });
  }

  return value;
}

/**
 * Class or method decorator that runs a function as a tracked contract: it
 * flips loading on under a stable id, catches whatever the function throws,
 * serializes it into the contract store and resolves with `undefined`.
 *
 * @remarks
 * On a class, every prototype method is tracked under `ClassName.methodName`.
 * On a method, the id defaults to the method name or an explicit one. The id
 * doubles as the `usePing` channel and as the key for `contract`, `useContract`
 * and `resetContract`: pass the method itself and the id is read off it.
 *
 * A tracked method never rejects, so call sites need no `try/catch`; read the
 * outcome through `useContract`. A `contract()` built from tracked calls picks
 * up their failures too, and keys them under its own id.
 *
 * Errors serialize with `@Tracked({ serializer })`. Without one they are stored
 * raw, as `String(error)` under an `UNHANDLED_EXCEPTION` code.
 *
 * Arrow-function class fields live on the instance, not the prototype, and are
 * left alone; use the method form or a string key.
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
      return trackClass(value as abstract new (...args: unknown[]) => unknown, serializer);
    }

    if (context.kind === "method") {
      return track(value as AnyFn, explicitId ?? String(context.name), serializer);
    }

    throw new Error(`@Tracked can be applied only to classes or methods, got: ${(context as { kind: unknown })?.kind}`);
  }

  return decorator;
}
