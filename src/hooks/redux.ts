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
    const indexByChain = state.ethereum.activeIndex;
    const addressesByChain = state.ethereum.globalAddresses;

    // If any part is undefined, fallback to not loading
    if (!activeChainId || !indexByChain || !addressesByChain) return false;

    const activeIndex = indexByChain[activeChainId] ?? 0;
    const addresses = addressesByChain[activeChainId];

    if (!addresses || !addresses[activeIndex]) return false;

    return addresses[activeIndex].status === GeneralStatus.Loading;
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
