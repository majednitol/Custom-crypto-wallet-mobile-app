import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  Text,
  TouchableOpacity,
  Dimensions,
  Clipboard,
} from "react-native";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { router, useLocalSearchParams } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import * as WebBrowser from "expo-web-browser";
import Toast from "react-native-toast-message";
import { LineChart } from "react-native-chart-kit";
import type { ThemeType } from "../../../styles/theme";
import type { RootState, AppDispatch } from "../../../store";
import { KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from "react-native";

import { useLoadingState } from "../../../hooks/redux";
import { capitalizeFirstLetter } from "../../../utils/capitalizeFirstLetter";
import { formatDollar } from "../../../utils/formatDollars";
import { placeholderArr } from "../../../utils/placeholder";
import { Chains, GenericTransaction } from "../../../types";
import { GeneralStatus } from "../../../store/types";
import { truncateWalletAddress } from "../../../utils/truncateWalletAddress";
import SendIcon from "../../../assets/svg/send.svg";
import ReceiveIcon from "../../../assets/svg/receive.svg";
import { BlockchainIcon } from "../../../components/BlockchainIcon/BlockchainIcon";
import { getChainIconSymbol } from "../../../utils/getChainIconSymbol";
import CryptoInfoCard from "../../../components/CryptoInfoCard/CryptoInfoCard";
import CryptoInfoCardSkeleton from "../../../components/CryptoInfoCard/CryptoInfoCardSkeleton";
import PrimaryButton from "../../../components/PrimaryButton/PrimaryButton";
import { SafeAreaContainer } from "../../../components/Styles/Layout.styles";
import {
  ErrorContainer,
  ErrorText,
} from "../../../components/Styles/Errors.styles";
import { addToken, fetchTokenErc20Balance } from "../../../store/tokenSlice";

import Nfts from "../../(wallet)/nfts/nft";
import { addSolToken, fetchSplTokenBalance } from "../../../store/solTokenSlice";
import TokenDetailTabs, { type TabType } from "../../../components/TokenDetailTabs/TokenDetailTabs";
import { fetchMarketData, fetchChartData } from "../../../store/priceSlice";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Stable empty references — selectors return these instead of creating new [] or {}
// which would trigger React's "selector returned different result" warning
const EMPTY_ARRAY: any[] = [];
const EMPTY_OBJ: Record<string, any> = {};

// ═══════════════════════════════════════════════════════════
// STYLED COMPONENTS
// ═══════════════════════════════════════════════════════════

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: flex-start;
  padding: ${(props) => props.theme.spacing.medium};
  margin-top: ${(props) => (Platform.OS === "android" ? "40px" : "0px")};
`;

const ChainLogoContainer = styled.View`
  align-items: center;
  margin-vertical: 16px;
`;

const BalanceText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: 32px;
  color: ${(props) => props.theme.colors.white};
  text-align: center;
`;

const MarketPriceText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: 14px;
  color: ${(props) => props.theme.colors.lightGrey};
  text-align: center;
  margin-top: 8px;
`;

const PriceChangeText = styled.Text<{ positive: boolean; theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: 14px;
  color: ${({ positive, theme }) =>
    positive ? "#4ade80" : "#ef4444"};
`;

const TimeSelectorContainer = styled.View`
  flex-direction: row;
  justify-content: center;
  margin-top: 16px;
  margin-bottom: 8px;
`;

const TimeButton = styled.TouchableOpacity<{ active: boolean; theme: ThemeType }>`
  padding-horizontal: 16px;
  padding-vertical: 8px;
  margin-horizontal: 4px;
  border-radius: 8px;
  background-color: ${({ active, theme }) =>
    active ? theme.colors.primary : "transparent"};
`;

const TimeButtonText = styled.Text<{ active: boolean; theme: ThemeType }>`
  font-family: ${({ theme }) => theme.fonts.families.openBold};
  font-size: 12px;
  color: ${({ active, theme }) =>
    active ? theme.colors.dark : theme.colors.grey};
`;

const SectionTitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: 20px;
  color: ${(props) => props.theme.colors.white};
  margin-top: 24px;
  margin-bottom: 12px;
`;

const StatRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-vertical: 12px;
  border-bottom-width: 1px;
  border-bottom-color: rgba(255, 255, 255, 0.06);
`;

const StatLabel = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: 14px;
  color: ${(props) => props.theme.colors.grey};
`;

const StatValue = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: 14px;
  color: ${(props) => props.theme.colors.white};
`;

const AddressRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-vertical: 16px;
  border-top-width: 1px;
  border-top-color: rgba(255, 255, 255, 0.06);
  margin-top: 8px;
`;

const AddressValue = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: 14px;
  color: ${(props) => props.theme.colors.white};
`;

const ActionContainer = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-top: 16px;
  margin-bottom: 24px;
`;

const NoChartText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: 14px;
  color: ${(props) => props.theme.colors.grey};
  text-align: center;
  margin-vertical: 40px;
`;

const AddTokenButton = styled.TouchableOpacity<{ theme: ThemeType }>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.cardBackground};
  border: 1px dashed ${({ theme }) => theme.colors.primary};
  border-radius: 16px;
  padding: 16px;
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  width: 100%;
`;

const AddTokenIcon = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: 22px;
  color: ${({ theme }) => theme.colors.primary};
  margin-right: 10px;
`;

