/**
 * useDashboardData — THE SINGLE SOURCE OF TRUTH for dashboard rendering.
 *
 * WHY THIS EXISTS:
 * With 34 EVM chains, each balance fetch mutates globalAddresses in Redux.
 * Using N separate useSelector/useDebouncedSelector hooks means N independent
 * store subscriptions, N independent setTimeout callbacks, and N independent
 * setState calls. React CANNOT batch setState calls from separate setTimeout
 * callbacks, so N hooks = up to N re-renders per dispatch cycle.
 *
 * This hook consolidates ALL dashboard data into:
 *   - ONE store.subscribe() call
 *   - ONE setTimeout debounce
 *   - ONE setState → ONE re-render
 *
 * It also checks screen focus: if the dashboard isn't visible (user is on
 * token detail page), it pauses updates entirely and syncs on return.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigation } from "expo-router";
import { store } from "../store";
import type { RootState } from "../store";
import { GeneralStatus, type Transaction } from "../store/types";

// Shared empty arrays to avoid new-reference-on-every-call problem
const EMPTY_TRANSACTIONS: Transaction[] = [];

export interface DashboardData {
  // EVM
  activeChainId: number;
  networks: RootState["ethereum"]["networks"];
  ethWalletAddress: string;
  ethBalance: number;
  ethTransactions: Transaction[];
  failedEthStatus: boolean;
  // Solana
  solWalletAddress: string;
  solBalance: number;
  solTransactions: Transaction[];
  failedSolStatus: boolean;
  // Prices
  prices: RootState["price"]["data"];
  // Derived assets
  ethereumAssets: Array<{
    key: string;
    chainId: number;
    name: string;
    symbol: string;
    balance: number;
    usdValue: number;
    address: string;
    status: GeneralStatus;
  }>;
  totalUsdBalance: number;
  solUsd: number;
  // Chain IDs
  evmChainIds: number[];
  allChainIds: number[];
  // Imported account visibility
  showEvmAssets: boolean;
  showSolAssets: boolean;
}

function computeDashboardData(state: RootState): DashboardData {
  // ── EVM account ──
  const activeChainId = state.ethereum.activeChainId;
  const networks = state.ethereum.networks;
  const activeIndex = state.ethereum.activeIndex ?? 0;
  const importedEvm = state.importedAccounts?.activeEvmAddress;
  const importedSol = state.importedAccounts?.activeSolAddress;
  const globalAddresses = state.ethereum.globalAddresses;

  // ── Imported account visibility ──
  // If an imported account is active, only show chains that were imported.
  // Seed-derived accounts always have both EVM + Solana.
  const isImportedActive = !!(importedEvm || importedSol);
  const showEvmAssets = isImportedActive ? !!importedEvm : true;
  const showSolAssets = isImportedActive ? !!importedSol : true;

  const currentEvmAccount = importedEvm
    ? globalAddresses?.find(
        (a) => a.address?.toLowerCase() === importedEvm.toLowerCase()
      )
    : globalAddresses?.[activeIndex];

  const ethWalletAddress = currentEvmAccount?.address || "";
  const ethBalance = currentEvmAccount?.balanceByChain?.[activeChainId] ?? 0;
  const ethTransactions =
    currentEvmAccount?.transactionMetadataByChain?.[activeChainId]
      ?.transactions ?? EMPTY_TRANSACTIONS;
  const failedEthStatus =
    currentEvmAccount?.statusByChain?.[activeChainId] === GeneralStatus.Failed;

  // ── Solana account ──
  const solIdx = state.solana.activeIndex ?? 0;
  const currentSolAccount = importedSol
    ? state.solana.addresses?.find((a) => a.address === importedSol)
    : state.solana.addresses?.[solIdx];

  const solWalletAddress = currentSolAccount?.address || "";
  const solBalance = currentSolAccount?.balance ?? 0;
  const solTransactions =
    currentSolAccount?.transactionMetadata?.transactions ?? EMPTY_TRANSACTIONS;
  const failedSolStatus =
    currentSolAccount?.status === GeneralStatus.Failed;

  // ── Prices ──
  const prices = state.price.data;

  // ── Chain IDs ──
  const evmChainIds = Object.keys(networks).map(Number);
  const allChainIds = [...evmChainIds, 101];

  // ── Build asset list (only if EVM assets should be shown) ──
  const ethereumAssets = showEvmAssets
    ? Object.values(networks)
        .map((network) => {
          const chainId = network.chainId;
          const price = prices?.[chainId]?.usd ?? 0;
          const balance = currentEvmAccount?.balanceByChain?.[chainId] ?? 0;
          return {
            key: `evm-${chainId}`,
            chainId,
            name: network.chainName,
            symbol: network.symbol,
            balance,
            usdValue: balance * price,
            address: ethWalletAddress,
            status:
              (currentEvmAccount?.statusByChain?.[chainId] as GeneralStatus) ??
              GeneralStatus.Idle,
          };
        })
        .sort((a, b) => b.usdValue - a.usdValue)
    : [];

  // ── Totals (only include visible assets) ──
  const evmTotal = ethereumAssets.reduce(
    (sum, a) => sum + (a.usdValue ?? 0),
    0
  );
  const solUsd = showSolAssets ? (prices[101]?.usd ?? 0) * solBalance : 0;
  const totalUsdBalance = evmTotal + solUsd;

  return {
    activeChainId,
    networks,
    ethWalletAddress,
    ethBalance,
    ethTransactions,
    failedEthStatus,
    solWalletAddress,
    solBalance,
    solTransactions,
    failedSolStatus,
    prices,
    ethereumAssets,
    totalUsdBalance,
    solUsd,
    evmChainIds,
    allChainIds,
    showEvmAssets,
    showSolAssets,
  };
}

/**
 * Compact fingerprint of all values that affect the UI.
 * Comparing one string is O(1) vs deep-comparing entire data tree.
 */
