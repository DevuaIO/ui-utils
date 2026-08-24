import { useStore } from "zustand";
import type { ContractKey, ContractState } from "@/utils/contract";
import { contractStore, EMPTY_CONTRACT_STATE, getContractId } from "@/utils/contract";

export type { ContractFn, ContractKey, ContractOptions, ContractState } from "@/utils/contract";
export {
  contract,
  contractStore,
  EMPTY_CONTRACT_STATE,
  failContract,
  getContractId,
  getContractSerializer,
  resetContract,
  startContract,
  successContract,
} from "@/utils/contract";

/**
 * Reads the live loading/error state of a contract.
 *
 * @remarks
 * Pass the same key as `contract` — a `@Tracked` function or a string id.
 * Re-renders only when that contract's slice changes; untouched contracts
 * return {@link EMPTY_CONTRACT_STATE}. `errors` is the full `AppErrorResponse`.
 *
 * @param target - A `@Tracked` function or a string id.
 * @returns `{ loading, errors }`.
 *
 * @public
 */
export function useContract(target: ContractKey): ContractState {
  const id = getContractId(target);
  return useStore(contractStore, (state) => state.contracts[id] ?? EMPTY_CONTRACT_STATE);
}
