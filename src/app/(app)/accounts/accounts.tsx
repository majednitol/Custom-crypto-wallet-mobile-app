
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { View, FlatList, Dimensions, Platform } from "react-native";
import { router } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import { useSelector, useDispatch } from "react-redux";
import * as ethers from "ethers";
import { MotiView } from "moti";
import { Skeleton } from "moti/skeleton";
import { debounce } from "lodash";
import { formatDollar } from "../../../utils/formatDollars";
import solanaService from "../../../services/SolanaService";
import { getPhrase } from "../../../hooks/useStorageState";
import { store, type AppDispatch, type RootState } from "../../../store";
import type { AddressState, SAddressState } from "../../../store/types";
import type { ThemeType } from "../../../styles/theme";
import { GeneralStatus } from "../../../store/types";
import {
  fetchEvmBalance,
  setActiveAccount,
  updateAddresses,
} from "../../../store/ethereumSlice";
import {
  setActiveSolanaAccount,
  updateSolanaAddresses,
} from "../../../store/solanaSlice";
import {
  setActiveImportedAccount,
  clearActiveImportedAccount,
} from "../../../store/importedAccountSlice";

import { ROUTES } from "../../../constants/routes";
import RightArrowIcon from "../../../assets/svg/right-arrow.svg";
import PhraseIcon from "../../../assets/svg/phrase.svg";
import EditIcon from "../../../assets/svg/edit.svg";
import { SafeAreaContainer } from "../../../components/Styles/Layout.styles";
import Button from "../../../components/Button/Button";
import { placeholderArr } from "../../../utils/placeholder";
import { evmServices, getEvmService } from "../../../services/EthereumService";

interface WalletContainerProps {
  theme: ThemeType;
  isLast: boolean;
  isActiveAccount: boolean;
}

interface WalletSkeletonContainerProps {
  theme: ThemeType;
  isLast: boolean;
  isActiveAccount: boolean;
}

const ScrollContainer = styled.ScrollView`
  flex: 1;
`;

const ContentContainer = styled.View<{ theme: ThemeType }>`
  padding: ${({ theme }) => theme.spacing.medium};
  padding-top: 50px;
  padding-bottom: 24px;
`;

const BottomButtonContainer = styled.View<{ theme: ThemeType }>`
  padding: ${({ theme }) => theme.spacing.medium};
  padding-bottom: 32px;
  background-color: transparent;
`;

const PageTitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: 28px;
  color: ${(props) => props.theme.colors.white};
  margin-bottom: 24px;
`;

const WalletContainer = styled.TouchableOpacity<WalletContainerProps>`
  flex-direction: row;
  justify-content: space-between;
  background-color: ${({ theme, isActiveAccount }) =>
    isActiveAccount ? "rgba(240, 185, 11, 0.1)" : theme.colors.cardBackground};
  padding: 18px;
  border-radius: 14px;
  margin-bottom: 12px;
  border: 1px solid
    ${({ theme, isActiveAccount }) =>
    isActiveAccount ? "rgba(240, 185, 11, 0.3)" : theme.colors.border};
`;

const WalletSkeletonContainer = styled(MotiView) <WalletSkeletonContainerProps>`
  flex-direction: row;
  justify-content: space-between;
  background-color: ${({ theme, isActiveAccount }) =>
    isActiveAccount ? "rgba(240, 185, 11, 0.1)" : theme.colors.cardBackground};
  padding: 18px;
  border-radius: 14px;
  margin-bottom: 12px;
  border: 1px solid
    ${({ theme, isActiveAccount }) =>
    isActiveAccount ? "rgba(240, 185, 11, 0.3)" : theme.colors.border};
`;

const AccountDetails = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const EditIconContainer = styled.TouchableOpacity`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 50px;
  height: 50px;
`;

const WalletPhraseContainer = styled.TouchableOpacity<{ theme: ThemeType }>`
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.medium};
  margin-bottom: 24px;
