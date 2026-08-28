import { CONTRACT_ID, CONTRACT_SERIALIZER, PING_ID } from "@/symbol";
import type { ExpectedAny } from "@/types";
import { failContract, serializedFailureFor, startContract, successContract } from "@/utils/contract/store";
// Imported from the module rather than the barrel: the barrel pulls in the Axios
// and Zod plugins, and with them their optional peer dependencies.
import { ErrorSerializer } from "@/utils/error-serialization/ErrorSerializer";

type AnyFn = (...args: ExpectedAny[]) => unknown;

/**
 * The shape a `@Tracked` class takes on. A tracked method records its failure
 * and rethrows it, so every signature survives the decorator unchanged and this
 * maps each method to itself.
 *
 * It is kept so a service registry can keep naming what it holds; the cast is
 * optional and adds nothing to the type.
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
  [K in keyof T]: T[K];
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

/**
 * Records the failure under `id` and hands the original error back to the
 * caller.
 *
 * The error is rethrown as it was thrown, not as the `AppErrorResponse` the
 * store keeps: a call site that catches one wants the error itself, and
 * `contract` reads the serialized copy off the store.
 *
 * An error the store already holds is recorded under this id as it stands. A
 * tracked method that calls another one sees the inner failure on its way out,
 * and processing it again would run every `ErrorSerializer.subscribe` side
 * effect - a toast, a log - once per level of nesting.
 *
 * @internal
 */
function settleFailure(id: string, serializer: ErrorSerializer | undefined, error: unknown): never {
  const errors = serializedFailureFor(error) ?? resolveSerializer(serializer).process(error);

  failContract({ id, errors, error });
  throw error;
}

/**
 * Wraps a function so it runs as a contract: loading on, and a failure
 * serialized and stored under `id` on its way past.
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
      settleFailure(id, serializer, error);
    }

    if (!isThenable(result)) {
      successContract(id);
      return result;
    }

    return Promise.resolve(result).then(
      (value) => {
        successContract(id);
        return value;
      },
      // The second argument rather than `.catch`: a rejection handler chained
      // after `.then` would also catch whatever that handler throws, and record
      // a success path's error under this id.
      (error) => settleFailure(id, serializer, error)
    );
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
 * flips loading on under a stable id, serializes whatever the function throws
 * into the contract store, and rethrows it.
 *
 * @remarks
 * On a class, every prototype method is tracked under `ClassName.methodName`.
 * On a method, the id defaults to the method name or an explicit one. The id
 * doubles as the `usePing` channel and as the key for `contract`, `useContract`
 * and `resetContract`: pass the method itself and the id is read off it.
 *
 * A tracked method rejects like any other, so a caller that must not continue
 * past a failure gets to stop by default; `contract` catches the rejection and
 * `useContract` reads the outcome. Wrap the call in `contract` rather than in a
 * `try/catch` - the error is already serialized and stored by the time it
 * surfaces.
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
