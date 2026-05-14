import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { View, RefreshControl, FlatList, Text, StyleSheet, InteractionManager, AppState, AppStateStatus } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import NetInfo from "@react-native-community/netinfo";
import { useTheme } from "styled-components/native";
import { ROUTES } from "../../constants/routes";
import type { ThemeType } from "../../styles/theme";
import { type AppDispatch, store, type RootState } from "../../store";
import { Transaction } from "../../store/types";
import NETWORKS from "../../services/defaultNetwork";

import { fetchPrices } from "../../store/priceSlice";
import {
  fetchEvmBalance,
  fetchEvmTransactions,
  fetchEvmTransactionsInterval,
  fetchEvmBalanceInterval,
  setActiveChain,
} from "../../store/ethereumSlice";
import {
  fetchSolanaBalance,
  fetchSolanaTransactions,
  fetchSolanaTransactionsInterval,
  fetchSolanaBalanceInterval,
} from "../../store/solanaSlice";
import { capitalizeFirstLetter } from "../../utils/capitalizeFirstLetter";
import { truncateWalletAddress } from "../../utils/truncateWalletAddress";
import { formatDollar, formatDollarRaw } from "../../utils/formatDollars";
import { useStorage } from "../../hooks/useStorageState";
import PrimaryButton from "../../components/PrimaryButton/PrimaryButton";
import SendIcon from "../../assets/svg/send.svg";
import ReceiveIcon from "../../assets/svg/receive.svg";
import CryptoInfoCard from "../../components/CryptoInfoCard/CryptoInfoCard";
import AssetCard from "../../components/AssetCard/AssetCard";
import { BlockchainIcon } from "../../components/BlockchainIcon/BlockchainIcon";
import { FETCH_PRICES_INTERVAL } from "../../constants/price";
import { SafeAreaContainer } from "../../components/Styles/Layout.styles";
import InfoBanner from "../../components/InfoBanner/InfoBanner";
import { SNAP_POINTS } from "../../constants/storage";
import { loadTokens } from "../../store/tokenSlice";
import { loadSolTokens } from "../../store/solTokenSlice";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Didcomm from "../../../native-modules/didcomm";
import { useRenderLog } from "../../utils/PerformanceMonitor";
import Header from "../../components/Header/Header";