`;

const SectionTitle = styled.Text<{ theme: ThemeType }>`
  color: ${(props) => props.theme.fonts.colors.primary};
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.large};
  margin-left: ${({ theme }) => theme.spacing.medium};
  text-align: left;
`;

const AccountTitle = styled.Text<{ theme: ThemeType }>`
  color: ${(props) => props.theme.fonts.colors.primary};
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.large};
  margin-left: ${({ theme }) => theme.spacing.medium};
  margin-bottom: 4px;
  text-align: left;
`;

const PriceText = styled.Text<{ theme: ThemeType }>`
  color: ${(props) => props.theme.colors.lightGrey};
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  margin-left: ${({ theme }) => theme.spacing.medium};
  text-align: left;
`;

const PhraseTextContent = styled.View`
  display: flex;
  flex-direction: row;
`;

interface WalletPairs {
  isImported: boolean;
  id: string;
  accountName: string;
  isActiveAccount: boolean;
  walletDetails: {
    ethereum: AddressState | {};
    solana: SAddressState | {};
  };
}


// ✅ Component
const AccountsIndex = () => {
  const theme = useTheme();
  const dispatch = useDispatch();

  // --- SELECTORS ---
  const activeChainId = useSelector(
    (state: RootState) => state.ethereum.activeChainId

  );

  console.log("activeChainId", activeChainId);
  const service = getEvmService(activeChainId);
  console.log("accounts.tsx service", service, activeChainId);

  const ethAccounts = useSelector(
    (state: RootState) => state.ethereum.globalAddresses || []
  );


  const activeEthIndex = useSelector(
    (state: RootState) =>
      state.ethereum.activeIndex ?? 0
  );

  const activeEthAddress = ethAccounts[activeEthIndex] ?? null;

  const solAccounts = useSelector((state: RootState) => state.solana.addresses);
  const activeSolIndex = useSelector(
    (state: RootState) => state.solana.activeIndex
  );
  const activeSolAddress = solAccounts[activeSolIndex] ?? null;

  const importedAccounts = useSelector(
    (state: RootState) => state.importedAccounts?.accounts ?? []
  );
  const activeImportedEvmAddress = useSelector(
    (state: RootState) => state.importedAccounts?.activeEvmAddress
  );
  const activeImportedSolAddress = useSelector(
    (state: RootState) => state.importedAccounts?.activeSolAddress
  );

  const prices = useSelector((state: RootState) => state.price.data);

  const ethdispatch = useDispatch<AppDispatch>();
  // --- STATE ---
  const [walletCreationLoading, setWalletCreationLoading] = useState(false);
  const [priceAndBalanceLoading, setPriceAndBalanceLoading] = useState(true);
  const [accounts, setAccounts] = useState<WalletPairs[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  // --- HELPERS ---
  //  const compileAddressesConcurrently = useCallback(
  //   async (ethAcc: AddressState[], solAcc: SAddressState[]) => {
  //     const service = getEvmService(activeChainId);


  //     if (!service) {
  //       console.log("EVM service not initialized yet, skipping balances");
  //       return {
  //         ethereum: ethAcc.map(a => ({ ...a, balance: a.activeBalance ?? 0})),
  //         solana: await Promise.all(
  //           solAcc.map(async a => ({
  //             ...a,
  //             balance: await solanaService.getBalance(a.address),
  //           }))
  //         ),
  //       };
  //     }


  //  const fetchAllBalances = async (
  //   dispatch: AppDispatch,
  //   getState: () => RootState
  // ): Promise<Record<number, number>> => {
  //   const state = getState();
  //   const result: Record<number, number> = {};

  //   // Get the active account index for each chain
  //   const addresses = state.ethereum.globalAddresses;
  //   if (!addresses || addresses.length === 0) return result;

  //   const activeAccountIndex = state.ethereum.activeIndexByChain;
  //   const activeAccount = addresses[0]; // or pick based on chainId if needed

  //   // Iterate all networks
  //   for (const chainIdStr of Object.keys(state.ethereum.networks)) {
  //     const chainId = Number(chainIdStr);

  //     // Get the active index for this chain
  //     const idx = activeAccountIndex[chainId] ?? 0;
  //     const account = addresses[idx];
  //     if (!account) continue;

  //     // Fetch balance from blockchain
  //     try {
  //       const res = await dispatch(
  //         fetchEvmBalance({ chainId, address: account.address })
  //       ).unwrap();

  //       // Store in result
  //       result[chainId] = res.balance;
  //     } catch (err) {
  //       console.warn(`Failed to fetch balance for chain ${chainId}:`, err);
  //       result[chainId] = 0;
  //     }
  //   }

  //   return result;
  //  };

  //  useEffect(() => {
  //   if (!ethAccounts.length) return;

  //   const fetchBalancesAsync = async () => {
  //     try {
  //       const result = await fetchAllBalances(ethdispatch, () => store.getState());
  //       setBalances(result);
  //     } catch (err) {
  //       console.error("Failed to fetch balances:", err);
  //     }
  //   };

  //   fetchBalancesAsync();
  // }, [ethAccounts]);




  //     const ethereumBalancePromise = ethAcc.map(async (account) => {
  //       const balance = await service.getBalance(account.address);
  //       return { ...account, balance: Number(ethers.formatEther(balance)) };
  //     });

  //     const solanaBalancePromise = solAcc.map(async (account) => {
  //       const balance = await solanaService.getBalance(account.address);
  //       return { ...account, balance };
  //     });

  //     const [ethereum, solana] = await Promise.all([
  //       Promise.all(ethereumBalancePromise),
  //       Promise.all(solanaBalancePromise),
  //     ]);

  //     return { ethereum, solana };
  //   },
  //   [activeChainId]
  // );


  //   const compileInactiveAddresses = useCallback(
  //     (
  //       ethAcc: AddressState[],
  //       solAcc: SAddressState[],
  //       activeEthAddress: string | null,
  //       activeSolAddress: string | null
  //     ) => {
  //       const mergedWalletPairs: WalletPairs[] = [];
  //       const highestAccAmount = Math.max(ethAcc.length, solAcc.length);

  //       for (let i = 0; i < highestAccAmount; i++) {
  //         const eth = ethAcc[i] ?? null;
  //         const sol = solAcc[i] ?? null;
  //         const isActiveAccount =
  //           eth?.address === activeEthAddress && sol?.address === activeSolAddress;
  //         mergedWalletPairs.push({
  //           id: `${i}-${eth?.address ?? sol?.address ?? i}`,
  //           accountName: eth?.accountName || sol?.accountName || `Account ${i + 1}`,
  //           isActiveAccount,
  //           walletDetails: { ethereum: eth, solana: sol },
  //         });
  //       }

  //       return mergedWalletPairs;
  //     },
  //     []
  //   );

  //   // --- CREATE NEW WALLET ---
  //   const createNewWalletPair = useCallback(async () => {
  //   setWalletCreationLoading(true);

  //   try {
  //     const phrase = await getPhrase();
  //     if (!phrase) throw new Error("Seed phrase not found");

  //     const ethService = getEvmService(activeChainId);


  //     if (!ethService) {
  //       console.warn("EVM service not ready yet");
  //       return;
  //     }

  //     const nextEthIndex = ethAccounts.length;
  //     const nextSolIndex = solAccounts.length;

  //     const newEthWallet = await ethService.createWalletByIndex(
  //       phrase,
  //       nextEthIndex
  //     );

  //     const newSolWallet = await solanaService.createWalletByIndex(
  //       phrase,
  //       nextSolIndex
  //     );

  //    const transformedEthWallet: AddressState = {
  //   accountName: `Account ${nextEthIndex + 1}`,
  //   derivationPath: newEthWallet.derivationPath,
  //   address: newEthWallet.address,
  //   publicKey: newEthWallet.publicKey,

  //   // Per-chain balances & status
  //   balanceByChain: {},
  //   statusByChain: {},
  //   activeBalance: 0,
  //   failedNetworkRequestByChain: {},

  //   // Per-chain transaction metadata
  //   transactionMetadataByChain: {
  //     [activeChainId]: {
  //       transactions: [],
  //       paginationKey: undefined,
  //     },
  //   },

  //   // Global transaction confirmations
  //   transactionConfirmations: [],
  // };


  //     const transformedSolWallet: SAddressState = {
  //       accountName: `Account ${nextSolIndex + 1}`,
  //       derivationPath: newSolWallet.derivationPath,
  //       address: newSolWallet.address,
  //       publicKey: newSolWallet.publicKey,
  //       balance: 0,
  //       transactionMetadata: { paginationKey: undefined, transactions: [] },
  //       failedNetworkRequest: false,
  //       status: GeneralStatus.Idle,
  //       transactionConfirmations: [],
  //     };

  //     dispatch(
  //       updateAddresses({
  //         addresses: [transformedEthWallet],
  //       })
  //     );

  //     dispatch(updateSolanaAddresses(transformedSolWallet));
  //   } catch (err) {
  //     console.error("Failed to create wallet pair:", err);
  //   } finally {
  //     setWalletCreationLoading(false);
  //   }
  // }, [activeChainId, ethAccounts.length, solAccounts.length, dispatch]);


  //   // --- SET ACTIVE ACCOUNT ---
  //   const setNextActiveAccounts = useCallback(
  //     (index: number) => {
  //       dispatch(setActiveAccount({ chainId: activeChainId, index }));
  //       dispatch(setActiveSolanaAccount(index));
  //     },
  //     [dispatch, activeChainId]
  //   );

  //   // --- FETCH BALANCES ---
  //   const fetchBalances = useCallback(async () => {
  //     try {
  //        if (!ethAccounts.length && !solAccounts.length) return;
  //       const { ethereum, solana } = await compileAddressesConcurrently(ethAccounts, solAccounts);
  //       setAccounts(
  //         compileInactiveAddresses(
  //           ethereum,
  //           solana,
  //           activeEthAddress?.address ?? null,
  //           activeSolAddress?.address ?? null
  //         )
  //       );
  //     } catch (err) {
  //       console.error("Failed fetching balances:", err);
  //     } finally {
  //       setPriceAndBalanceLoading(false);
  //     }
  //   }, [
  //     ethAccounts,
  //     solAccounts,
  //     activeEthAddress,
  //     activeSolAddress,
  //     compileAddressesConcurrently,
  //     compileInactiveAddresses,
  //   ]);

  //   const debouncedFetchBalances = useMemo(() => debounce(fetchBalances, 300), [fetchBalances]);

  //   useEffect(() => {
  //     debouncedFetchBalances();
  //     return () => debouncedFetchBalances.cancel();
  //   }, [debouncedFetchBalances]);

  //   const memoizedAccounts = useMemo(
  //     () => (priceAndBalanceLoading ? placeholderArr(ethAccounts.length) : accounts),
  //     [priceAndBalanceLoading, ethAccounts.length, accounts]
  //   );

  //   const width = Dimensions.get("window").width * 0.6;

  // const calculateTotalPrice = useCallback(
  //   (
  //     evmBalances: Record<number, number>, 
  //     solBalance: number                  
  //   ) => {
  //     const evmTotal = Object.entries(evmBalances).reduce((acc, [chainIdStr, balance]) => {
  //       const chainId = Number(chainIdStr);
  //       const price = prices[chainId]?.usd ?? 0; 
  //       return acc + balance * price;
  //     }, 0);
  //   const solUsd = prices[101]?.usd ?? 0;
  //     const total = evmTotal + solBalance * solUsd;
  // // console.log("total",total)
  //     return formatDollar(total);
  //   },
  //   [prices]
  // );


  //   const renderItem = useCallback(
  //     ({ item, index }) => {
  //       if (priceAndBalanceLoading) {
  //         return (
  //           <WalletSkeletonContainer isActiveAccount={false} isLast={index === accounts.length - 1}>
  //             <Skeleton height={35} colors={[theme.colors.grey, theme.colors.dark, theme.colors.dark, theme.colors.grey]} width={width} />
  //             <Skeleton height={35} colors={[theme.colors.grey, theme.colors.dark, theme.colors.dark, theme.colors.grey]} width={50} />
  //           </WalletSkeletonContainer>
  //         );
  //       }

  //       const balance = calculateTotalPrice(
  //   balances ?? {}, 
  //   item.walletDetails.solana?.balance ?? 0           
  // );
  // console.log("balance",balance)
  //       return (
  //         <WalletContainer
  //           onPress={() => {
  //             setNextActiveAccounts(index);
  //             router.back();
  //           }}
  //           isActiveAccount={item.isActiveAccount}
  //           isLast={index === accounts.length - 1}
  //         >
  //           <AccountDetails>
  //             <AccountTitle>{item.accountName}</AccountTitle>
  //             <PriceText>{balance}</PriceText>
  //           </AccountDetails>
  //           <EditIconContainer
  //             onPress={() => {
  //               router.push({
  //                 pathname: ROUTES.accountModal,
  //                 params: {
  //                   ethAddress: item.walletDetails.ethereum?.address ?? "",
  //                   solAddress: item.walletDetails.solana?.address ?? "",
  //                   balance,
  //                 },
  //               });
  //             }}
  //           >
  //             <EditIcon width={20} height={20} fill={theme.colors.white} />
  //           </EditIconContainer>
  //         </WalletContainer>
  //       );
  //     },
  //     [accounts.length, calculateTotalPrice, priceAndBalanceLoading, setNextActiveAccounts, theme]
  //   );


  // -------------------- 1. FETCH BALANCES --------------------
  const compileAddressesConcurrently = useCallback(
    async (ethAcc: AddressState[], solAcc: SAddressState[]) => {
      const service = getEvmService(activeChainId);

      if (!service) {
        console.log("EVM service not initialized yet, skipping balances");
        const solBalances = await Promise.all(
          solAcc.map(async (a) => ({
            ...a,
            balance: await solanaService.getBalance(a.address),
          }))
        );
        return {
          ethereum: ethAcc.map((a) => ({ ...a, balance: a.activeBalance ?? 0 })),
          solana: solBalances,
        };
      }

      // Fetch Ethereum balances concurrently
      const ethereumBalancePromise = ethAcc.map(async (account) => {
        const balance = await service.getBalance(account.address);
        return { ...account, balance: Number(ethers.formatEther(balance)) };
      });

      // Fetch Solana balances concurrently
      const solanaBalancePromise = solAcc.map(async (account) => {
        const balance = await solanaService.getBalance(account.address);
        return { ...account, balance };
      });

      const [ethereum, solana] = await Promise.all([
        Promise.all(ethereumBalancePromise),
        Promise.all(solanaBalancePromise),
      ]);

      return { ethereum, solana };
    },
    [activeChainId]
  );

  // -------------------- 2. MERGE ACCOUNTS --------------------
  const compileInactiveAddresses = useCallback(
    (
      ethAcc: AddressState[],
      solAcc: SAddressState[],
      activeEthAddress: string | null,
      activeSolAddress: string | null,
      importedAcc: { id: string; accountName: string; evmAddress?: string; solAddress?: string }[],
      activeImportedEvm?: string,
      activeImportedSol?: string
    ) => {
      const mergedWalletPairs: WalletPairs[] = [];
      const highestAccAmount = Math.max(ethAcc.length, solAcc.length);

      // Determine "true" active addresses (imported takes precedence)
      const trueActiveEth = activeImportedEvm || activeEthAddress;
      const trueActiveSol = activeImportedSol || activeSolAddress;

      for (let i = 0; i < highestAccAmount; i++) {
        const eth = ethAcc[i] ?? null;
        const sol = solAcc[i] ?? null;
        
        // Skip imported accounts (those without a derivationPath) as they are handled below
        if ((eth && !eth.derivationPath) || (sol && !sol.derivationPath)) continue;
        // Seed-derived account is active ONLY when no imported account is active
        const isActiveAccount =
          !activeImportedEvm && !activeImportedSol &&
          eth?.address === activeEthAddress && sol?.address === activeSolAddress;

        mergedWalletPairs.push({
          id: `${i}-${eth?.address ?? sol?.address ?? i}`,
          accountName: eth?.accountName || sol?.accountName || `Account ${i + 1}`,
          isActiveAccount,
          isImported: false,
          walletDetails: { ethereum: eth ?? {}, solana: sol ?? {} },
        });
      }

      // Add imported accounts
      for (const imported of importedAcc) {
        const isActiveAccount =
          (imported.evmAddress && imported.evmAddress === trueActiveEth) ||
          (imported.solAddress && imported.solAddress === trueActiveSol) ||
          false;

        mergedWalletPairs.push({
          id: imported.id,
          accountName: imported.accountName,
          isActiveAccount,
          isImported: true,
          walletDetails: {
            ethereum: imported.evmAddress ? { address: imported.evmAddress } : {},
            solana: imported.solAddress ? { address: imported.solAddress } : {},
          },
        });
      }

      return mergedWalletPairs;
    },
    []
  );
  useEffect(() => {
    const fetch = async () => {
      try {
        const { ethereum, solana } = await compileAddressesConcurrently(
          ethAccounts,
          solAccounts
        );

        const merged = compileInactiveAddresses(
          ethereum,
          solana,
          activeEthAddress?.address ?? null,
          activeSolAddress?.address ?? null,
          importedAccounts,
          activeImportedEvmAddress,
          activeImportedSolAddress
        );

        setAccounts(merged);
      } catch (err) {
        console.error("Failed fetching balances:", err);
      } finally {
        setPriceAndBalanceLoading(false);
      }
    };

    fetch();
  }, [
    ethAccounts,
    solAccounts,
    activeEthAddress,
    activeSolAddress,
    importedAccounts,
    activeImportedEvmAddress,
    activeImportedSolAddress,
    compileAddressesConcurrently,
    compileInactiveAddresses
  ]);


  // -------------------- 3. CREATE NEW WALLET --------------------
  // const createNewWalletPair = useCallback(async () => {
  //   setWalletCreationLoading(true);

  //   try {
  //     const phrase = await getPhrase();
  //     if (!phrase) throw new Error("Seed phrase not found");

  //     const ethService = getEvmService(activeChainId);
  //     if (!ethService) {
  //       console.warn("EVM service not ready yet");
  //       return;
  //     }

  //     const nextEthIndex = ethAccounts.length;
  //     const nextSolIndex = solAccounts.length;

  //     const newEthWallet = await ethService.createWalletByIndex(phrase, nextEthIndex);
  //     const newSolWallet = await solanaService.createWalletByIndex(phrase, nextSolIndex);

  //     const transformedEthWallet: AddressState = {
  //       accountName: `Account ${nextEthIndex + 1}`,
  //       derivationPath: newEthWallet.derivationPath,
  //       address: newEthWallet.address,
  //       publicKey: newEthWallet.publicKey,
  //       balanceByChain: {},
  //       statusByChain: {},
  //       activeBalance: 0,
  //       failedNetworkRequestByChain: {},
  //       transactionMetadataByChain: {
  //         [activeChainId]: { transactions: [], paginationKey: undefined },
  //       },
  //       transactionConfirmations: [],
  //     };

  //     const transformedSolWallet: SAddressState = {
  //       accountName: `Account ${nextSolIndex + 1}`,
  //       derivationPath: newSolWallet.derivationPath,
  //       address: newSolWallet.address,
  //       publicKey: newSolWallet.publicKey,
  //       balance: 0,
  //       transactionMetadata: { paginationKey: undefined, transactions: [] },
  //       failedNetworkRequest: false,
  //       status: GeneralStatus.Idle,
  //       transactionConfirmations: [],
  //     };

  //     // dispatch(updateAddresses({ addresses: [transformedEthWallet] }));
  //     const currentEthAccounts = store.getState().ethereum.globalAddresses || [];
  // dispatch(updateAddresses({ addresses: [...currentEthAccounts, transformedEthWallet] }));

  //     dispatch(updateSolanaAddresses(transformedSolWallet));
  //   } catch (err) {
  //     console.error("Failed to create wallet pair:", err);
  //   } finally {
  //     setWalletCreationLoading(false);
  //   }
  // }, [activeChainId, ethAccounts.length, solAccounts.length, dispatch]);
  const ethAccount = useSelector((state: RootState) => state.ethereum.globalAddresses);

  ethAccount.forEach((acc) => {
    console.log(acc.accountName, acc.address);
  });
  const createNewWalletPair = useCallback(async () => {
    setWalletCreationLoading(true);

    try {
      // 1️⃣ Get seed phrase
      const phrase = await getPhrase();
      if (!phrase) throw new Error("Seed phrase not found");

      const ethService = getEvmService(activeChainId);
      if (!ethService) {
        console.warn("EVM service not ready yet");
        return;
      }

      // 2️⃣ Determine next wallet index for Ethereum
      const standardEthAccounts = ethAccounts.filter(a => !!a.derivationPath);
      let nextEthIndex = 0;
      if (standardEthAccounts.length > 0) {
        const lastDerivationPath = standardEthAccounts[standardEthAccounts.length - 1].derivationPath;
        if (lastDerivationPath) {
          const parts = lastDerivationPath.split("/");
          const lastIndex = parseInt(parts[parts.length - 1]);
          nextEthIndex = lastIndex + 1;
        } else {
          nextEthIndex = standardEthAccounts.length;
        }
      }
      const nextEthAccountNum = standardEthAccounts.length + 1;

      // 3️⃣ Determine next wallet index for Solana
      const standardSolAccounts = solAccounts.filter(a => !!a.derivationPath);
      const nextSolIndex = standardSolAccounts.length;
      const nextSolAccountNum = standardSolAccounts.length + 1;

      // 4️⃣ Create Ethereum wallet by index
      const newEthWallet = await ethService.createWalletByIndex(phrase, nextEthIndex);

      // 5️⃣ Create Solana wallet by index
      const newSolWallet = await solanaService.createWalletByIndex(phrase, nextSolIndex);

      // 6️⃣ Transform Ethereum wallet for Redux
      const transformedEthWallet: AddressState = {
        accountName: `Account ${nextEthAccountNum}`,
        derivationPath: newEthWallet.derivationPath,
        address: newEthWallet.address,
        publicKey: newEthWallet.publicKey,
        balanceByChain: {},
        statusByChain: {},
        activeBalance: 0,
        failedNetworkRequestByChain: {},
        transactionMetadataByChain: {
          [activeChainId]: { transactions: [], paginationKey: undefined },
        },
        transactionConfirmations: [],
      };

      // 7️⃣ Transform Solana wallet for Redux
      const transformedSolWallet: SAddressState = {
        accountName: `Account ${nextSolAccountNum}`,
        derivationPath: newSolWallet.derivationPath,
        address: newSolWallet.address,
        publicKey: newSolWallet.publicKey,
        balance: 0,
        transactionMetadata: { paginationKey: undefined, transactions: [] },
        failedNetworkRequest: false,
        status: GeneralStatus.Idle,
        transactionConfirmations: [],
      };

      // 8️⃣ Dispatch to Redux
      await dispatch(updateAddresses({ addresses: [transformedEthWallet] }));
      console.log("transformedEthWallet", store)
      await dispatch(updateSolanaAddresses(transformedSolWallet));
    } catch (err) {
      console.error("Failed to create wallet pair:", err);
    } finally {
      setWalletCreationLoading(false);
    }
  }, [activeChainId, ethAccounts, solAccounts, dispatch]);

  // ----- memoizedAccounts -----
  const memoizedAccounts = useMemo(
    () =>
      priceAndBalanceLoading
        ? placeholderArr(ethAccounts.length || 3) // fallback 3 placeholders
        : accounts,
    [priceAndBalanceLoading, ethAccounts.length, accounts]
  );
  const setNextActiveAccounts = useCallback(
    (index: number) => {
      dispatch(clearActiveImportedAccount());
      dispatch(setActiveAccount({ index: index }));
      dispatch(setActiveSolanaAccount(index));
    },
    [dispatch, activeChainId]
  );
  const calculateTotalPrice = useCallback(
    (evmBalances: Record<number, number>, solBalance: number) => {
      const evmTotal = Object.entries(evmBalances).reduce(
        (acc, [chainIdStr, balance]) => {
          const chainId = Number(chainIdStr);
          const price = prices[chainId]?.usd ?? 0;
          return acc + balance * price;
        },
        0
      );

      const solUsd = prices[101]?.usd ?? 0; // assuming 101 = Solana
      const total = evmTotal + solBalance * solUsd;

      return formatDollar(total);
    },
    [prices]
  );

  // ----- renderItem -----
  const renderItem = useCallback(
    ({ item, index }) => {
      if (priceAndBalanceLoading) {
        return (
          <WalletSkeletonContainer
            isActiveAccount={false}
            isLast={index === accounts.length - 1}
          >
            <Skeleton
              height={35}
              colors={[theme.colors.grey, theme.colors.dark, theme.colors.dark, theme.colors.grey]}
              width={Dimensions.get("window").width * 0.6}
            />
            <Skeleton
              height={35}
              colors={[theme.colors.grey, theme.colors.dark, theme.colors.dark, theme.colors.grey]}
              width={50}
            />
          </WalletSkeletonContainer>
        );
      }

      const balance = calculateTotalPrice(
        balances ?? {},
        item.walletDetails.solana?.balance ?? 0
      );

      return (
        <WalletContainer
          onPress={() => {
            if (item.isImported) {
                dispatch(setActiveImportedAccount({
                  evmAddress: item.walletDetails.ethereum?.address,
                  solAddress: item.walletDetails.solana?.address,
                }));
              } else {
              setNextActiveAccounts(index);
            }
            router.back();
          }}
          isActiveAccount={item.isActiveAccount}
          isLast={index === accounts.length - 1}
        >
          <AccountDetails>
            <AccountTitle>{item.accountName}</AccountTitle>
            <PriceText>{item.isImported ? "Imported" : balance}</PriceText>
          </AccountDetails>
          <EditIconContainer
            onPress={() =>
              router.push({
                pathname: ROUTES.accountModal,
                params: {
                  ethAddress: item.walletDetails.ethereum?.address ?? "",
                  solAddress: item.walletDetails.solana?.address ?? "",
                  balance,
                },
              })
            }
          >
            <EditIcon width={20} height={20} fill={theme.colors.white} />
          </EditIconContainer>
        </WalletContainer>

      );
    },
    [
      accounts,
      priceAndBalanceLoading,
      balances,
      setNextActiveAccounts,
      theme.colors.white,
      theme.colors.dark,
    ]
  );


  return (
    <SafeAreaContainer>
      <ScrollContainer showsVerticalScrollIndicator={false}>
        <ContentContainer>
          <PageTitle>Manage Wallets</PageTitle>

          <WalletPhraseContainer
            onPress={() =>
              router.push({ pathname: ROUTES.seedPhrase, params: { readOnly: "true" } })
            }
          >
            <PhraseTextContent>
              <PhraseIcon width={25} height={25} fill={theme.colors.white} />
              <SectionTitle>Secret Recovery Phrase</SectionTitle>
            </PhraseTextContent>
            <RightArrowIcon width={25} height={25} fill={theme.colors.white} />
          </WalletPhraseContainer>

          {memoizedAccounts.map((item: any, index: number) => (
            <View key={item.id}>
              {renderItem({ item, index })}
            </View>
          ))}
        </ContentContainer>
      </ScrollContainer>

      <BottomButtonContainer>
        <Button
          linearGradient={theme.colors.primaryLinearGradient}
          loading={walletCreationLoading}
          onPress={createNewWalletPair}
          title="Create Wallet"
          backgroundColor={theme.colors.primary}
        />
      </BottomButtonContainer>
    </SafeAreaContainer>
  );
};

export default memo(AccountsIndex);
