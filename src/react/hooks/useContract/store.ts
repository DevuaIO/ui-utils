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
 * Resets a contract's error state.
 *
 * Without `granular`, removes the contract's entry entirely (back to
 * {@link EMPTY_CONTRACT_STATE}). With `granular`, keeps the contract but
 * deletes only the listed keys from `errors.validation` — useful for
 * clearing a single field's error as the user edits it, while leaving
 * the rest intact.
 *
 * If clearing granular keys empties the `validation` map and there's no
 * global error, the whole entry is removed.
 *
 * @param id - The contract id (already resolved from a key).
 * @param granular - Optional list of `validation` keys to clear.
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

    const nextValidation = { ...validation };
    for (const key of granular) {
      delete nextValidation[key];
    }

    const hasValidation = Object.keys(nextValidation).length > 0;
    const hasGlobal = !!current.errors?.global;

    // Nothing left to show → drop the whole entry.
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
