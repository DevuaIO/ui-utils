import type { AppErrorResponse, ErrorSerializer } from "@/utils/error-serialization";
import type { ContractKey } from "./store";
import {
  failContract,
  failureCheckpoint,
  failureSince,
  getContractId,
  getContractSerializer,
  resetContract as resetContractById,
  startContract,
  successContract,
} from "./store";

export type { ContractFn, ContractKey, ContractState } from "./store";
export {
  contractStore,
  EMPTY_CONTRACT_STATE,
  failContract,
  getContractId,
  getContractSerializer,
  startContract,
  successContract,
} from "./store";

/**
 * Lifecycle callbacks (and optional serializer override) for {@link contract}.
 *
 * @typeParam R - The value the procedure resolves to.
 *
 * @public
 */
export interface ContractOptions<R = unknown> {
  /** Called with the procedure's result after it succeeds. */
  onSuccess?: (result: R) => void;
  /** Called with the serialized error if the procedure throws. */
  onError?: (error: AppErrorResponse) => void;
  /** Called after success or failure, always. */
  onFinally?: () => void;
  /**
   * Serializer for this call. Defaults to the one carried by a `@Tracked`
   * target. Required when `target` is a string id (it carries none).
   */
  serializer?: ErrorSerializer;
}

/**
 * Runs an async procedure as a tracked contract: flips loading on, runs it, and
 * on failure serializes the thrown error and stores it under the contract id —
 * all readable through `useContract`.
 *
 * @remarks
 * The serializer comes from `options.serializer`, falling back to the one
 * attached to a `@Tracked` target via `@Tracked({ serializer })`. A string key
 * carries no serializer, so pass one in `options`. Errors are surfaced through
 * `onError` and `useContract`, never rethrown — call sites need no `try/catch`.
 *
 * A `@Tracked` method handles its own error and resolves with `undefined`, so a
 * procedure built from tracked calls resolves even when a step failed. The
 * contract therefore also fails when a tracked call fails while it runs, and
 * adopts that already-serialized error instead of serializing it a second time.
 *
 * @typeParam R - The procedure's resolved value.
 * @param target - A `@Tracked` function or a string id.
 * @param run - The procedure to run and track (may issue any number of requests).
 * @param options - Lifecycle callbacks and optional serializer.
 * @returns The procedure's result, or `undefined` if it failed.
 *
 * @example
 * Function key — serializer travels with `@Tracked({ serializer })`:
 * ```ts
 * contract(Service.Deposit.create, async () => {
 *   await Service.Deposit.create(payload);
 * });
 * ```
 *
 * @example
 * String key — pass the serializer:
 * ```ts
 * contract(CONTRACT_CREATE_TEMPLATE, async () => {
 *   await Service.Deposit.create(payload);
 *   await Service.Manager.update(payload2);
 * }, { serializer });
 * ```
 *
 * @public
 */
export async function contract<R = unknown>(
  target: ContractKey,
  run: () => Promise<R> | R,
  options?: ContractOptions<R>
): Promise<R | undefined> {
  const id = getContractId(target);
  const serializer = options?.serializer ?? getContractSerializer(target);

  if (!serializer) {
    throw new Error(
      "[contract] no serializer available — decorate the target with @Tracked({ serializer }), " +
        "or pass options.serializer (required for string keys)."
    );
  }

  const checkpoint = failureCheckpoint();
  startContract(id);

  try {
    const result = await run();
    const failed = failureSince(checkpoint);

    if (failed) {
      failContract({ id, errors: failed.errors });
      options?.onError?.(failed.errors);
      return undefined;
    }

    successContract(id);
    options?.onSuccess?.(result);
    return result;
  } catch (err) {
    const serialized = serializer.process(err);
    failContract({ id, errors: serialized });
    options?.onError?.(serialized);
    return undefined;
  } finally {
    options?.onFinally?.();
  }
}

/**
 * Resets a contract's error state, keyed the same way as {@link contract}.
 *
 * @remarks
 * With no `granular` argument, clears the entire contract back to
 * `EMPTY_CONTRACT_STATE`. With `granular`, removes only the listed
 * field keys from `errors.validation`, leaving any other field errors and
 * the global message intact — handy for clearing one field's error as the
 * user fixes it.
 *
 * @param target - A `@Tracked` function or a string id.
 * @param granular - Optional `validation` keys to clear instead of the whole entry.
 *
 * @example
 * Clear everything:
 * ```ts
 * resetContract(Service.Deposit.create);
 * ```
 *
 * @example
 * Clear a single field's error as the user types:
 * ```ts
 * resetContract(Service.Deposit.create, ["amount"]);
 * ```
 *
 * @public
 */
export function resetContract(target: ContractKey, granular?: string[]): void {
  resetContractById(getContractId(target), granular);
}
