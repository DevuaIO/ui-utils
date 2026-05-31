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

/** Removes a contract's entry, resetting it to {@link EMPTY_CONTRACT_STATE}. */
export function resetContract(id: string): void {
  contractStore.setState((state) => {
    const next = { ...state.contracts };
    delete next[id];
    return { contracts: next };
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
