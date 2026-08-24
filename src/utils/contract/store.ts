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

/** Marks a contract as running and clears its previous error. */
export function startContract(id: string): void {
  contractStore.setState((state) => ({
    contracts: { ...state.contracts, [id]: { loading: true, errors: null } },
  }));
}

/** Clears a contract's entry on success. */
export function successContract(id: string): void {
  contractStore.setState((state) => {
    const next = { ...state.contracts };
    delete next[id];
    return { contracts: next };
  });
}

/** Records a serialized error for a contract and stops its loading state. */
export function failContract(payload: { id: string; errors: AppErrorResponse }): void {
  contractStore.setState((state) => ({
    contracts: { ...state.contracts, [payload.id]: { loading: false, errors: payload.errors } },
  }));
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
