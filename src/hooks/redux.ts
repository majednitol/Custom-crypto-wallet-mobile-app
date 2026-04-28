// hooks/useLoadingState.ts
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { GeneralStatus } from "../store/types";

/**
 * Hook to determine if any wallet (EVM or Solana) is currently loading
 */
export const useLoadingState = (): boolean => {
  // ---------------- EVM Wallet ----------------
  const ethLoading = useSelector((state: RootState) => {
    const activeChainId = state.ethereum.activeChainId;
    const activeIndex = state.ethereum.activeIndex ?? 0;
    const account = state.ethereum.globalAddresses[activeIndex];

    if (!account) return false;

    return account.statusByChain?.[activeChainId] === GeneralStatus.Loading;
  });

  // ---------------- Solana Wallet ----------------
  const solLoading = useSelector((state: RootState) => {
    const addresses = state.solana.addresses;
    if (!addresses) return false;

    // Check imported wallet loading state
    const importedSolAddr = state.importedAccounts?.activeSolAddress;
    if (importedSolAddr) {
      const imported = addresses.find(a => a.address === importedSolAddr);
      return imported?.status === GeneralStatus.Loading;
    }

    const activeIndex = state.solana.activeIndex ?? 0;
    if (!addresses[activeIndex]) return false;
    return addresses[activeIndex].status === GeneralStatus.Loading;
  });

  // Return true if any wallet is loading
  return ethLoading || solLoading;
};
