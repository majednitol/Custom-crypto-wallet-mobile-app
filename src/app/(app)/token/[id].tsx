import { useEffect, useState, useCallback, useRef, useMemo, act } from "react";
import { View, ScrollView, RefreshControl, Platform, Modal, TextInput } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { router, useLocalSearchParams } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import * as WebBrowser from "expo-web-browser";
import Toast from "react-native-toast-message";
import type { ThemeType } from "../../../styles/theme";
import type { RootState, AppDispatch } from "../../../store";
import { KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from "react-native";

import {
  fetchEvmBalance,
  fetchEvmTransactions,
  fetchEvmTransactionsInterval,
  fetchEvmBalanceInterval,
} from "../../../store/ethereumSlice";
import {
  fetchSolanaBalance,
  fetchSolanaTransactions,
  fetchSolanaTransactionsInterval,
  fetchSolanaBalanceInterval,
} from "../../../store/solanaSlice";
import { useLoadingState } from "../../../hooks/redux";
import { capitalizeFirstLetter } from "../../../utils/capitalizeFirstLetter";
import { formatDollar } from "../../../utils/formatDollars";
import { placeholderArr } from "../../../utils/placeholder";
import { Chains, GenericTransaction } from "../../../types";
import { GeneralStatus } from "../../../store/types";
import { truncateWalletAddress } from "../../../utils/truncateWalletAddress";
// import { isCloseToBottom } from "../../../utils/isCloseToBottom";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import SendIcon from "../../../assets/svg/send.svg";
import ReceiveIcon from "../../../assets/svg/receive.svg";
import { BlockchainIcon } from "../../../components/BlockchainIcon/BlockchainIcon";
import { getChainIconSymbol } from "../../../utils/getChainIconSymbol";
import NETWORKS from "../../../services/defaultNetwork";
import TokenInfoCard from "../../../components/TokenInfoCard/TokenInfoCard";
import CryptoInfoCard from "../../../components/CryptoInfoCard/CryptoInfoCard";
import CryptoInfoCardSkeleton from "../../../components/CryptoInfoCard/CryptoInfoCardSkeleton";
import PrimaryButton from "../../../components/PrimaryButton/PrimaryButton";
import { TICKERS } from "../../../constants/tickers";
import { FETCH_PRICES_INTERVAL } from "../../../constants/price";
import {
  SafeAreaContainer,
  BalanceContainer,
} from "../../../components/Styles/Layout.styles";
import {
  ErrorContainer,
  ErrorText,
} from "../../../components/Styles/Errors.styles";
import Button from "../../../components/Button/Button";
import { addToken, fetchTokenErc20Balance } from "../../../store/tokenSlice";
import Nfts from "../../(wallet)/nfts/nft";
import { addSolToken, fetchSplTokenBalance } from "../../../store/solTokenSlice";


const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: flex-start;
  padding: ${(props) => props.theme.spacing.medium};
  margin-top: ${(props) => (Platform.OS === "android" ? "40px" : "0px")};
`;

const BalanceTokenText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.huge};
  color: ${(props) => props.theme.fonts.colors.primary};
  text-align: center;
`;

const BalanceUsdText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.title};
  color: ${(props) => props.theme.colors.lightGrey};
  text-align: center;
`;

const ActionContainer = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-bottom: ${(props) => props.theme.spacing.huge};
`;

const CryptoInfoCardContainer = styled.View<{ theme: ThemeType }>`
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: ${(props) => props.theme.spacing.medium};
`;

const SectionTitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.header};
  color: ${(props) => props.theme.fonts.colors.primary};
  margin-left: ${(props) => props.theme.spacing.small};
  margin-bottom: ${(props) => props.theme.spacing.medium};
`;

const ComingSoonView = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const ComingSoonText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.header};
  color: ${(props) => props.theme.colors.lightGrey};
  margin-top: ${(props) => props.theme.spacing.medium};
`;

const BottomScrollFlatList = styled(BottomSheetFlatList) <{ theme: ThemeType }>`
  padding: ${(props) => props.theme.spacing.tiny};
  padding-top: ${(props) => props.theme.spacing.small};
`;

const BottomSectionTitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.header};
  color: ${(props) => props.theme.fonts.colors.primary};
  margin-bottom: ${(props) => props.theme.spacing.medium};
  margin-left: ${(props) => props.theme.spacing.huge};
`;

const SortContainer = styled.View<{ theme: ThemeType }>`
  display: flex;
  flex-direction: row;
  padding-right: ${(props) => props.theme.spacing.medium};
  padding-left: ${(props) => props.theme.spacing.medium};
  width: 100%;
  margin-bottom: ${(props) => props.theme.spacing.small};
