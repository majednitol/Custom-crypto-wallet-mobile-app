import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { View, RefreshControl, FlatList, Platform, Alert } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import styled, { useTheme } from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import { ROUTES } from "../../constants/routes";
import type { ThemeType } from "../../styles/theme";
import { type RootState, type AppDispatch, store } from "../../store";
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
import { useLoadingState } from "../../hooks/redux";
import { GeneralStatus } from "../../store/types";
import { capitalizeFirstLetter } from "../../utils/capitalizeFirstLetter";
import { truncateWalletAddress } from "../../utils/truncateWalletAddress";
import { formatDollar, formatDollarRaw } from "../../utils/formatDollars";
import { useStorage } from "../../hooks/useStorageState";
import PrimaryButton from "../../components/PrimaryButton/PrimaryButton";
import SendIcon from "../../assets/svg/send.svg";
import ReceiveIcon from "../../assets/svg/receive.svg";
import CryptoInfoCard from "../../components/CryptoInfoCard/CryptoInfoCard";
import CryptoInfoCardSkeleton from "../../components/CryptoInfoCard/CryptoInfoCardSkeleton";
import { BlockchainIcon } from "../../components/BlockchainIcon/BlockchainIcon";
import { getChainIconSymbol } from "../../utils/getChainIconSymbol";
import { FETCH_PRICES_INTERVAL } from "../../constants/price";
import { TICKERS } from "../../constants/tickers";
import { SafeAreaContainer } from "../../components/Styles/Layout.styles";
import InfoBanner from "../../components/InfoBanner/InfoBanner";
import { SNAP_POINTS } from "../../constants/storage";
import { loadTokens } from "../../store/tokenSlice";
import { loadSolTokens } from "../../store/solTokenSlice";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Didcomm from "../../../native-modules/didcomm";
import { useRenderLog, measureTime } from "../../utils/PerformanceMonitor";

const ContentContainer = styled.View<{ theme: ThemeType; topInset: number }>`
  flex: 1;
  justify-content: flex-start;
  padding: ${(props) => props.theme.spacing.medium};
  margin-top: ${(props) => props.topInset + 20}px;
`;

const BalanceContainer = styled.View<{ theme: ThemeType }>`
  align-items: center;
  margin-bottom: ${(props) => props.theme.spacing.large};
`;

const BalanceLabel = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => parseFloat(props.theme.fonts.sizes.small)};
  color: ${(props) => props.theme.colors.lightGrey};
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 8px;
`;

const BalanceText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => parseFloat(props.theme.fonts.sizes.uberHuge)};
  color: ${(props) => props.theme.colors.white};
  text-align: center;
  letter-spacing: -1px;
`;

const DollarSign = styled.Text<{ theme: ThemeType }>`
  color: ${(props) => props.theme.colors.primary};
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => parseFloat(props.theme.fonts.sizes.huge)};
  text-align: center;
`;

const ActionContainer = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-bottom: ${(props) => props.theme.spacing.large};
  gap: 10px;
`;

const SectionHeader = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${(props) => props.theme.spacing.medium};
  margin-top: ${(props) => props.theme.spacing.small};
`;

const SectionTitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => parseFloat(props.theme.fonts.sizes.header)};
  color: ${(props) => props.theme.colors.white};
  letter-spacing: 0.3px;
  flex: 1;
`;

const SectionAction = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => parseFloat(props.theme.fonts.sizes.small)};
  color: ${(props) => props.theme.colors.primary};
  flex-shrink: 0;
  margin-left: ${(props) => props.theme.spacing.small};
`;

const CryptoInfoCardContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  flex-direction: column;
  width: 100%;
`;

const CardView = styled.View<{ theme: ThemeType }>`
  margin-bottom: ${(props) => props.theme.spacing.small};
  width: 100%;
`;

const BottomSectionTitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => parseFloat(props.theme.fonts.sizes.title)};
  color: ${(props) => props.theme.colors.white};
  margin-bottom: ${(props) => props.theme.spacing.medium};
  margin-left: ${(props) => props.theme.spacing.small};
  letter-spacing: 0.3px;
  flex: 1;
`;

const BottomScrollView = styled(BottomSheetScrollView) <{ theme: ThemeType }>`
  padding: ${(props) => props.theme.spacing.tiny};
  padding-top: ${(props) => props.theme.spacing.small};
`;

const ErrorContainer = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  background-color: rgba(255, 77, 79, 0.15);
  border: 1px solid rgba(255, 77, 79, 0.3);
  border-radius: ${(props) => props.theme.borderRadius.medium};
  height: 56px;
  padding: ${(props) => props.theme.spacing.medium};
  margin-top: ${(props) => props.theme.spacing.medium};
`;

const ErrorText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => parseFloat(props.theme.fonts.sizes.small)};
  color: ${(props) => props.theme.colors.error};
`;

