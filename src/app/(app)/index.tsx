import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { View, RefreshControl, FlatList, Text, StyleSheet, InteractionManager } from "react-native";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useDispatch } from "react-redux";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "styled-components/native";
import { ROUTES } from "../../constants/routes";
import type { ThemeType } from "../../styles/theme";
import { type AppDispatch, store } from "../../store";
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
    if (addr) await dispatch(fetchEvmTransactions({ chainId: cid, address: addr }));

    const solImported = s.importedAccounts?.activeSolAddress;
    const solIdx = s.solana.activeIndex ?? 0;
    const solAddr = solImported || s.solana.addresses?.[solIdx]?.address;
    if (solAddr) await dispatch(fetchSolanaTransactions(solAddr));
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
      dispatch(fetchEvmBalanceInterval({ chainId: cid, address: addr }));
      dispatch(fetchEvmTransactionsInterval({ chainId: cid, address: addr }));
    }
    const solImported = s.importedAccounts?.activeSolAddress;
    const solIdx = s.solana.activeIndex ?? 0;
    const solAddr = solImported || s.solana.addresses?.[solIdx]?.address;
    if (solAddr) {
      dispatch(fetchSolanaBalanceInterval(solAddr));
      dispatch(fetchSolanaTransactionsInterval(solAddr));
    }
  }, [dispatch, allChainIds]);

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

  // Init: runs once
  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current) return;
    const s = store.getState();
    const idx = s.ethereum.activeIndex ?? 0;
    const imported = s.importedAccounts?.activeEvmAddress;
    const acct = imported
      ? s.ethereum.globalAddresses?.find(a => a.address?.toLowerCase() === imported.toLowerCase())
      : s.ethereum.globalAddresses?.[idx];
    if (!acct?.address) return;
    initDone.current = true;

    // Defer ALL network work until after React finishes rendering and animating.
    // Without this, RPC responses block the JS thread and freeze the UI.
    const handle = InteractionManager.runAfterInteractions(() => {
      const init = async () => {
        await dispatch(fetchPrices(allChainIds));
        await fetchTokenBalances();
        await fetchTransactions();
      };
      init();
    });
    return () => handle.cancel();
  }, [ethWalletAddress]);

  useEffect(() => {
    const interval = setInterval(fetchAndUpdatePricesInternal, FETCH_PRICES_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAndUpdatePricesInternal]);

  const mergedAndSortedTransactions = useMemo(() => {
    const ethTx = ethTransactions ?? [];
    const solTx = solTransactions ?? [];
    return [...solTx, ...ethTx]
      .filter((tx) => tx && tx.blockTime != null)
      .sort((a, b) => b.blockTime - a.blockTime)
      .slice(0, 30);
  }, [solTransactions, ethTransactions]);

  const renderTx = useCallback(({ item }: any) => {
    const sign = item.direction === "received" ? "+" : "-";
    return (
      <CryptoInfoCard
        icon=""
        title={capitalizeFirstLetter(item.direction)}
        caption={item.direction === "received" ? `From ${truncateWalletAddress(item.from)}` : `To ${truncateWalletAddress(item.to)}`}
        details={`${sign} ${item.value}`}
        onPress={() => WebBrowser.openBrowserAsync(`https://etherscan.io/tx/${item.hash}`)}
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
      <View style={contentContainerStyle}>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceText}>
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
      fontSize: sp(theme.fonts.sizes.small),
      color: theme.colors.lightGrey,
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    balanceText: {
      fontFamily: theme.fonts.families.openBold,
      fontSize: sp(theme.fonts.sizes.uberHuge),
      color: theme.colors.white,
      textAlign: "center",
      letterSpacing: -1,
    },
    dollarSign: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.families.openBold,
      fontSize: sp(theme.fonts.sizes.huge),
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