const AddTokenText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${({ theme }) => theme.colors.primary};
`;

const FilterContainer = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  padding-right: ${(props) => props.theme.spacing.medium};
  padding-left: ${(props) => props.theme.spacing.medium};
  width: 100%;
  margin-bottom: ${(props) => props.theme.spacing.small};
  margin-top: 12px;
`;

const FilterButton = styled.TouchableOpacity<{
  theme: ThemeType;
  highlighted: boolean;
}>`
  background-color: ${({ theme, highlighted }) => {
    return highlighted ? theme.colors.primary : theme.colors.dark;
  }};
  height: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 35px;
  border-radius: 8px;
  margin-right: 5px;
  padding: 0 20px;
`;

const FilterText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.white};
  text-align: center;
`;

const EmptyText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.header};
  color: ${(props) => props.theme.colors.lightGrey};
  text-align: center;
  margin-top: 40px;
`;

enum FilterTypes {
  ALL,
  RECEIVE,
  SENT,
}

// ═══════════════════════════════════════════════════════════
// CHART CONFIG
// ═══════════════════════════════════════════════════════════

const CHART_CONFIG = {
  backgroundColor: "transparent",
  backgroundGradientFrom: "transparent",
  backgroundGradientTo: "transparent",
  decimalPlaces: 4,
  color: () => "#ef4444",
  labelColor: () => "#8b8b8b",
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: "0",
  },
  propsForBackgroundLines: {
    stroke: "rgba(255,255,255,0.06)",
  },
};