function fingerprint(d: DashboardData): string {
  const bals = d.ethereumAssets.map(a => `${a.chainId}:${a.balance}`).join(",");
  return `${d.activeChainId}|${d.totalUsdBalance.toFixed(2)}|${d.solBalance}|${d.solUsd.toFixed(2)}|${d.ethTransactions.length}|${d.solTransactions.length}|${d.failedEthStatus}|${d.failedSolStatus}|${d.showEvmAssets}|${d.showSolAssets}|${bals}`;
}

/**
 * @param debounceMs How long to wait after the last dispatch before updating.
 *   Default 800ms — enough to absorb a full 34-chain balance fetch storm.
 */
export function useDashboardData(debounceMs = 800): DashboardData {
  const navigation = useNavigation();
  const [data, setData] = useState<DashboardData>(() =>
    computeDashboardData(store.getState())
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isFocusedRef = useRef(true);
  const needsSyncRef = useRef(false);
  const lastFpRef = useRef<string>("");

  // Track focus/blur via navigation events (uses ref to avoid re-subscribing to store)
  useEffect(() => {
    const onFocus = () => {
      isFocusedRef.current = true;
      if (needsSyncRef.current) {
        needsSyncRef.current = false;
        const newData = computeDashboardData(store.getState());
        lastFpRef.current = fingerprint(newData);
        setData(newData);
      }
    };
    const onBlur = () => {
      isFocusedRef.current = false;
    };

    const unsubFocus = navigation.addListener("focus", onFocus);
    const unsubBlur = navigation.addListener("blur", onBlur);
    return () => {
      unsubFocus();
      unsubBlur();
    };
  }, [navigation]);

  // ONE store subscription — never re-subscribes because isFocusedRef is read via ref
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      if (!isFocusedRef.current) {
        needsSyncRef.current = true;
        return;
      }

      // Debounce: reset timer on every dispatch, only fire once after storm settles
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        const newData = computeDashboardData(store.getState());
        const newFp = fingerprint(newData);
        // SKIP if nothing visible has changed — prevents ghost re-renders
        if (newFp === lastFpRef.current) return;
        lastFpRef.current = newFp;
        setData(newData);
      }, debounceMs);
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [debounceMs]);

  return data;
}


