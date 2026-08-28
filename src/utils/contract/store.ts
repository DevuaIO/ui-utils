import { createStore } from "zustand";
import { CONTRACT_ID, CONTRACT_SERIALIZER } from "@/symbol";
import type { ExpectedAny, Nullable } from "@/types";
import type { AppErrorResponse, ErrorSerializer } from "@/utils/error-serialization";

/**
 * Per-contract loading/error state.
 *
 * @public
 */
export interface ContractState {
  /** Whether the contract is currently running. */
  loading: boolean;
  /** Serialized error from the last failure, or `null`. */
  errors: Nullable<AppErrorResponse>;
}

interface ContractStoreState {
  contracts: Record<string, ContractState>;
}

/**
 * Stable fallback for contracts that have never run.
 *
 * @public
 */
export const EMPTY_CONTRACT_STATE: ContractState = { loading: false, errors: null };

/**
 * Module-level store keyed by contract id. Lives outside React so `contract()`
 * can write to it anywhere; the hook reads it via `useStore`.
 *
 * @internal
 */
export const contractStore = createStore<ContractStoreState>(() => ({ contracts: {} }));

/**
 * How many runs are in flight per contract id. A `@Tracked` method called from
 * inside a `contract()` keyed by the same id runs nested, and only the outermost
 * run may settle the entry, or the inner one would clear `loading` (or delete the
 * entry outright) while the outer procedure is still working.
 *
 * @internal
 */
const activeRuns = new Map<string, number>();

/**
 * The most recent failure, stamped with a monotonic sequence number so a
 * `contract()` can tell whether anything failed while its procedure ran.
 *
 * @internal
 */
let failureSequence = 0;
let latestFailure: Nullable<{ sequence: number; id: string; errors: AppErrorResponse; error: unknown }> = null;

/**
 * Current position in the failure sequence, taken before a procedure starts.
 *
 * @internal
 */
export function failureCheckpoint(): number {
  return failureSequence;
}

/**
 * The serialized copy of `error`, if that is the failure the store last
 * recorded.
 *
 * A `@Tracked` method that calls another one rethrows what the inner call
 * already serialized, so the outer wrapper asks here rather than processing the
 * same error a second time - which would run every
 * `ErrorSerializer.subscribe` side effect once per level of nesting.
 *
 * @internal
 */
export function serializedFailureFor(error: unknown): Nullable<AppErrorResponse> {
  if (!latestFailure || latestFailure.error !== error) return null;
  return latestFailure.errors;
}

/**
 * The failure recorded after `checkpoint`, if any, with the value that was
 * thrown beside its serialized copy.
 *
 * An enclosing `contract()` reads it twice. On a resolved procedure it answers
 * whether that resolution was real: a procedure that swallows a `@Tracked`
 * method's rejection resolves as though nothing went wrong. On a rejected one it
 * answers whether the error arriving has already been serialized, so the same
 * failure is not processed a second time.
 *
 * @internal
 */
export function failureSince(checkpoint: number): Nullable<{ id: string; errors: AppErrorResponse; error: unknown }> {
  if (!latestFailure || latestFailure.sequence <= checkpoint) return null;
  return { id: latestFailure.id, errors: latestFailure.errors, error: latestFailure.error };
}

/** Marks a contract as running and clears its previous error. */
export function startContract(id: string): void {
  const depth = (activeRuns.get(id) ?? 0) + 1;
  activeRuns.set(id, depth);

  contractStore.setState((state) => ({
    contracts: {
      ...state.contracts,
      // A nested run keeps whatever a sibling call already recorded; only the
      // outermost start opens a clean slate.
      [id]: { loading: true, errors: depth === 1 ? null : (state.contracts[id]?.errors ?? null) },
    },
  }));
}

/** Clears a contract's entry on success. */
export function successContract(id: string): void {
  if (settleRun(id) > 0) return;

  contractStore.setState((state) => {
    const next = { ...state.contracts };
    delete next[id];
    return { contracts: next };
  });
}

/**
 * Records a serialized error for a contract and stops its loading state.
 *
 * `error` is the value that was thrown, kept so an enclosing `contract()` can
 * recognise the same failure arriving as a rejection and reuse the serialized
 * copy instead of producing a second one.
 */
export function failContract(payload: { id: string; errors: AppErrorResponse; error?: unknown }): void {
  const depth = settleRun(payload.id);

  failureSequence += 1;
  latestFailure = { sequence: failureSequence, id: payload.id, errors: payload.errors, error: payload.error };

  contractStore.setState((state) => ({
    contracts: { ...state.contracts, [payload.id]: { loading: depth > 0, errors: payload.errors } },
  }));
}

/**
 * Closes one run of a contract and returns how many are still in flight.
 * A settle with no matching start counts as the outermost run.
 *
 * @internal
 */