`;

const SortButton = styled.TouchableOpacity<{
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

const SortText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.white};
  text-align: center;
`;

enum FilterTypes {
  ALL,
  RECEIVE,
  SENT,
}

export default function Index() {
  const dispatch = useDispatch<AppDispatch>();
  const sheetRef = useRef<BottomSheet>(null);
  const { id, asset } = useLocalSearchParams();
  const assetObj = asset ? JSON.parse(asset as string) : null;
  let blockchainVersion = "";
  // console.log("assetObj", assetObj);
  const symbol = assetObj?.symbol;
  const numberOfTokens = assetObj?.numberOfTokens;
  // console.log("numberOfTokens", numberOfTokens)
  const chainId = assetObj?.chainId;
  const address = assetObj?.address;
  const price = assetObj?.price;

  const theme = useTheme();
  const isStateLoading = useLoadingState();
  const chainName = id as string;
  // console.log("chainName", chainName)
const solTrackedTokens = useSelector(
  (state: RootState) => state.solToken.trackedTokens
);
  const activeChainId = useSelector(
    (state: RootState) => state.ethereum.activeChainId
  );
  const [erc20ModalVisible, setErc20ModalVisible] = useState(false);
  const [erc20Contract, setErc20Contract] = useState("");
  const erc20Tokens = useSelector(
    (state: RootState) =>
      state.erc20.trackedTokens?.filter(t => t.chainId === activeChainId) || []
  );


  const erc20Balances = useSelector((state: RootState) => state.erc20?.balances || {});

  // console.log("erc20Balances new", erc20Balances)
  const activeIndex = useSelector(
    (state: RootState) =>
      state.ethereum.activeIndex ?? 0
  );
  //wdwqd
  const tokenAddress = useSelector((state: RootState) => {
    blockchainVersion = chainName
      ? chainName === "solana"
        ? "solana"
        : "ethereum"
      : "";
    const chainSlice = state[blockchainVersion];
    if (chainSlice == state.solana) {
      const activeIndex = chainSlice.activeIndex ?? 0; // fallback
      const account = chainSlice.addresses?.[activeIndex]; // optional chaining
      return account?.address ?? "";
    } else if (chainSlice == state.ethereum) {

      const activeChainId = chainSlice.activeChainId;
      // console.log("activeChainId", activeChainId,)
      if (!activeChainId) return "";

      const activeIndex = chainSlice.activeIndex ?? 0;
      const account = chainSlice.globalAddresses?.[activeIndex];
      return account?.address ?? "";
    } else {
      return "chainName is empty";
    }

  });
 const prevTokensRef = useRef<string>("");

useEffect(() => {
  if (!tokenAddress || !erc20Tokens.length) return;

  const key = JSON.stringify(erc20Tokens);

  if (prevTokensRef.current === key) return;
  prevTokensRef.current = key;

  erc20Tokens.forEach(t => {
    dispatch(
      fetchTokenErc20Balance({
        chainId: t.chainId,
        token: t.token,
        wallet: tokenAddress,
      })
    );
  });
}, [erc20Tokens, tokenAddress, dispatch]);
const solBalances = useSelector(
  (state: RootState) => state.solToken.balances
);
const prevSolTokensRef = useRef<string>("");

useEffect(() => {
  if (!tokenAddress || !solTrackedTokens.length || !isSolana) return;

  const key = JSON.stringify(solTrackedTokens);
  console.log("solTrackedTokens",solTrackedTokens)
  if (prevSolTokensRef.current === key) return;
  prevSolTokensRef.current = key;

  solTrackedTokens.forEach(t => {
    dispatch(
      fetchSplTokenBalance({
        mint: t.mint,
        wallet: tokenAddress,
      })
    );
  });
}, [solTrackedTokens, tokenAddress, dispatch]);
  const transactionHistory = useSelector((state: RootState) => {
    if (!chainName) return [];

    const isSolana = chainName === "solana";
    const chainSlice = state[isSolana ? "solana" : "ethereum"];
    if (!chainSlice) return [];

    if (chainSlice === state.solana) {
      const activeIndex = chainSlice.activeIndex ?? 0;
      const account = chainSlice.addresses?.[activeIndex];
      return account?.transactionMetadata?.transactions ?? [];
    } else if (chainSlice === state.ethereum) {
      const activeChainId = chainSlice.activeChainId;
      if (!activeChainId) return [];

      const activeIndex = chainSlice.activeIndex ?? 0;
      const account = chainSlice.globalAddresses?.[activeIndex];

    // console.log("account?.transactionMetadataByChain?.[activeChainId]?.transactions",account?.transactionMetadataByChain?.[activeChainId]?.transactions)
      return account?.transactionMetadataByChain?.[activeChainId]?.transactions ?? [];
    }

    return [];
  });


  // Memoize to prevent unnecessary re-renders
  const memoizedTransactionHistory = useMemo(() => transactionHistory, [transactionHistory]);


  const failedNetworkRequest = useSelector((state: RootState) => {
    const chainSlice = state[blockchainVersion]; // e.g., state.ethereum
    if (!chainSlice) return false; // fallback if slice not loaded

    const activeIndex = chainSlice.activeIndex ?? 0; // default index
    const account = chainSlice.addresses?.[activeIndex];
    return account?.failedNetworkRequest ?? false; // fallback to false
  });


  const failedStatus = useSelector((state: RootState) => {
    const chainSlice = state[chainName];
    if (!chainSlice) return false;

    const activeIndex = chainSlice.activeIndex ?? 0;
    const account = chainSlice.addresses?.[activeIndex];
    return Boolean(account?.status === GeneralStatus.Failed);
  });



  // const loadingStatus = useSelector(
  //   (state: RootState) => state.wallet[chainName].status === GeneralStatus.Loading
  // );

  // const paginationKey: string[] | string = useSelector(
  //   (state: RootState) =>
  //     state.wallet[chainName].transactionMetadata.paginationKey
  // );

  const prices = useSelector((state: RootState) => state.price.data);
  const solPrice = prices[101]?.usd;
  const ethPrice = prices[activeChainId]?.usd;

  const [usdBalance, setUsdBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState(transactionHistory);
  const [filter, setFilter] = useState(FilterTypes.ALL);
  // console.log("transactions", transactions)
  const ticker = TICKERS[chainName];
  const isSolana = chainName === Chains.Solana;
  const isEvm = blockchainVersion === Chains.EVM;

  const evmNetwork = NETWORKS.find(n => n.chainId === Number(chainId));
  const evmChainName = evmNetwork?.chainName || "Ethereum";

  const fetchAndUpdatePrices = async () => {
    await fetchTokenBalance();
    await fetchPrices(numberOfTokens);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAndUpdatePrices();
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, [dispatch]);

  const _handlePressButtonAsync = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  const urlBuilder = (hash: string) => {
    let url: string;

    if (blockchainVersion === Chains.EVM) {
      url = `https://sepolia.etherscan.io/tx/${hash}`;
    } else {
      url = `https://explorer.solana.com/tx/${hash}`;
    }
    return url;
  };

  const renderItem = ({ item }) => {
    if (isStateLoading) {
      return <CryptoInfoCardSkeleton hideBackground={true} />;
    }
    if (failedStatus) {
      return (
        <ErrorContainer>
          <ErrorText>
            There seems to be a network error, please try again later
          </ErrorText>
        </ErrorContainer>
      );
    }

    const sign = item.direction === "received" ? "+" : "-";
    if (isSolana) {
      return (
        <CryptoInfoCard 
          onPress={() => _handlePressButtonAsync(urlBuilder(item.hash))}
          title={capitalizeFirstLetter(item.direction)}
          caption={`To ${truncateWalletAddress(item.to)}`}
          details={`${sign} ${item.value} ${item.asset}`}
          icon={<BlockchainIcon symbol="sol" size={35} />}
        />
      );
    }

    if (isEvm) {
      return (
        <CryptoInfoCard
          onPress={() => _handlePressButtonAsync(urlBuilder(item.hash))}
          title={capitalizeFirstLetter(item.direction)}
          caption={`To ${truncateWalletAddress(item.to)}`}
          details={`${sign} ${item.value} ${item.asset}`}
          icon={<BlockchainIcon symbol={item.asset} size={35} />}
        />
      );
    }
  };

  const fetchPrices = async (currentTokenBalance: number) => {
    // console.log("currentTokenBalance", currentTokenBalance, ethPrice)
    // if (chainName === Chains.EVM) {
    dispatch(fetchEvmTransactions({ chainId: activeChainId, address: tokenAddress }));
    const usd = ethPrice * currentTokenBalance;
    // console.log("usd", usd)
    setUsdBalance(usd);
    // }

    if (chainName === Chains.Solana) {
      dispatch(fetchSolanaTransactions(tokenAddress));
      const usd = solPrice * currentTokenBalance;
      setUsdBalance(usd);
    }
  };

  const fetchPricesInterval = async (currentTokenBalance: number) => {
    if (blockchainVersion === Chains.EVM) {
      dispatch(fetchEvmTransactionsInterval({ chainId: activeChainId, address: tokenAddress }));
      const usd = ethPrice * currentTokenBalance;
      setUsdBalance(usd);
    }

    if (chainName === Chains.Solana) {
      dispatch(fetchSolanaTransactionsInterval(tokenAddress));
      const usd = solPrice * currentTokenBalance;
      setUsdBalance(usd);
      //  console.log("usdBalance", usdBalance ,solPrice ,currentTokenBalance)
    }
  };
 
  const fetchTokenBalance = async () => {
    if (isSolana && tokenAddress) {
      dispatch(fetchSolanaBalance(tokenAddress));
    }

    if (isEvm && tokenAddress) {
      dispatch(fetchEvmBalance({ chainId: activeChainId, address: tokenAddress }));
    }
  };


  const fetchTokenBalanceInterval = async () => {
    if (isSolana && tokenAddress) {
      dispatch(fetchSolanaBalanceInterval(tokenAddress));
    }

    if (isEvm && tokenAddress) {
      dispatch(fetchEvmBalanceInterval(tokenAddress));
    }
  };

  const fetchAndUpdatePricesInterval = async () => {
    await fetchTokenBalanceInterval();
    await fetchPricesInterval(numberOfTokens);
  };

  const snapPoints = useMemo(() => ["10%", "66%", "90%"], []);

  const filteredTransactions = useMemo(() => {
    switch (filter) {
      case FilterTypes.RECEIVE:
        return memoizedTransactionHistory.filter(
          (item) => item.direction === "received"
        );
      case FilterTypes.SENT:
        return memoizedTransactionHistory.filter(
          (item) => item.direction === "sent"
        );
      default:
        return memoizedTransactionHistory;
    }
  }, [memoizedTransactionHistory, filter]);



  useEffect(() => {
    fetchAndUpdatePrices();
    const intervalId = setInterval(
      fetchAndUpdatePricesInterval,
      FETCH_PRICES_INTERVAL
    );

    return () => {
      clearInterval(intervalId);
    };
  }, [dispatch, numberOfTokens, ethPrice, solPrice, tokenAddress]);

  useEffect(() => {
    if (failedNetworkRequest) {
      setTimeout(() => {
        Toast.show({
          type: "success",
          text1: `We are facing ${capitalizeFirstLetter(
            chainName
          )} network issues`,
          text2: "Please try again later",
        });
      }, 2500);
    }
  }, [failedNetworkRequest]);

  return (
    <SafeAreaContainer key={`${chainName}-${activeChainId}`}>
      <ScrollView nestedScrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.white}
          />
        }
      >
        <ContentContainer>
          <BalanceContainer>
            <BalanceTokenText>
              {numberOfTokens} {isSolana ? "SOL" : symbol}
            </BalanceTokenText>
            <BalanceUsdText>{formatDollar(usdBalance)}</BalanceUsdText>
          </BalanceContainer>
          <ActionContainer>
            <PrimaryButton
              icon={
                <SendIcon width={25} height={25} fill={theme.colors.primary} />
              }
              onPress={() => router.push({
                pathname: `token/send/${chainName}`, params: {
                  chainId: activeChainId,
                  solAddess: assetObj.address,
                  nativeTokenSymbol: symbol,
                  
                  
              }})}
              btnText="Send "
            />
            <View style={{ width: 15 }} />
            <PrimaryButton
              icon={
                <ReceiveIcon
                  width={25}
                  height={25}
                  fill={theme.colors.primary}
                />
              }
              onPress={() => router.push(`token/receive/${chainName}`)}
              btnText=" Receive "
            />
          </ActionContainer>
          {/* {console.log("chainName", chainName)} */}
          <SectionTitle>About {capitalizeFirstLetter(chainName)}</SectionTitle>
          <CryptoInfoCardContainer>
            <TokenInfoCard
              tokenName={capitalizeFirstLetter(chainName)}
              tokenSymbol={isSolana ? "SOL" : symbol}
              network={capitalizeFirstLetter(chainName)}
            />
          </CryptoInfoCardContainer>
          <Button
            title="Add New Token"
            onPress={() => setErc20ModalVisible(true)}
          />

          <CryptoInfoCardContainer>
            {erc20Tokens?.map(t => {
              const key = `${t.chainId}:${t.token.toLowerCase()}`;
              const data = erc20Balances[key];

              
              if (!data) return null;
              // 0xd3aC5710463ccBFA8B7cD8213808e1350530e3F7
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

          
            {
              
              isSolana &&
    solTrackedTokens.map(t => {
      const data = solBalances[t.mint];
      console.log("solTrackedToken100",data,solBalances,t.mint)
      if (!data) return null;

      return (
        <CryptoInfoCard
          key={`sol-${t.mint}`}
          title="SPL Token"
          caption={t.mint.slice(0, 6) + "..."}
          details={`${data.amount}`}
          icon={<BlockchainIcon symbol="sol" size={35} />}
          onPress={() =>
            router.push({
              pathname: `token/send/solana`,
              params: {
                mint: t.mint,
                balance: data.amount,
                decimals: data.decimals,
              },
            })
          }
        />
      );
    })}

          </CryptoInfoCardContainer>
          <SectionTitle>Your owned NFTs</SectionTitle>
          <Nfts wallet={tokenAddress} chainId={activeChainId} isEvm={isEvm} />
          <SectionTitle></SectionTitle>
          <SectionTitle></SectionTitle>
          <SectionTitle></SectionTitle>
        </ContentContainer>
      </ScrollView>

      {erc20ModalVisible && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View
            style={{
              position: "absolute",   
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.65)",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,         
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{
                width: "100%",
                alignItems: "center",
                paddingHorizontal: 20,
              }}
            >
              <View
                style={{
                  width: "90%",
                  maxWidth: 420,
                  backgroundColor: theme.colors.dark,
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <SectionTitle>Add {isSolana ? "SPL" : "ERC-20"} Token</SectionTitle>

                <TextInput
                  placeholder="ERC-20 contract address"
                  placeholderTextColor="#888"
                  value={erc20Contract}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setErc20Contract}
                  style={{
                    borderWidth: 1,
                    borderColor: "#444",
                    padding: 14,
                    borderRadius: 10,
                    color: "#fff",
                    marginBottom: 16,
                  }}
                />

                <Button
                  title="Add Token"
                  onPress={() => {
                    if (!erc20Contract) return;
                    if (isSolana) {
                      dispatch(addSolToken({ mint: erc20Contract.trim() }));
                    } else {
                      dispatch(
                        addToken({
                          chainId: activeChainId,
                          token: erc20Contract.trim(),
                        })
                      );
                    }
                    setErc20Contract("");
                    setErc20ModalVisible(false);
                  }}
                />

                <View style={{ height: 10 }} />

                <Button
                  title="Cancel"
                  onPress={() => setErc20ModalVisible(false)}
                />
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      )}


      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          backgroundColor: theme.colors.lightDark,
          opacity: 0.98,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 12,
          },
          shadowOpacity: 0.58,
          shadowRadius: 16.0,

          elevation: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.white,
        }}
        handleStyle={{
          marginTop: 6,
        }}
      >
        <BottomScrollFlatList
          ListHeaderComponent={
            <>
              <BottomSectionTitle>Transaction History</BottomSectionTitle>
              <SortContainer>
                <SortButton
                  onPress={() => !isStateLoading && setFilter(FilterTypes.ALL)}
                  highlighted={filter === FilterTypes.ALL}
                >
                  <SortText>All</SortText>
                </SortButton>
                <SortButton
                  onPress={() =>
                    !isStateLoading && setFilter(FilterTypes.RECEIVE)
                  }
                  highlighted={filter === FilterTypes.RECEIVE}
                >
                  <SortText>Received</SortText>
                </SortButton>
                <SortButton
                  onPress={() => !isStateLoading && setFilter(FilterTypes.SENT)}
                  highlighted={filter === FilterTypes.SENT}
                >
                  <SortText>Sent</SortText>
                </SortButton>
              </SortContainer>
            </>
          }
          data={isStateLoading ? placeholderArr(8) : filteredTransactions}
          renderItem={renderItem}
          // keyExtractor={(item: GenericTransaction) => item.uniqueId}
         keyExtractor={(item: GenericTransaction, index) =>
  `${item.uniqueId ?? index}-${item.hash ?? index}-${item.direction}-${item.value}`
}

          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListEmptyComponent={() => {
            if (failedStatus) {
              return (
                <ErrorContainer>
                  <ErrorText>
                    There seems to be a network error, please try again later
                  </ErrorText>
                </ErrorContainer>
              );
            } else {
              return (
                <ComingSoonView>
                  <ComingSoonText>
                    <ComingSoonText>
                      {isSolana
                        ? `Add some ${ticker} to your wallet`
                        : `Add some ${symbol} to your wallet`}
                    </ComingSoonText>


                  </ComingSoonText>
                </ComingSoonView>
              );
            }
          }}
        ></BottomScrollFlatList>
      </BottomSheet>
    </SafeAreaContainer>
  );
}
