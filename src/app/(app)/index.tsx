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
  font-size: ${(props) => props.theme.fonts.sizes.small};
  color: ${(props) => props.theme.colors.lightGrey};
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 8px;
`;

const BalanceText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.uberHuge};
  color: ${(props) => props.theme.colors.white};
  text-align: center;
  letter-spacing: -1px;
`;

const DollarSign = styled.Text<{ theme: ThemeType }>`
  color: ${(props) => props.theme.colors.primary};
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.huge};
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
  font-size: ${(props) => props.theme.fonts.sizes.header};
  color: ${(props) => props.theme.colors.white};
  letter-spacing: 0.3px;
  flex: 1;
`;

const SectionAction = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.small};
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
  font-size: ${(props) => props.theme.fonts.sizes.title};
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
  font-size: ${(props) => props.theme.fonts.sizes.small};
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
  font-size: ${(props) => props.theme.fonts.sizes.small};
  color: ${(props) => props.theme.colors.lightGrey};
`;

export default function Index() {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const theme = useTheme();
  const isLoading = useLoadingState();
  const networks = useSelector(
    (state: RootState) => state.ethereum.networks
  );

  const activeEthChainId = useSelector(
    (state: RootState) => state.ethereum.activeChainId
  );

  const activeEthIndex = useSelector(
    (state: RootState) => state.ethereum.activeIndex ?? 0
  );
  const ethAccount = useSelector((state: RootState) => {
    const index = state.ethereum.activeIndex ?? 0;
    return state.ethereum.globalAddresses?.[index];
  });

  const importedEvmAddress = useSelector((state: RootState) => state.importedAccounts?.activeEvmAddress);
  const importedSolAddress = useSelector((state: RootState) => state.importedAccounts?.activeSolAddress);
  const isImportedActive = !!importedEvmAddress || !!importedSolAddress;
  const ethWalletAddress = isImportedActive ? (importedEvmAddress || "") : (ethAccount?.address || "");
  const ethBalance = isImportedActive ? 0 : (ethAccount?.balanceByChain?.[activeEthChainId] ?? 0);
  const ethTransactions = isImportedActive ? [] : (ethAccount?.transactionMetadataByChain?.[activeEthChainId]?.transactions ?? []);
  const failedEthStatus = ethAccount?.statusByChain?.[activeEthChainId] === GeneralStatus.Failed;

  const ethereum = useSelector((s: RootState) => s.ethereum);
  const prices = useSelector((s: RootState) => s.price.data);

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
      const index = ethereum.activeIndex ?? 0;
      
      const account = importedEvmAddress ? { address: importedEvmAddress, balanceByChain: {}, statusByChain: {}, transactionMetadataByChain: {} } : ethereum.globalAddresses?.[index];
      if (!account) return;
      const price = prices?.[chainId]?.usd ?? 0;
      const balance = account.balanceByChain?.[chainId] ?? 0;
      const transactions = account.transactionMetadataByChain?.[chainId]?.transactions ?? [];
      const status = account.statusByChain?.[chainId] ?? GeneralStatus.Idle;

      list.push({
        key: `evm-${chainId}`,
        chainId,
        name: network.chainName,
        symbol: network.symbol,
        balance,
        usdValue: balance * price,
        address: account.address,
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
    return list;
  }, [ethereum, prices, networks, importedEvmAddress]);

  const activeSolIndex = useSelector(
    (state: RootState) => state.solana.activeIndex
  );
  const solWalletAddressSeed = useSelector(
    (state: RootState) => state.solana.addresses[activeSolIndex]?.address || ""
  );
  const solWalletAddress = isImportedActive ? (importedSolAddress || "") : solWalletAddressSeed;
  const solBalanceSeed = useSelector(
    (state: RootState) => state.solana.addresses[activeSolIndex]?.balance || 0
  );
  const solBalance = isImportedActive ? 0 : solBalanceSeed;
  const solTransactionsRaw = useSelector(
    (state: RootState) =>
      state.solana.addresses[activeSolIndex]?.transactionMetadata?.transactions || []
  );
  const solTransactions = isImportedActive ? [] : solTransactionsRaw;
  const failedSolStatus = useSelector(
    (state: RootState) =>
      (state.solana.addresses[activeSolIndex]?.status === GeneralStatus.Failed) || false
  );

  const snapPoints = useMemo(() => ["10%", "33%", "69%", "88%"], []);
  const solPrice = prices;
  const ethPrice = prices[activeEthChainId]?.usd;

  const [refreshing, setRefreshing] = useState(false);
  const [usdBalance, setUsdBalance] = useState(0);
  const [solUsd, setSolUsd] = useState(0);
  const [ethUsd, setEthUsd] = useState(0);
  const [bottomSheetIndex, setBottomSheetIndex, bottomSheetIndexLoading] =
    useStorage(SNAP_POINTS);

  const state = store.getState();
  const evmChainIds = Object.keys(state.ethereum.networks).map(Number);
  const allChainIds = [...evmChainIds, 101];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    dispatch(fetchPrices(allChainIds));
    fetchTokenBalances();
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, [dispatch, solWalletAddress, ethWalletAddress]);

  const fetchTokenBalances = useCallback(async () => {
    try {
      if (ethWalletAddress) {
        await dispatch(fetchEvmBalance({ chainId: activeEthChainId, address: ethWalletAddress }));
      }
      if (solWalletAddress) {
        await dispatch(fetchSolanaBalance(solWalletAddress));
      }
    } catch (err) {
      Alert.alert("Error", `Failed to fetch balances: ${err instanceof Error ? err.message : err}`);
      console.error(err);
    }
  }, [dispatch, activeEthChainId, ethWalletAddress, solWalletAddress]);

  const fetchTokenBalancesInterval = useCallback(async () => {
    if (ethWalletAddress) {
      dispatch(fetchEvmBalanceInterval({
        chainId: activeEthChainId,
        address: ethWalletAddress,
      }));
    }
    if (solWalletAddress) {
      dispatch(fetchSolanaBalanceInterval(solWalletAddress));
    }
  }, [ethBalance, solBalance, dispatch]);

  const updatePrices = () => {
    const ethUsd = ethWalletAddress ? (ethPrice ?? 0) * ethBalance : 0;
    const solUsd = solWalletAddress ? (prices[101]?.usd ?? 0) * solBalance : 0;
    setUsdBalance(ethUsd + solUsd);
    setEthUsd(ethUsd);
    setSolUsd(solUsd);
  };

  const _handlePressButtonAsync = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  const urlBuilder = (hash: string, asset: string) => {
    let url: string;
    if (asset.toLowerCase() === TICKERS.ethereum.toLowerCase()) {
      url = `https://sepolia.etherscan.io/tx/${hash}`;
    } else {
      url = `https://explorer.solana.com/?cluster=testnet/tx/${hash}`;
    }
    return url;
  };

  const renderTx = ({ item }: any) => {
    const sign = item.direction === "received" ? "+" : "-";
    return (
      <CryptoInfoCard
        icon=""
        title={capitalizeFirstLetter(item.direction)}
        caption={
          item.direction === "received"
            ? `From ${truncateWalletAddress(item.from)}`
            : `To ${truncateWalletAddress(item.to)}`
        }
        details={`${sign} ${item.value}`}
        onPress={() =>
          WebBrowser.openBrowserAsync(
            `https://etherscan.io/tx/${item.hash}`
          )
        }
      />
    );
  };

  const fetchTransactions = async () => {
    try {
      if (ethWalletAddress) {
        await dispatch(fetchEvmTransactions({ chainId: activeEthChainId, address: ethWalletAddress }));
      }
      if (solWalletAddress) {
        await dispatch(fetchSolanaTransactions(solWalletAddress));
      }
    } catch (err) {
      Alert.alert("Error", `Failed to fetch transactions: ${err instanceof Error ? err.message : err}`);
      console.error(err);
    }
  };

  const fetchTransactionsInterval = async () => {
    dispatch(fetchEvmTransactionsInterval({ chainId: activeEthChainId, address: ethWalletAddress }));
    dispatch(fetchSolanaTransactionsInterval(solWalletAddress));
  };

  const fetchBalanceAndPrice = async () => {
    try {
      await dispatch(fetchPrices(allChainIds));
      await fetchTokenBalances();
    } catch (err) {
      Alert.alert("Error", `Failed to fetch balances or prices: ${err instanceof Error ? err.message : err}`);
      console.error(err);
    }
  };

  const fetchBalanceAndPriceInterval = async () => {
    await dispatch(fetchPrices(allChainIds));
    await fetchTokenBalancesInterval();
  };

  const fetchAndUpdatePrices = async () => {
    if (ethWalletAddress && solWalletAddress) {
      await fetchBalanceAndPrice();
      await fetchTransactions();
    }
  };

  const fetchAndUpdatePricesInternal = async () => {
    if (solBalance && ethBalance) {
      await fetchBalanceAndPriceInterval();
      await fetchTransactionsInterval();
    }
  };

  const handleSheetChange = (index: number) => {
    setBottomSheetIndex(JSON.stringify(index));
  };

  useEffect(() => {
    const init = async () => {
      try {
        await fetchAndUpdatePrices();
      } catch (err) {
        Alert.alert("Error", `Initialization failed: ${err instanceof Error ? err.message : err}`);
        console.error(err);
      }
    };
    init();
  }, [dispatch, ethWalletAddress, solWalletAddress]);

  useEffect(() => {
    const interval = setInterval(
      fetchAndUpdatePricesInternal,
      FETCH_PRICES_INTERVAL
    );
    return () => clearInterval(interval);
  }, [dispatch, ethWalletAddress, solWalletAddress]);

  useEffect(() => {
    updatePrices();
  }, [ethBalance, solBalance, ethPrice, prices[101]?.usd]);

  const mergedAndSortedTransactions = useMemo(() => {
    const ethTx = ethTransactions ?? [];
    const solTx = solTransactions ?? [];
    return [...solTx, ...ethTx].filter((tx) => tx && tx.blockTime != null).sort((a, b) => b.blockTime - a.blockTime);
  }, [solTransactions, ethTransactions]);

  useEffect(() => {
    const initDidcomm = async () => {
      try {
        const result = await Didcomm.helloWorld();
      } catch (err) {
        console.error(err);
      }
    };
    initDidcomm();
  }, []);

  const totalAssets = ethereumAssets.length + 1;

  return (
    <SafeAreaContainer>
      <ContentContainer topInset={insets.top}>
        <BalanceContainer>
          <BalanceLabel>Total Balance</BalanceLabel>
          <BalanceText>
            <DollarSign>$</DollarSign>
            {formatDollarRaw(usdBalance)}
          </BalanceText>
        </BalanceContainer>

        <ActionContainer>
          <PrimaryButton
            icon={
              <SendIcon
                width={20}
                height={20}
                fill={theme.colors.primary}
              />
            }
            onPress={() => router.push(ROUTES.sendOptions)}
            btnText="Send"
            useGradient
          />
          <PrimaryButton
            icon={
              <ReceiveIcon
                width={20}
                height={20}
                fill={theme.colors.primary}
              />
            }
            onPress={() => router.push(ROUTES.receiveOptions)}
            btnText="Receive"
            variant="outline"
          />
        </ActionContainer>

        <SectionHeader>
          <SectionTitle>Recent Activity</SectionTitle>
          {mergedAndSortedTransactions.length > 0 && (
            <SectionAction>View All</SectionAction>
          )}
        </SectionHeader>

        <FlatList
          contentContainerStyle={{ gap: 8 }}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl
              tintColor={theme.colors.primary}
              titleColor={theme.colors.white}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          data={mergedAndSortedTransactions}
          renderItem={renderTx}
          keyExtractor={(item, index) =>
            `${item.hash ?? "no-hash"}-${item.direction ?? "no-dir"}-${index}`
          }
          ListEmptyComponent={<InfoBanner />}
        />

        {failedEthStatus && failedSolStatus && (
          <ErrorContainer>
            <ErrorText>
              ⚠️  Network error — please try again later
            </ErrorText>
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
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.4,
            shadowRadius: 20,
            elevation: 24,
          }}
          handleIndicatorStyle={{
            backgroundColor: theme.colors.muted,
            width: 40,
            height: 4,
            borderRadius: 2,
          }}
          handleStyle={{
            marginTop: 8,
            paddingVertical: 8,
          }}
        >
          <BottomScrollView>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 20, paddingLeft: 4 }}>
              <BottomSectionTitle>Assets</BottomSectionTitle>
              <AssetCountBadge>
                <AssetCountText>{totalAssets}</AssetCountText>
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