const TIME_PERIODS = [
  { label: "1D", value: "1" },
  { label: "1W", value: "7" },
  { label: "1M", value: "30" },
  { label: "3M", value: "90" },
  { label: "1Y", value: "365" },
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

// Header component for chain name
const HeaderTitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: 18px;
  color: ${(props) => props.theme.colors.white};
  text-align: center;
  flex: 1;
`;

const FloatingButtonContainer = styled.View`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  flex-direction: row;
  justify-content: space-between;
  z-index: 100;
  gap: 12px;
  background-color: ${({ theme }) => theme.colors.darker};
  padding-horizontal: 16px;
  padding-vertical: 16px;
  border-top-width: 1px;
  border-top-color: rgba(255, 255, 255, 0.06);
`;



const FloatingButton = styled.TouchableOpacity<{ theme: ThemeType; variant?: "send" | "receive" }>`
  flex: 1;
  height: 50px;
  border-radius: 16px;
  background-color: ${({ variant, theme }) =>
    variant === "send" ? theme.colors.primary : "transparent"};
  border-width: ${({ variant }) => (variant === "receive" ? 1 : 0)}px;
  border-color: ${({ variant, theme }) =>
    variant === "receive" ? theme.colors.primary : theme.colors.white};
  justify-content: center;
  align-items: center;
`;


const FloatingButtonText = styled.Text<{ variant?: "send" | "receive"; theme: ThemeType }>`
  font-family: ${({ theme }) => theme.fonts.families.openBold};
  font-size: 16px;
  color: ${({ variant, theme }) =>
    variant === "send" ? theme.colors.dark : theme.colors.white};
`;

export default function Index() {
  const dispatch = useDispatch<AppDispatch>();
  const { id, asset } = useLocalSearchParams();
  const assetObj = asset ? JSON.parse(asset as string) : null;

  const symbol = assetObj?.symbol;
  const numberOfTokens = assetObj?.numberOfTokens ?? 0;
  const chainId = assetObj?.chainId;
  const price = assetObj?.price ?? 0;

  const theme = useTheme();
  const isStateLoading = useLoadingState();
  const chainName = id as string;

  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [selectedPeriod, setSelectedPeriod] = useState("1");
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(FilterTypes.ALL);
  const [erc20ModalVisible, setErc20ModalVisible] = useState(false);
  const [erc20Contract, setErc20Contract] = useState("");

  // Use chainId from route params (the actual chain being viewed)
  const activeChainId = chainId ?? useSelector(
    (state: RootState) => state.ethereum.activeChainId
  );

  const isSecureChain = chainId === 34 || chainId === 3434;

  const erc20Tokens = useSelector(
    (state: RootState) =>
      state.erc20.trackedTokens?.filter((t) => t.chainId === activeChainId) ?? EMPTY_ARRAY,
    shallowEqual
  );

  const erc20Balances = useSelector(
    (state: RootState) => state.erc20?.balances ?? EMPTY_OBJ
  );

  const solTrackedTokens = useSelector(
    (state: RootState) => state.solToken.trackedTokens
  );

  const solBalances = useSelector(
    (state: RootState) => state.solToken.balances
  );

  const tokenAddress = useSelector((state: RootState) => {
    const isSolana = chainName === "solana";
    if (isSolana) {
      const activeIndex = state.solana.activeIndex ?? 0;
      const importedSol = state.importedAccounts?.activeSolAddress;
      if (importedSol) return importedSol;
      return state.solana.addresses?.[activeIndex]?.address ?? "";
    }
    // EVM
    const importedEvm = state.importedAccounts?.activeEvmAddress;
    if (importedEvm) return importedEvm;
    const activeIndex = state.ethereum.activeIndex ?? 0;
    return state.ethereum.globalAddresses?.[activeIndex]?.address ?? "";
  });

  // Market Data
  const marketData = useSelector(
    (state: RootState) => state.price.marketData[activeChainId]
  );
  const chartData = useSelector(
    (state: RootState) => state.price.chartData[`${activeChainId}:${selectedPeriod}`]
  );

  // Transaction history
  const transactionHistory = useSelector((state: RootState) => {
    if (!chainName) return EMPTY_ARRAY;
    const isSolana = chainName === "solana";
    if (isSolana) {
      const activeIndex = state.solana.activeIndex ?? 0;
      const importedSol = state.importedAccounts?.activeSolAddress;
      const account = importedSol
        ? state.solana.addresses?.find(a => a.address === importedSol)
        : state.solana.addresses?.[activeIndex];
      return account?.transactionMetadata?.transactions ?? EMPTY_ARRAY;
    }
    const importedEvm = state.importedAccounts?.activeEvmAddress;
    const activeIndex = state.ethereum.activeIndex ?? 0;
    const account = importedEvm
      ? state.ethereum.globalAddresses?.find(a => a.address?.toLowerCase() === importedEvm.toLowerCase())
      : state.ethereum.globalAddresses?.[activeIndex];
    return account?.transactionMetadataByChain?.[activeChainId]?.transactions ?? EMPTY_ARRAY;
  }, shallowEqual);

  const failedStatus = useSelector((state: RootState) => {
    if (!chainName) return false;
    const isSolana = chainName === "solana";
    if (isSolana) {
      const activeIndex = state.solana.activeIndex ?? 0;
      const account = state.solana.addresses?.[activeIndex];
      return account?.status === GeneralStatus.Failed;
    }
    const activeIndex = state.ethereum.activeIndex ?? 0;
    const account = state.ethereum.globalAddresses?.[activeIndex];
    return account?.statusByChain?.[activeChainId] === GeneralStatus.Failed;
  });

  const isSolana = chainName === Chains.Solana;
  const isEvm = !isSolana && chainName !== "";

  // Fetch market data + chart on mount / period change
  useEffect(() => {
    if (chainId && activeTab === "info") {
      console.log("[id.tsx] Fetching data for chainId:", chainId, "price from assetObj:", price);
      dispatch(fetchMarketData(Number(chainId)));
      dispatch(fetchChartData({ chainId: Number(chainId), days: selectedPeriod }));
    }
  }, [chainId, selectedPeriod, activeTab, dispatch]);

  // Debug: log marketData when it changes
  useEffect(() => {
    console.log("[id.tsx] marketData updated:", marketData ? {
      price: marketData.price,
      marketCap: marketData.marketCap,
      totalVolume: marketData.totalVolume,
      ath: marketData.ath,
      atl: marketData.atl,
    } : "undefined");
  }, [marketData]);

  // Debug: log chartData when it changes
  useEffect(() => {
    const key = `${chainId}:${selectedPeriod}`;
    console.log("[id.tsx] chartData updated for key:", key, "hasData:", !!chartData, "points:", chartData?.prices?.length ?? 0);
  }, [chartData, chainId, selectedPeriod]);

  // Fetch token balances
  useEffect(() => {
    if (!tokenAddress || !erc20Tokens.length) return;
    erc20Tokens.forEach((t) => {
      dispatch(
        fetchTokenErc20Balance({
          chainId: t.chainId,
          token: t.token,
          wallet: tokenAddress,
        })
      );
    });
  }, [erc20Tokens, tokenAddress, dispatch]);

  useEffect(() => {
    if (!tokenAddress || !solTrackedTokens.length || !isSolana) return;
    solTrackedTokens.forEach((t) => {
      dispatch(fetchSplTokenBalance({ mint: t.mint, wallet: tokenAddress }));
    });
  }, [solTrackedTokens, tokenAddress, isSolana, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (chainId) {
      dispatch(fetchMarketData(Number(chainId)));
      dispatch(fetchChartData({ chainId: Number(chainId), days: selectedPeriod }));
    }
    setTimeout(() => setRefreshing(false), 2000);
  }, [chainId, selectedPeriod, dispatch]);

  const handleCopyAddress = () => {
    Clipboard.setString(tokenAddress);
    Toast.show({ type: "success", text1: "Address copied to clipboard" });
  };

  const urlBuilder = (hash: string) => {
    if (isEvm) {
      return `https://sepolia.etherscan.io/tx/${hash}`;
    }
    return `https://explorer.solana.com/tx/${hash}`;
  };

  // ═══════════════════════════════════════════════════════════
  // INFO TAB CONTENT
  // ═══════════════════════════════════════════════════════════

  const renderInfoTab = () => {
    const md = marketData;
    const displayPrice = md?.price ?? price ?? 0;
    const priceChangePct = md?.priceChangePercentage24h ?? 0;
    const isPositive = priceChangePct >= 0;

    // Chart data
    const chartPrices = chartData?.prices ?? [];
    const hasChartData = chartPrices.length > 1;

    const chartDataset = hasChartData
      ? {
        labels: chartPrices
          .filter((_: any, i: number) => i % Math.ceil(chartPrices.length / 5) === 0)
          .map(() => ""),
        datasets: [
          {
            data: chartPrices.map((p: any) => p.price),
          },
        ],
      }
      : null;

    return (
      <>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.white}
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <ContentContainer>
            {/* Chain Logo */}
            <ChainLogoContainer>
              <BlockchainIcon
                symbol={getChainIconSymbol(chainName, symbol, chainId)}
                chainId={chainId}
                chainName={chainName}
                size={60}
              />
            </ChainLogoContainer>

            {/* Balance */}
            <BalanceText>
              {numberOfTokens} {isSolana ? "SOL" : symbol}
            </BalanceText>

            {/* Market Price */}
            <MarketPriceText>
              Market Price:{" "}
              {formatDollar(displayPrice)}USD{" "}
              <PriceChangeText positive={isPositive}>
                ({isPositive ? "+" : ""}
                {priceChangePct.toFixed(3)}%)
              </PriceChangeText>
            </MarketPriceText>

            {/* Chart */}
            {hasChartData && chartDataset ? (
              <LineChart
                data={chartDataset}
                width={SCREEN_WIDTH - 32}
                height={200}
                chartConfig={CHART_CONFIG}
                bezier
                withInnerLines={true}
                withOuterLines={false}
                withVerticalLabels={false}
                withHorizontalLabels={true}
                style={{ marginTop: 16 }}
              />
            ) : (
              <NoChartText>No chart data available</NoChartText>
            )}

            {/* Time period selectors - ALWAYS visible */}
            <TimeSelectorContainer>
              {TIME_PERIODS.map((period) => (
                <TimeButton
                  key={period.value}
                  active={selectedPeriod === period.value}
                  onPress={() => setSelectedPeriod(period.value)}
                >
                  <TimeButtonText active={selectedPeriod === period.value}>
                    {period.label}
                  </TimeButtonText>
                </TimeButton>
              ))}
            </TimeSelectorContainer>

            {/* Stats - HIDDEN for SecureChain */}
            {!isSecureChain && (
              <>
                <SectionTitle>Stats</SectionTitle>
                {[
                  { label: "Market Cap", value: md?.marketCap ? `$${(md.marketCap / 1e9).toFixed(3)}B USD` : "$0.00" },
                  { label: "Current Volume", value: md?.totalVolume ? `$${(md.totalVolume / 1e6).toFixed(2)}M USD` : "$0.00" },
                  { label: "Max Volume", value: md?.totalVolume ? `$${(md.totalVolume / 1e6).toFixed(2)}M USD` : "$0.00" },
                  { label: "1 Year Low", value: md?.atl ? `$${md.atl.toFixed(2)}USD` : "$0.00" },
                  { label: "1 Year High", value: md?.ath ? `$${md.ath.toFixed(2)}USD` : "$0.00" },
                ].map((stat) => (
                  <StatRow key={stat.label}>
                    <StatLabel>{stat.label}</StatLabel>
                    <StatValue>{stat.value}</StatValue>
                  </StatRow>
                ))}
              </>
            )}

            {/* Address */}
            <AddressRow>
              <StatLabel>Address</StatLabel>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <AddressValue>{truncateWalletAddress(tokenAddress)}</AddressValue>
                <TouchableOpacity onPress={handleCopyAddress} style={{ marginLeft: 8 }}>
                  <Text style={{ color: theme.colors.primary, fontSize: 18 }}>📋</Text>
                </TouchableOpacity>
              </View>
            </AddressRow>
          </ContentContainer>
        </ScrollView>

        {/* Floating Send/Receive Buttons */}
        <FloatingButtonContainer>
          <FloatingButton
            variant="send"
            onPress={() =>
              router.push({
                pathname: `token/send/${chainName}`,
                params: {
                  chainId: activeChainId,
                  solAddess: assetObj?.address,
                  nativeTokenSymbol: symbol,
                },
              })
            }
          >
            <FloatingButtonText variant="send">Send</FloatingButtonText>
          </FloatingButton>
          <FloatingButton
            variant="receive"
            onPress={() => router.push(`token/receive/${chainName}`)}
          >
            <FloatingButtonText>Receive</FloatingButtonText>
          </FloatingButton>
        </FloatingButtonContainer>
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // ACTIVITY TAB CONTENT
  // ═══════════════════════════════════════════════════════════

  const filteredTransactions = useMemo(() => {
    switch (filter) {
      case FilterTypes.RECEIVE:
        return transactionHistory.filter((item) => item?.direction === "received");
      case FilterTypes.SENT:
        return transactionHistory.filter((item) => item?.direction === "sent");
      default:
        return transactionHistory;
    }
  }, [transactionHistory, filter]);

  const renderTransactionItem = ({ item }: { item: any }) => {
    if (isStateLoading) {
      return <CryptoInfoCardSkeleton hideBackground={true} />;
    }
    if (failedStatus) {
      return (
        <ErrorContainer>
          <ErrorText>There seems to be a network error, please try again later</ErrorText>
        </ErrorContainer>
      );
    }
    if (!item) return null;

    const sign = item.direction === "received" ? "+" : "-";
    return (
      <CryptoInfoCard
        onPress={() => _handlePressButtonAsync(urlBuilder(item.hash))}
        title={capitalizeFirstLetter(item.direction)}
        caption={`To ${truncateWalletAddress(item.to)}`}
        details={`${sign} ${item.value} ${item.asset}`}
        icon={<BlockchainIcon symbol={isSolana ? "sol" : item.asset} size={35} />}
      />
    );
  };

  const _handlePressButtonAsync = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  const renderActivityTab = () => {
    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.white} />
        }
      >
        <ContentContainer>
          <FilterContainer>
            <FilterButton
              onPress={() => !isStateLoading && setFilter(FilterTypes.ALL)}
              highlighted={filter === FilterTypes.ALL}
            >
              <FilterText>All</FilterText>
            </FilterButton>
            <FilterButton
              onPress={() => !isStateLoading && setFilter(FilterTypes.RECEIVE)}
              highlighted={filter === FilterTypes.RECEIVE}
            >
              <FilterText>Received</FilterText>
            </FilterButton>
            <FilterButton
              onPress={() => !isStateLoading && setFilter(FilterTypes.SENT)}
              highlighted={filter === FilterTypes.SENT}
            >
              <FilterText>Sent</FilterText>
            </FilterButton>
          </FilterContainer>

          {filteredTransactions.length === 0 && !isStateLoading && (
            <EmptyText>
              {isSolana
                ? `Add some ${symbol} to your wallet`
                : `Add some ${symbol} to your wallet`}
            </EmptyText>
          )}

          {filteredTransactions.map((item, index) => (
            <View key={`${item?.uniqueId ?? index}-${item?.hash ?? index}`}>
              {renderTransactionItem({ item })}
            </View>
          ))}
        </ContentContainer>
      </ScrollView>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // TOKEN TAB CONTENT
  // ═══════════════════════════════════════════════════════════

  const renderTokenTab = () => {
    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.white} />
        }
      >
        <ContentContainer>
          <AddTokenButton onPress={() => setErc20ModalVisible(true)}>
            <AddTokenIcon>+</AddTokenIcon>
            <AddTokenText>Add New Token</AddTokenText>
          </AddTokenButton>

          {/* ERC-20 Tokens */}
          {erc20Tokens?.map((t) => {
            const key = `${t.chainId}:${t.token.toLowerCase()}`;
            const data = erc20Balances[key];
            if (!data) return null;
            return (
              <CryptoInfoCard
                key={key}
                title={data.name}
                caption={data.symbol}
                details={`${data.balance} ${data.symbol}`}
                onPress={() =>
                  router.push({
                    pathname: `token/send/${data.name}`,
                    params: {
                      chainId: t.chainId,
                      token: t.token,
                      balance: data.balance,
                      symbol: data.symbol,
                      erc20tokenAddress: t.token,
                      Erc20TokenName: data.name,
                    },
                  })
                }
                icon={<BlockchainIcon symbol={data.symbol} size={35} />}
              />
            );
          })}

          {/* SPL Tokens */}
          {isSolana &&
            solTrackedTokens.map((t) => {
              const data = solBalances[t.mint];
              return (
                <CryptoInfoCard
                  key={`sol-${t.mint}`}
                  title={data ? `${data.amount}` : "0"}
                  caption={`Mint: ${t.mint.slice(0, 12)}...`}
                  details={data ? `Dec: ${data.decimals}` : "Tap to setup"}
                  icon={<BlockchainIcon symbol="sol" size={35} />}
                  onPress={() =>
                    router.push({
                      pathname: `token/send/solana`,
                      params: {
                        mint: t.mint,
                        balance: data?.amount ?? 0,
                        decimals: data?.decimals ?? 0,
                      },
                    })
                  }
                />
              );
            })}

        </ContentContainer>
      </ScrollView>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // NFT TAB CONTENT
  // ═══════════════════════════════════════════════════════════

  const renderNftTab = () => {
    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.white} />
        }
      >
        <ContentContainer>
          <Nfts wallet={tokenAddress} chainId={activeChainId} isEvm={isEvm} />
        </ContentContainer>
      </ScrollView>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // ERC20 MODAL
  // ═══════════════════════════════════════════════════════════

  const renderErc20Modal = () => {
    if (!erc20ModalVisible) return null;
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", maxWidth: 400, paddingHorizontal: 20 }}
          >
            <View
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 20,
                padding: 24,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ fontFamily: theme.fonts.families.openBold, fontSize: 18, color: theme.colors.white }}>
                  Add {isSolana ? "SPL" : "ERC-20"} Token
                </Text>
                <TouchableOpacity
                  onPress={() => setErc20ModalVisible(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: theme.colors.grey,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: "bold" }}>×</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                placeholder={`Paste ${isSolana ? "SPL" : "ERC-20"} contract address`}
                placeholderTextColor={theme.colors.lightGrey}
                value={erc20Contract}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setErc20Contract}
                style={{
                  backgroundColor: theme.colors.dark,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: 14,
                  borderRadius: 12,
                  color: theme.colors.white,
                  marginBottom: 16,
                  fontFamily: theme.fonts.families.openRegular,
                  fontSize: 14,
                }}
              />

              <TouchableOpacity
                onPress={() => {
                  if (!erc20Contract) return;
                  if (isSolana) {
                    dispatch(addSolToken({ mint: erc20Contract.trim() }));
                  } else {
                    dispatch(addToken({ chainId: activeChainId, token: erc20Contract.trim() }));
                  }
                  setErc20Contract("");
                  setErc20ModalVisible(false);
                }}
                style={{
                  backgroundColor: theme.colors.primary,
                  borderRadius: 12,
                  padding: 14,
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontFamily: theme.fonts.families.openBold, fontSize: 14, color: theme.colors.dark }}>
                  Add Token
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setErc20ModalVisible(false)}
                style={{
                  backgroundColor: theme.colors.grey,
                  borderRadius: 12,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: theme.fonts.families.openBold, fontSize: 14, color: theme.colors.white }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <SafeAreaContainer>
      {/* Header with chain name */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.colors.white, fontSize: 32, fontWeight: "bold", lineHeight: 36 }}>←</Text>
        </TouchableOpacity>
        <HeaderTitle>
          {capitalizeFirstLetter(chainName)} {symbol ? `(${symbol})` : ""}
        </HeaderTitle>
        <View style={{ width: 32 }} />
      </View>


      <TokenDetailTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "info" && renderInfoTab()}
      {activeTab === "activity" && renderActivityTab()}
      {activeTab === "token" && renderTokenTab()}
      {activeTab === "nft" && renderNftTab()}

      {renderErc20Modal()}
    </SafeAreaContainer>
  );
}