function settleRun(id: string): number {
  const depth = (activeRuns.get(id) ?? 1) - 1;
  if (depth > 0) activeRuns.set(id, depth);
  else activeRuns.delete(id);
  return depth;
}

/**
 * Deletes a value at a dot-notation path inside a validation map.
 *
 * Handles two layouts produced by the serializer plugins:
 * - **Flat keys** (Axios dot-notation, e.g. literal `"settings.0.input"`):
 *   matched directly and removed.
 * - **Nested paths** (e.g. `settings → [0] → input`): traversed segment by
 *   segment, deleting only the leaf. Numeric segments index into arrays.
 *
 * Missing paths are a no-op.
 *
 * @internal
 */
function deleteAtPath(root: Record<string, unknown>, path: string): void {
  // Flat literal key — e.g. AxiosErrorPlugin's dot-notation output.
  if (Object.hasOwn(root, path)) {
    delete root[path];
    return;
  }

  const segments = path.split(".");
  let current: unknown = root;

  for (let i = 0; i < segments.length - 1; i++) {
    if (current === null || typeof current !== "object") return;
    current = (current as Record<string, unknown>)[segments[i]];
  }

  if (current !== null && typeof current === "object") {
    const leaf = segments[segments.length - 1];
    // Property deletion (works for both object keys and array indices;
    // array holes are fine — we never reindex, so sibling paths stay valid).
    delete (current as Record<string, unknown>)[leaf];
  }
}

/**
 * Recursively checks whether a validation map has any remaining leaf values,
 * ignoring empty objects/arrays left behind after granular deletions.
 *
 * @internal
 */
function hasRemainingErrors(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object") return true;

  const entries = Array.isArray(value) ? value : Object.values(value);
  return entries.some(hasRemainingErrors);
}

/**
 * Resets a contract's error state.
 *
 * Without `granular`, removes the contract's entry entirely (back to
 * {@link EMPTY_CONTRACT_STATE}). With `granular`, keeps the contract but
 * deletes only the listed paths from `errors.validation` — dot-notation
 * paths like `"settings.0.input"` traverse nested structures, while a plain
 * key like `"amount"` clears a top-level field.
 *
 * If clearing the granular paths leaves no validation errors and there's no
 * global message, the whole entry is removed.
 *
 * @param id - The contract id (already resolved from a key).
 * @param granular - Optional list of `validation` paths to clear.
 *
 * @public
 */
export function resetContract(id: string, granular?: string[]): void {
  contractStore.setState((state) => {
    const current = state.contracts[id];
    if (!current) return state;

    if (!granular || granular.length === 0) {
      const next = { ...state.contracts };
      delete next[id];
      return { contracts: next };
    }

    const validation = current.errors?.validation;
    if (!validation) return state;

    // Deep clone so we don't mutate the stored object.
    const nextValidation = structuredClone(validation) as Record<string, unknown>;
    for (const path of granular) {
      deleteAtPath(nextValidation, path);
    }

    const hasValidation = hasRemainingErrors(nextValidation);
    const hasGlobal = !!current.errors?.global;

    if (!hasValidation && !hasGlobal) {
      const next = { ...state.contracts };
      delete next[id];
      return { contracts: next };
    }

    return {
      contracts: {
        ...state.contracts,
        [id]: {
          ...current,
          errors: current.errors ? { ...current.errors, validation: nextValidation } : null,
        },
      },
    };
  });
}

type AnyFn = (...args: ExpectedAny[]) => unknown;

/**
 * A function tagged by `@Tracked` — carries its contract id and, optionally, the
 * serializer to use, on hidden symbols.
 *
 * @public
 */
export type ContractFn = AnyFn & {
  [CONTRACT_ID]?: string;
  [CONTRACT_SERIALIZER]?: ErrorSerializer;
};

/**
 * Anything usable as a contract key: a string id, or a `@Tracked` function.
 *
 * @public
 */
export type ContractKey = string | AnyFn;

/**
 * Resolves a contract id from a string or a `@Tracked` function. Throws for an
 * untagged function so missing decorators surface early. Keys must be stable
 * references (a string constant or a singleton method).
 *
 * @public
 */
export function getContractId(target: ContractKey): string {
  if (typeof target === "string") return target;

  const id = (target as ContractFn)[CONTRACT_ID];
  if (!id) {
    throw new Error(
      "[contract] function is not tagged with @Tracked — " +
        "apply @Tracked() to the class or method, or pass a string id instead."
    );
  }
  return id;
}

/**
 * Reads the serializer attached to a `@Tracked` function, if any. String keys
 * carry none — pass one via `contract`'s options instead.
 *
 * @public
 */
export function getContractSerializer(target: ContractKey): ErrorSerializer | undefined {
  if (typeof target === "string") return undefined;
  return (target as ContractFn)[CONTRACT_SERIALIZER];
}