// ─── THE SINGLE DATA HOOK ───
import { useDashboardData } from "../../hooks/useDashboardData";

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export default function Index() {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const theme = useTheme() as ThemeType;
  useRenderLog("DashboardIndex");

  // ─── Theme-derived styles: computed ONCE per theme change, not per render ───
  const styles = useMemo(() => createStyles(theme), [theme]);

  // ═══════════════════════════════════════════════════════════
  // ONE hook → ONE subscription → ONE state → ONE re-render
  // 800ms debounce + fingerprint skip = minimal re-renders
  // ═══════════════════════════════════════════════════════════
  const {
    ethWalletAddress,
    ethTransactions,
    solTransactions,
    failedEthStatus,
    failedSolStatus,
    solBalance,
    prices,
    ethereumAssets,
    totalUsdBalance,
    solUsd,
    evmChainIds,
    allChainIds,
    solWalletAddress,
    showEvmAssets,
    showSolAssets,
  } = useDashboardData(800);

  const handleSelectChain = useCallback(
    (chainId: number, address: string) => {
      dispatch(setActiveChain(chainId));
      dispatch(fetchEvmBalance({ chainId, address }));
      dispatch(fetchEvmTransactions({ chainId, address }));
    },
    [dispatch]
  );

  useEffect(() => {
    dispatch(loadTokens());
    dispatch(loadSolTokens());
  }, [dispatch]);

  // ─── Fetch helpers: read from store.getState() to avoid any selector deps ───
  const fetchTokenBalances = useCallback(async () => {
    const s = store.getState();
    const idx = s.ethereum.activeIndex ?? 0;
    const imported = s.importedAccounts?.activeEvmAddress;
    const acct = imported
      ? s.ethereum.globalAddresses?.find(a => a.address?.toLowerCase() === imported.toLowerCase())
      : s.ethereum.globalAddresses?.[idx];
    const addr = acct?.address;
    if (!addr) return;

    const cid = s.ethereum.activeChainId;
    await dispatch(fetchEvmBalance({ chainId: cid, address: addr }));

    const others = evmChainIds.filter(id => id !== cid);
    const BATCH = 4;
    for (let i = 0; i < others.length; i += BATCH) {
      const batch = others.slice(i, i + BATCH);
      await Promise.all(
        batch.map(c =>
          dispatch(fetchEvmBalance({ chainId: c, address: addr })).catch(() => {})
        )
      );
      if (i + BATCH < others.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    const solImported = s.importedAccounts?.activeSolAddress;
    const solIdx = s.solana.activeIndex ?? 0;
    const solAddr = solImported || s.solana.addresses?.[solIdx]?.address;
    if (solAddr) dispatch(fetchSolanaBalance(solAddr));
  }, [dispatch, evmChainIds]);

  const fetchTransactions = useCallback(async () => {
    const s = store.getState();
    const idx = s.ethereum.activeIndex ?? 0;
    const imported = s.importedAccounts?.activeEvmAddress;
    const acct = imported
      ? s.ethereum.globalAddresses?.find(a => a.address?.toLowerCase() === imported.toLowerCase())
      : s.ethereum.globalAddresses?.[idx];
    const addr = acct?.address;
    const cid = s.ethereum.activeChainId;

    // Fetch active chain first (highest priority)
    if (addr) await dispatch(fetchEvmTransactions({ chainId: cid, address: addr })).catch(() => {});

    // Then fetch from chains that have nonzero balances (batched)
    if (addr && acct?.balanceByChain) {
      const chainsWithBalance = Object.entries(acct.balanceByChain)
        .filter(([id, bal]) => Number(id) !== cid && (bal as number) > 0)
        .map(([id]) => Number(id));

      const TX_BATCH = 3;
      for (let i = 0; i < chainsWithBalance.length; i += TX_BATCH) {
        await Promise.all(
          chainsWithBalance.slice(i, i + TX_BATCH).map(chainId =>
            dispatch(fetchEvmTransactions({ chainId, address: addr })).catch(() => {})
          )
        );
      }
    }

    const solImported = s.importedAccounts?.activeSolAddress;
    const solIdx = s.solana.activeIndex ?? 0;
    const solAddr = solImported || s.solana.addresses?.[solIdx]?.address;
    if (solAddr) await dispatch(fetchSolanaTransactions(solAddr)).catch(() => {});
  }, [dispatch]);

  const fetchAndUpdatePricesInternal = useCallback(async () => {
    const s = store.getState();
    const cid = s.ethereum.activeChainId;
    const idx = s.ethereum.activeIndex ?? 0;
    const imported = s.importedAccounts?.activeEvmAddress;
    const acct = imported
      ? s.ethereum.globalAddresses?.find(a => a.address?.toLowerCase() === imported.toLowerCase())
      : s.ethereum.globalAddresses?.[idx];
    const addr = acct?.address;

    await dispatch(fetchPrices(allChainIds));

    if (addr) {
      // Fetch active chain balance + transactions first (highest priority)
      dispatch(fetchEvmBalanceInterval({ chainId: cid, address: addr }));
      dispatch(fetchEvmTransactionsInterval({ chainId: cid, address: addr }));

      // Fetch balances for all other chains (batched)
      const others = evmChainIds.filter(id => id !== cid);
      const BATCH = 4;
      for (let i = 0; i < others.length; i += BATCH) {
        await Promise.all(
          others.slice(i, i + BATCH).map(c =>
            dispatch(fetchEvmBalanceInterval({ chainId: c, address: addr })).catch(() => {})
          )
        );
      }

      // Fetch transactions for chains with nonzero balances
      const updatedAcct = store.getState().ethereum.globalAddresses?.find(
        a => a.address?.toLowerCase() === addr.toLowerCase()
      );
      if (updatedAcct?.balanceByChain) {
        const chainsWithBalance = Object.entries(updatedAcct.balanceByChain)
          .filter(([id, bal]) => Number(id) !== cid && (bal as number) > 0)
          .map(([id]) => Number(id));
        const TX_BATCH = 3;
        for (let i = 0; i < chainsWithBalance.length; i += TX_BATCH) {
          await Promise.all(
            chainsWithBalance.slice(i, i + TX_BATCH).map(chainId =>
              dispatch(fetchEvmTransactionsInterval({ chainId, address: addr })).catch(() => {})
            )
          );
        }
      }
    }

    const solImported = s.importedAccounts?.activeSolAddress;
    const solIdx = s.solana.activeIndex ?? 0;
    const solAddr = solImported || s.solana.addresses?.[solIdx]?.address;
    if (solAddr) {
      dispatch(fetchSolanaBalanceInterval(solAddr));
      dispatch(fetchSolanaTransactionsInterval(solAddr));
    }
  }, [dispatch, allChainIds, evmChainIds]);

  const [refreshing, setRefreshing] = useState(false);
  const [bottomSheetIndex, setBottomSheetIndex, bottomSheetIndexLoading] = useStorage(SNAP_POINTS);
  const snapPoints = useMemo(() => ["10%", "33%", "69%", "88%"], []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchPrices(allChainIds)),
      fetchTokenBalances(),
      fetchTransactions()
    ]);
    setRefreshing(false);
  }, [dispatch, allChainIds, fetchTokenBalances, fetchTransactions]);
  

  // Re-init: fires whenever the active wallet address changes (import, switch account)
  // OR when a new unlock session starts (ensures fresh data after lock/unlock cycle)
  const unlockedAt = useSelector((state: RootState) => state.biometrics.unlockedAt);
  const prevAddrRef = useRef<string>("");
  const prevUnlockRef = useRef<number | undefined>();
  const initRetryRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!ethWalletAddress || !unlockedAt) return;

    // Skip if same address AND same unlock session (prevents duplicate fetches)
    const sameAddr = ethWalletAddress === prevAddrRef.current;
    const sameSession = unlockedAt === prevUnlockRef.current;
    if (sameAddr && sameSession) return;

    prevAddrRef.current = ethWalletAddress;
    prevUnlockRef.current = unlockedAt;

    // Defer ALL network work until after React finishes rendering and animating.
    // Without this, RPC responses block the JS thread and freeze the UI.
    const handle = InteractionManager.runAfterInteractions(() => {
      const init = async (attempt = 1): Promise<void> => {
        let anyFailed = false;

        // Each step is independent — one failure doesn't block the others
        try {
          await dispatch(fetchPrices(allChainIds));
        } catch (err) {
          console.warn(`[Init] fetchPrices failed (attempt ${attempt}):`, err);
          anyFailed = true;
        }

        try {
          await fetchTokenBalances();
        } catch (err) {
          console.warn(`[Init] fetchTokenBalances failed (attempt ${attempt}):`, err);
          anyFailed = true;
        }

        try {
          await fetchTransactions();
        } catch (err) {
          console.warn(`[Init] fetchTransactions failed (attempt ${attempt}):`, err);
          anyFailed = true;
        }

        // Watchdog: if anything failed and we haven't exhausted retries,
        // schedule another attempt with exponential backoff
        if (anyFailed && attempt < 3) {
          const delay = attempt * 3000; // 3s, 6s
          console.log(`[Init] Scheduling retry #${attempt + 1} in ${delay / 1000}s...`);
          initRetryRef.current = setTimeout(() => init(attempt + 1), delay);
        }
      };
      init();
    });
    return () => {
      handle.cancel();
      if (initRetryRef.current) clearTimeout(initRetryRef.current);
    };
  }, [ethWalletAddress, unlockedAt, allChainIds, fetchTokenBalances, fetchTransactions, dispatch]);

  useEffect(() => {
    const interval = setInterval(fetchAndUpdatePricesInternal, FETCH_PRICES_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAndUpdatePricesInternal]);

  // Handle app coming from background to foreground
  // Throttled: only refreshes if the app was in background for >5 seconds
  // This prevents duplicate fetches that conflict with the unlock-init effect
  useEffect(() => {
    let lastBackgroundedAt = Date.now();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        const elapsed = Date.now() - lastBackgroundedAt;
        if (elapsed > 5000) {
          console.log(`[Dashboard] App returned to active after ${Math.round(elapsed / 1000)}s, refreshing...`);
          // Clear any pending retry
          if (retryTimer) clearTimeout(retryTimer);

          const refreshWithRetry = async (attempt = 1) => {
            try {
              await onRefresh();
            } catch (err) {
              if (attempt < 3) {
                console.warn(`[Dashboard] Foreground refresh failed (attempt ${attempt}), retrying...`);
                retryTimer = setTimeout(() => refreshWithRetry(attempt + 1), attempt * 2000);
              }
            }
          };
          refreshWithRetry();
        }
      } else if (nextAppState === "background" || nextAppState === "inactive") {
        lastBackgroundedAt = Date.now();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [onRefresh]);

  // ─── Network reconnection auto-refresh ───
  // Two strategies:
  // 1. NetInfo native listener (requires rebuild after install)
  // 2. Pure-JS polling fallback (works immediately without rebuild)
  useEffect(() => {
    let wasOffline = false;
    let netInfoUnsub: (() => void) | null = null;

    // Strategy 1: Try NetInfo (needs native rebuild)
    try {
      NetInfo.fetch().then((state) => {
        const offline = state.isConnected === false || state.isInternetReachable === false;
        wasOffline = offline;
        if (offline) {
          console.log("[Dashboard] App started offline (NetInfo), waiting for connectivity...");
        }
      }).catch(() => { /* NetInfo not linked yet */ });

      netInfoUnsub = NetInfo.addEventListener((state) => {
        const isOffline = state.isConnected === false || state.isInternetReachable !== true;
        const isOnline = state.isConnected === true && state.isInternetReachable === true;

        if (isOnline && wasOffline) {
          console.log("[Dashboard] Network reconnected (NetInfo)! Refreshing...");
          onRefresh();
        }
        wasOffline = isOffline;
      });
    } catch (e) {
      console.warn("[Dashboard] NetInfo not available, using polling fallback");
    }

    // Strategy 2: Pure-JS polling fallback — detects connectivity without native modules
    // Polls every 10s; when a fetch succeeds after previous failure, triggers refresh
    let pollFailed = false;
    const pollInterval = setInterval(async () => {
      try {
        // Lightweight check: fetch a tiny known endpoint with a short timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch("https://www.google.com/generate_204", {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeout);

        // If we get here, internet is working
        if (pollFailed) {
          console.log("[Dashboard] Network reconnected (polling)! Refreshing...");
          pollFailed = false;
          onRefresh();
        }
      } catch {
        pollFailed = true;
      }
    }, 10000);

    return () => {
      if (netInfoUnsub) netInfoUnsub();
      clearInterval(pollInterval);
    };
  }, [onRefresh]);

  const mergedAndSortedTransactions = useMemo(() => {
    const ethTx = ethTransactions ?? [];
    const solTx = solTransactions ?? [];
    return [...solTx, ...ethTx]
      .filter((tx) => tx && tx.blockTime != null)
      .sort((a, b) => b.blockTime - a.blockTime)
      .slice(0, 30);
  }, [solTransactions, ethTransactions]);

  const renderTx = useCallback(({ item }: { item: Transaction }) => {
    const sign = item.direction === "received" ? "+" : "-";
    // Guard against NaN, undefined, and falsy values
    const rawValue = typeof item.value === "number" && !isNaN(item.value) ? item.value : 0;
    // Format: small values get more decimals, strip trailing zeros
    const formattedValue = rawValue === 0
      ? "0"
      : rawValue.toFixed(rawValue < 0.001 ? 6 : 4).replace(/\.?0+$/, "");
    const explorerBase = (() => {
      if (item.chainId === 101) return "https://explorer.solana.com";
      const net = NETWORKS.find(n => n.chainId === item.chainId);
      return net?.explorerUrl || "https://etherscan.io";
    })();

    return (
      <CryptoInfoCard
        icon=""
        title={capitalizeFirstLetter(item.direction)}
        caption={item.direction === "received" ? `From ${truncateWalletAddress(item.from)}` : `To ${truncateWalletAddress(item.to)}`}
        details={`${sign}${formattedValue}`}
        onPress={() => WebBrowser.openBrowserAsync(`${explorerBase}/tx/${item.hash}`)}
      />
    );
  }, []);

  const renderAsset = useCallback(({ item: asset }: any) => (
    <View style={styles.cardView}>
      <AssetCard
        chainId={asset.chainId}
        name={asset.name}
        symbol={asset.symbol}
        balance={asset.balance}
        usdValue={asset.usdValue}
        address={asset.address}
        price={prices[asset.chainId]?.usd ?? 0}
        onSelectChain={handleSelectChain}
      />
    </View>
  ), [prices, handleSelectChain, styles.cardView]);

  const handleSheetChange = useCallback((index: number) => {
    setBottomSheetIndex(JSON.stringify(index));
  }, [setBottomSheetIndex]);

  const handleSolPress = useCallback(() => {
    router.push({
      pathname: ROUTES.solDetails,
      params: {
        asset: JSON.stringify({
          symbol: "SOL",
          numberOfTokens: solBalance,
          chainId: 101,
          address: solWalletAddress,
          price: prices[101]?.usd ?? 0,
        }),
      },
    });
  }, [solBalance, solWalletAddress, prices]);

  useEffect(() => {
    const initDidcomm = async () => {
      try { await Didcomm.helloWorld(); } catch (err) { console.error("Didcomm error:", err); }
    };
    initDidcomm();
  }, []);

  // ─── Memoized style overrides ───
  const contentContainerStyle = useMemo(() => ({
    ...styles.contentContainer,
    marginTop: insets.top + 20,
  }), [styles.contentContainer, insets.top]);

  const flatListContentStyle = useMemo(() => ({ gap: 8 }), []);
  const bottomSheetBgStyle = useMemo(() => ({
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: theme.colors.lightDark,
  }), [theme.colors.lightDark]);
  const handleIndicatorStyle = useMemo(() => ({
    backgroundColor: theme.colors.muted,
    width: 40,
  }), [theme.colors.muted]);

  const totalAssets = ethereumAssets.length + (showSolAssets ? 1 : 0);

  // ─── Memoized list components ───
  const assetListHeader = useMemo(() => (
    <View style={styles.assetHeader}>
      <Text style={styles.bottomSectionTitle}>Assets</Text>
      <View style={styles.assetCountBadge}>
        <Text style={styles.assetCountText}>{totalAssets}</Text>
      </View>
    </View>
  ), [totalAssets, styles]);

  const assetListFooter = useMemo(() => (
    showSolAssets ? (
      <View style={styles.cardView}>
        <CryptoInfoCard
          onPress={handleSolPress}
          title="Solana"
          caption={`${solBalance} SOL`}
          details={formatDollar(solUsd)}
          icon={<BlockchainIcon symbol="SOL" size={25} />}
          hideBackground
        />
      </View>
    ) : null
  ), [showSolAssets, solBalance, solUsd, handleSolPress, styles.cardView]);

  return (
    <SafeAreaContainer>
      <Header />
      <View style={contentContainerStyle}>
        <View style={styles.balanceContainer}>
          <Text 
            style={styles.balanceLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Total Balance
          </Text>
          <Text 
            style={styles.balanceText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            <Text style={styles.dollarSign}>$</Text>
            {formatDollarRaw(totalUsdBalance)}
          </Text>
        </View>

        <View style={styles.actionContainer}>
          <PrimaryButton
            icon={<SendIcon width={20} height={20} fill={theme.colors.primary} />}
            onPress={() => router.push(ROUTES.sendOptions)}
            btnText="Send"
            useGradient
          />
          <PrimaryButton
            icon={<ReceiveIcon width={20} height={20} fill={theme.colors.primary} />}
            onPress={() => router.push(ROUTES.receiveOptions)}
            btnText="Receive"
            variant="outline"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {mergedAndSortedTransactions.length > 0 && (
            <Text style={styles.sectionAction}>View All</Text>
          )}
        </View>

        <FlatList
          contentContainerStyle={flatListContentStyle}
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          windowSize={3}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              tintColor={theme.colors.primary}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          data={mergedAndSortedTransactions}
          renderItem={renderTx}
          keyExtractor={(item, index) => `${item.hash ?? "no-hash"}-${index}`}
          ListEmptyComponent={<InfoBanner />}
        />

        {failedEthStatus && failedSolStatus && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ Network error — please try again later</Text>
          </View>
        )}
      </View>

      {!bottomSheetIndexLoading && (
        <BottomSheet
          ref={sheetRef}
          index={bottomSheetIndex !== null ? parseInt(bottomSheetIndex) : 1}
          onChange={handleSheetChange}
          snapPoints={snapPoints}
          backgroundStyle={bottomSheetBgStyle}
          handleIndicatorStyle={handleIndicatorStyle}
        >
          <BottomSheetFlatList
            data={ethereumAssets}
            keyExtractor={(item) => item.key}
            initialNumToRender={5}
            maxToRenderPerBatch={3}
            windowSize={3}
            removeClippedSubviews={true}
            contentContainerStyle={flatListContentStyle}
            ListHeaderComponent={assetListHeader}
            renderItem={renderAsset}
            ListFooterComponent={assetListFooter}
          />
        </BottomSheet>
      )}
    </SafeAreaContainer>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES — computed once per theme, cached by useMemo
// Unlike styled-components which re-evaluate template literals
// on every render, StyleSheet.create runs once.
// ═══════════════════════════════════════════════════════════

function createStyles(theme: ThemeType) {
  const sp = (val: string | number) => (typeof val === "number" ? val : parseFloat(val));

  return StyleSheet.create({
    contentContainer: {
      flex: 1,
      justifyContent: "flex-start",
      padding: sp(theme.spacing.medium),
    },
    balanceContainer: {
      alignItems: "center",
      marginBottom: sp(theme.spacing.large),
    },
    balanceLabel: {
      fontFamily: theme.fonts.families.openRegular,
      fontSize: wp("3.5%"),
      color: theme.colors.lightGrey,
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 8,
      width: "100%",
      textAlign: "center",
    },
    balanceText: {
      fontFamily: theme.fonts.families.openBold,
      fontSize: wp("12%"),
      color: theme.colors.white,
      textAlign: "center",
      letterSpacing: -1,
      width: "100%",
    },
    dollarSign: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.families.openBold,
      fontSize: wp("8%"),
      textAlign: "center",
    },
    actionContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      marginBottom: sp(theme.spacing.large),
      gap: 10,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: sp(theme.spacing.medium),
      marginTop: sp(theme.spacing.small),
    },
    sectionTitle: {
      fontFamily: theme.fonts.families.openBold,
      fontSize: sp(theme.fonts.sizes.header),
      color: theme.colors.white,
      letterSpacing: 0.3,
      flex: 1,
    },
    sectionAction: {
      fontFamily: theme.fonts.families.openBold,
      fontSize: sp(theme.fonts.sizes.small),
      color: theme.colors.primary,
      flexShrink: 0,
      marginLeft: sp(theme.spacing.small),
    },
    cardView: {
      marginBottom: sp(theme.spacing.small),
      width: "100%",
    },
    bottomSectionTitle: {
      fontFamily: theme.fonts.families.openBold,
      fontSize: sp(theme.fonts.sizes.title),
      color: theme.colors.white,
      marginBottom: sp(theme.spacing.medium),
      marginLeft: sp(theme.spacing.small),
      letterSpacing: 0.3,
      flex: 1,
    },
    errorContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      backgroundColor: "rgba(255, 77, 79, 0.15)",
      borderWidth: 1,
      borderColor: "rgba(255, 77, 79, 0.3)",
      borderRadius: sp(theme.borderRadius.medium),
      height: 56,
      padding: sp(theme.spacing.medium),
      marginTop: sp(theme.spacing.medium),
    },
    errorText: {
      fontFamily: theme.fonts.families.openBold,
      fontSize: sp(theme.fonts.sizes.small),
      color: theme.colors.error,
    },
    assetCountBadge: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: sp(theme.borderRadius.pill),
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    assetCountText: {
      fontFamily: theme.fonts.families.openBold,
      fontSize: sp(theme.fonts.sizes.small),
      color: theme.colors.lightGrey,
    },
    assetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
    },
  });
}