const AssetCountBadge = styled.View<{ theme: ThemeType }>`
  background-color: ${(props) => props.theme.colors.cardBackground};
  border-radius: ${(props) => props.theme.borderRadius.pill};
  padding-horizontal: 10px;
  padding-vertical: 4px;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const AssetCountText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => parseFloat(props.theme.fonts.sizes.small)};
  color: ${(props) => props.theme.colors.lightGrey};
`;

export default function Index() {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const theme = useTheme();
  useRenderLog("DashboardIndex");
  const isLoading = useLoadingState();

  // Consolidate selectors to avoid multiple re-renders
  const { ethereum, prices, solana, importedAccounts } = useSelector((s: RootState) => ({
    ethereum: s.ethereum,
    prices: s.price.data,
    solana: s.solana,
    importedAccounts: s.importedAccounts
  }));

  const { networks, activeChainId, globalAddresses, activeIndex } = ethereum;
  const { activeEvmAddress, activeSolAddress } = importedAccounts;
  const isImportedActive = !!activeEvmAddress || !!activeSolAddress;

  const currentEvmAccount = useMemo(() => {
    if (isImportedActive && activeEvmAddress) {
      return globalAddresses?.find(a => a.address?.toLowerCase() === activeEvmAddress.toLowerCase()) ?? { address: activeEvmAddress, balanceByChain: {}, statusByChain: {}, transactionMetadataByChain: {} };
    }
    return globalAddresses?.[activeIndex ?? 0];
  }, [globalAddresses, activeIndex, isImportedActive, activeEvmAddress]);

  const ethWalletAddress = currentEvmAccount?.address || "";
  const ethBalance = currentEvmAccount?.balanceByChain?.[activeChainId] ?? 0;
  const ethTransactions = currentEvmAccount?.transactionMetadataByChain?.[activeChainId]?.transactions ?? [];
  const failedEthStatus = currentEvmAccount?.statusByChain?.[activeChainId] === GeneralStatus.Failed;

  const currentSolAccount = useMemo(() => {
    if (isImportedActive && activeSolAddress) {
      return solana.addresses?.find(a => a.address === activeSolAddress);
    }
    return solana.addresses[solana.activeIndex];
  }, [solana.addresses, solana.activeIndex, isImportedActive, activeSolAddress]);

  const solWalletAddress = currentSolAccount?.address || "";
  const solBalance = currentSolAccount?.balanceByChain?.[101] ?? currentSolAccount?.balance ?? 0;
  const solTransactions = currentSolAccount?.transactionMetadata?.transactions || [];
  const failedSolStatus = currentSolAccount?.status === GeneralStatus.Failed;

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

  const ethereumAssets = useMemo(() => {
    const list: any[] = [];
    Object.values(networks).forEach((network) => {
      const chainId = network.chainId;
      const price = prices?.[chainId]?.usd ?? 0;
      const balance = currentEvmAccount?.balanceByChain?.[chainId] ?? 0;
      const transactions = currentEvmAccount?.transactionMetadataByChain?.[chainId]?.transactions ?? [];
      const status = currentEvmAccount?.statusByChain?.[chainId] ?? GeneralStatus.Idle;

      list.push({
        key: `evm-${chainId}`,
        chainId,
        name: network.chainName,
        symbol: network.symbol,
        balance,
        usdValue: balance * price,
        address: ethWalletAddress,
        transactions,
        status,
        icon: (
          <BlockchainIcon
            symbol={getChainIconSymbol(network.chainName, network.symbol, network.chainId)}
            chainId={network.chainId}
            chainName={network.chainName}
            size={35}
          />
        ),
      });
    });
    return list.sort((a, b) => b.usdValue - a.usdValue);
  }, [networks, prices, currentEvmAccount, ethWalletAddress]);

  const { totalUsdBalance, solUsd } = useMemo(() => {
    const evmTotal = ethereumAssets.reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0);
    const solUsdVal = (prices[101]?.usd ?? 0) * solBalance;
    return {
      totalUsdBalance: evmTotal + solUsdVal,
      solUsd: solUsdVal
    };
  }, [ethereumAssets, solBalance, prices]);

  const evmChainIds = useMemo(() => Object.keys(networks).map(Number), [networks]);
  const allChainIds = useMemo(() => [...evmChainIds, 101], [evmChainIds]);

  const fetchTokenBalances = useCallback(async () => {
    await measureTime("fetchTokenBalances", async () => {
      if (ethWalletAddress) {
        await Promise.all(evmChainIds.map(cid => 
          dispatch(fetchEvmBalance({ chainId: cid, address: ethWalletAddress }))
        ));
      }
      if (solWalletAddress) {
        await dispatch(fetchSolanaBalance(solWalletAddress));
      }
    });
  }, [dispatch, evmChainIds, ethWalletAddress, solWalletAddress]);

  const fetchTransactions = useCallback(async () => {
    await measureTime("fetchTransactions", async () => {
      if (ethWalletAddress) {
        await dispatch(fetchEvmTransactions({ chainId: activeChainId, address: ethWalletAddress }));
      }
      if (solWalletAddress) {
        await dispatch(fetchSolanaTransactions(solWalletAddress));
      }
    });
  }, [dispatch, activeChainId, ethWalletAddress, solWalletAddress]);

  const fetchAndUpdatePricesInternal = useCallback(async () => {
    await dispatch(fetchPrices(allChainIds));
    if (ethWalletAddress) {
      dispatch(fetchEvmBalanceInterval({ chainId: activeChainId, address: ethWalletAddress }));
      dispatch(fetchEvmTransactionsInterval({ chainId: activeChainId, address: ethWalletAddress }));
    }
    if (solWalletAddress) {
      dispatch(fetchSolanaBalanceInterval(solWalletAddress));
      dispatch(fetchSolanaTransactionsInterval(solWalletAddress));
    }
  }, [dispatch, allChainIds, ethWalletAddress, activeChainId, solWalletAddress]);

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

  useEffect(() => {
    const init = async () => {
      await dispatch(fetchPrices(allChainIds));
      await fetchTokenBalances();
      await fetchTransactions();
    };
    init();
  }, [dispatch, ethWalletAddress, solWalletAddress]);

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

  const handleSheetChange = useCallback((index: number) => {
    setBottomSheetIndex(JSON.stringify(index));
  }, [setBottomSheetIndex]);

  useEffect(() => {
    const initDidcomm = async () => {
      try {
        await Didcomm.helloWorld();
      } catch (err) {
        console.error("Didcomm error:", err);
      }
    };
    initDidcomm();
  }, []);

  return (
    <SafeAreaContainer>
      <ContentContainer topInset={insets.top}>
        <BalanceContainer>
          <BalanceLabel>Total Balance</BalanceLabel>
          <BalanceText>
            <DollarSign>$</DollarSign>
            {formatDollarRaw(totalUsdBalance)}
          </BalanceText>
        </BalanceContainer>

        <ActionContainer>
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
        </ActionContainer>

        <SectionHeader>
          <SectionTitle>Recent Activity</SectionTitle>
          {mergedAndSortedTransactions.length > 0 && <SectionAction>View All</SectionAction>}
        </SectionHeader>

        <FlatList
          contentContainerStyle={{ gap: 8 }}
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          windowSize={3}
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
          <ErrorContainer>
            <ErrorText>⚠️ Network error — please try again later</ErrorText>
          </ErrorContainer>
        )}
      </ContentContainer>

      {!bottomSheetIndexLoading && (
        <BottomSheet
          ref={sheetRef}
          index={bottomSheetIndex !== null ? parseInt(bottomSheetIndex) : 1}
          onChange={handleSheetChange}
          snapPoints={snapPoints}
          backgroundStyle={{
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            backgroundColor: theme.colors.lightDark,
          }}
          handleIndicatorStyle={{ backgroundColor: theme.colors.muted, width: 40 }}
        >
          <BottomScrollView>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16 }}>
              <BottomSectionTitle>Assets</BottomSectionTitle>
              <AssetCountBadge>
                <AssetCountText>{ethereumAssets.length + 1}</AssetCountText>
              </AssetCountBadge>
            </View>
            
            <CryptoInfoCardContainer>
              {ethereumAssets.map((asset) => (
                <CardView key={asset.key}>
                  <CryptoInfoCard
                    onPress={() => {
                      handleSelectChain(asset.chainId, asset.address);
                      router.push({
                        pathname: `/token/${asset.name.toLowerCase()}`,
                        params: {
                          asset: JSON.stringify({
                            symbol: asset.symbol.toUpperCase(),
                            numberOfTokens: asset.balance,
                            chainId: asset.chainId,
                            address: asset.address,
                            price: prices[asset.chainId]?.usd ?? 0,
                          }),
                        },
                      });
                    }}
                    title={asset.name}
                    caption={`${asset.balance} ${asset.symbol}`}
                    details={formatDollar(asset.usdValue)}
                    icon={asset.icon}
                    hideBackground
                  />
                </CardView>
              ))}

              <CardView>
                <CryptoInfoCard
                  onPress={() => router.push({
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
                  })}
                  title="Solana"
                  caption={`${solBalance} SOL`}
                  details={formatDollar(solUsd)}
                  icon={<BlockchainIcon symbol="SOL" size={25} />}
                  hideBackground
                />
              </CardView>
            </CryptoInfoCardContainer>
          </BottomScrollView>
        </BottomSheet>
      )}
    </SafeAreaContainer>
  );
}
