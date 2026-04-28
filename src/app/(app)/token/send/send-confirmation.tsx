import React, { useState, useEffect } from "react";
import { Platform } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { useLocalSearchParams, router, useNavigation } from "expo-router";
import { StackActions } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import { Chains } from "../../../../types";
import type { ThemeType } from "../../../../styles/theme";
import ConfirmSend from "../../../../assets/svg/confirm-send.svg";
import { formatDollar } from "../../../../utils/formatDollars";
import { TICKERS } from "../../../../constants/tickers";
import { truncateWalletAddress } from "../../../../utils/truncateWalletAddress";
import SendConfCard from "../../../../components/SendConfCard/SendConfCard";
import { capitalizeFirstLetter } from "../../../../utils/capitalizeFirstLetter";
import Button from "../../../../components/Button/Button";
// import ethService from "../../../../services/EthereumService";
import solanaService from "../../../../services/SolanaService";
import { getPhrase } from "../../../../hooks/useStorageState";
import type { RootState, AppDispatch } from "../../../../store";
import { sendEvmTransaction } from "../../../../store/ethereumSlice";
import { sendSolanaTransaction } from "../../../../store/solanaSlice";
import { BalanceContainer } from "../../../../components/Styles/Layout.styles";
import { SafeAreaContainer } from "../../../../components/Styles/Layout.styles";
import { ROUTES } from "../../../../constants/routes";
import { EVMService, evmServices } from "../../../../services/EthereumService";
import { sendErc20 } from "../../../../store/tokenSlice";
import { getImportedEvmKey, getImportedSolKey } from "../../../../utils/importedKeyStorage";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58ToBytes(base58Str: string): Uint8Array {
  const alphabetMap = new Map<string, number>();
  for (let i = 0; i < BASE58_ALPHABET.length; i++) {
    alphabetMap.set(BASE58_ALPHABET[i], i);
  }
  let leadingZeros = 0;
  for (const char of base58Str) {
    if (char === "1") leadingZeros++;
    else break;
  }
  const base = BigInt(58);
  let num = BigInt(0);
  for (const char of base58Str) {
    const val = alphabetMap.get(char);
    if (val === undefined) throw new Error(`Invalid base58 character: ${char}`);
    num = num * base + BigInt(val);
  }
  const hex = num.toString(16);
  const hexPadded = hex.length % 2 === 1 ? "0" + hex : hex;
  const bytes: number[] = [];
  for (let i = 0; i < hexPadded.length; i += 2) {
    bytes.push(parseInt(hexPadded.slice(i, i + 2), 16));
  }
  const result = new Uint8Array(leadingZeros + bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[leadingZeros + i] = bytes[i];
  }
  return result;
}

function solKeyStringToUint8Array(keyStr: string): Uint8Array {
  const hex = keyStr.startsWith("0x") ? keyStr.slice(2) : keyStr;
  if (/^[0-9a-fA-F]+$/.test(hex) && hex.length >= 64) {
    return new Uint8Array(hex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  }
  return base58ToBytes(keyStr);
}

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: flex-start;
  padding: ${(props) => props.theme.spacing.medium};
  margin-top: ${(props) =>
    Platform.OS === "android" && props.theme.spacing.huge};
`;

const IconBackground = styled.View<{ theme: ThemeType }>`
  background-color: ${(props) => props.theme.colors.cardBackground};
  border-radius: 32px;
  width: 80px;
  height: 80px;
  justify-content: center;
  align-items: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  
`;

const IconView = styled.View<{ theme: ThemeType }>`
  justify-content: center;
  align-items: center;
  margin-bottom: ${(props) => props.theme.spacing.medium};
  width: 100%;
`;

const CryptoBalanceText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.huge};
  color: ${(props) => props.theme.fonts.colors.primary};
  text-align: center;
`;

const UsdBalanceText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.title};
  color: ${(props) => props.theme.colors.lightGrey};
  text-align: center;
`;

const CryptoInfoCardContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: ${(props) => props.theme.spacing.medium};
`;

const ButtonContainer = styled.View<{ theme: ThemeType }>`
  margin-bottom: ${(props) => props.theme.spacing.small};
`;

const ErrorView = styled.View<{ theme: ThemeType }>`
  margin-top: ${(props) => props.theme.spacing.medium};
`;

const ErrorText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.error};
  text-align: center;
`;

const ButtonView = styled.View<{ theme: ThemeType }>`
  width: 100%;
  padding-horizontal: ${(props) => props.theme.spacing.medium};
`;



export default function SendConfirmationPage() {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const {
    address: toAddress,
    amount: tokenAmount,
    chainName: chain,
    token, Erc20TokenName, tokenSymbol,erc20tokenAddress,solAddess
  } = useLocalSearchParams();
  const navigation = useNavigation();
  console.log("token", token);
  const chainName = chain as string;
  console.log("chainName conf", chainName,tokenAmount);
  const ticker = TICKERS[chainName] ;
  const amount = tokenAmount as string;
  const address = toAddress as string;

  const prices = useSelector((state: RootState) => state.price.data);
  const activeEthIndex = useSelector(
    (state: RootState) => state.ethereum.activeIndex ?? 0
  );

  const activeSolIndex = useSelector(
    (state: RootState) => state.solana.activeIndex
  );
  const activeChainId = useSelector(
    (state: RootState) => state.ethereum.activeChainId
  );

  // Imported wallet detection — must be before walletAddress/derivationPath
  const importedEvmAddress = useSelector((state: RootState) => state.importedAccounts?.activeEvmAddress);
  const importedSolAddress = useSelector((state: RootState) => state.importedAccounts?.activeSolAddress);
  const isImportedEvm = !!importedEvmAddress;
  const isImportedSol = !!importedSolAddress;

  const walletAddress = useSelector((state: RootState) => {
    if (importedEvmAddress) return importedEvmAddress;
    return state.ethereum.globalAddresses[activeEthIndex]?.address ?? "";
  });
  console.log("nwalletAddress", walletAddress)
  const derivationPath = useSelector(
    (state: RootState) =>
      state.solana.addresses[activeSolIndex]?.derivationPath
  );

  const solPrice = prices[101]?.usd;
  const ethPrice = prices[activeChainId].usd;

  const [transactionFeeEstimate, setTransactionFeeEstimate] = useState("0.00");
  const [totalCost, setTotalCost] = useState("0.00");
  const [error, setError] = useState<string | null>(null);
  const [isBtnDisabled, setBtnDisabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const chainBalance = `${amount} ${ticker}`;

  const evmService = evmServices[activeChainId];
  if (!evmService) {
    throw new Error("EVM service not initialized");
  }

const csolAddess = Array.isArray(solAddess) // or whatever variable name
  ? solAddess[0]
  : solAddess;
  
  const handleSubmit = async () => {

    setLoading(true);
    setBtnDisabled(true);

    try {
      if (chainName === Chains.EVM) {
        let ethPrivateKey: string;

        let evmIsImported = isImportedEvm && !!importedEvmAddress;

        console.log("EVM SEND DEBUG:", { isImportedEvm, importedEvmAddress, walletAddress });

        if (!evmIsImported && walletAddress) {
          // Fallback: check if sender address has a key in SecureStore
          const fallbackKey = await getImportedEvmKey(walletAddress);
          if (fallbackKey) {
            console.log("FALLBACK: Found imported EVM key for", walletAddress);
            evmIsImported = true;
          }
        }

        if (evmIsImported) {
          const addrToLookup = importedEvmAddress || walletAddress;
          const key = await getImportedEvmKey(addrToLookup);
          if (!key) throw new Error("Failed to retrieve imported private key");
          ethPrivateKey = key;
        } else {
          // Derive key from seed phrase for standard wallets
          const seedPhrase = await getPhrase();
          const { wallet } = EVMService.deriveWalletByIndex(
            seedPhrase,
            activeEthIndex
          );
          ethPrivateKey = wallet.privateKey;
        }
console.log("ethPrivateKey",ethPrivateKey)

        const isErc20 = erc20tokenAddress?.toString();
      

        let txResult;
        if (isErc20) {
          txResult = await dispatch(
            sendErc20({
              chainId: activeChainId,
              token: isErc20!,
              privateKey: ethPrivateKey,
              to: address,
              amount
            })
          ).unwrap();
        } else {
          txResult = await dispatch(
            sendEvmTransaction({
              chainId: activeChainId,
              from: walletAddress,
              privateKey: ethPrivateKey,
              to: address,
              amount: parseFloat(amount),
            })
          ).unwrap();
        }
        if (txResult) {
          navigation.dispatch(StackActions.popToTop());

          const txHash =
            typeof txResult === "string"
              ? txResult           
              : txResult.tx.hash;

          router.push({
            pathname: ROUTES.confirmation,
            params: {
              txHash,
              blockchain: Chains.EVM,
            },
          });
          console.log("txResult", txHash)
        }
      } else if (chainName === Chains.Solana) {
        let solPrivateKey: Uint8Array;

        // Primary check: Redux state says this is imported
        let solIsImported = isImportedSol && !!importedSolAddress;
        let solSenderAddress = solIsImported ? importedSolAddress : csolAddess;

        console.log("SOL SEND DEBUG:", { isImportedSol, importedSolAddress, csolAddess, derivationPath });

        if (!solIsImported && csolAddess) {
          // Fallback: check if sender address has a key in SecureStore
          const fallbackKey = await getImportedSolKey(csolAddess as string);
          if (fallbackKey) {
            console.log("FALLBACK: Found imported key in SecureStore for", csolAddess);
            solIsImported = true;
            solSenderAddress = csolAddess as string;
          }
        }

        if (solIsImported && solSenderAddress) {
          // Retrieve key from SecureStore for imported wallets
          const keyStr = await getImportedSolKey(solSenderAddress as string);
          if (!keyStr) throw new Error("Failed to retrieve imported private key");
          solPrivateKey = solKeyStringToUint8Array(keyStr);
        } else {
          // Derive key from seed phrase for standard wallets
          const seedPhrase = await getPhrase();
          solPrivateKey = await solanaService.derivePrivateKeysFromPhrase(
            seedPhrase,
            derivationPath
          );
        }

        console.log("solPrivateKey",solPrivateKey)
        const senderSolAddress = solSenderAddress || csolAddess;
        const result = await dispatch(
          sendSolanaTransaction({
            privateKey: solPrivateKey,
            address,
            amount,
            fromAddress: senderSolAddress as string,
          })
        ).unwrap();

        if (result?.txHash) {
          navigation.dispatch(StackActions.popToTop());
          router.push({
            pathname: ROUTES.confirmation,
            params: { txHash: result.txHash, blockchain: Chains.Solana },
          });
        }
      }
    } catch (error) {
      console.error("Failed to send transaction:", error);
      setError("Failed to send transaction. Please try again later.");
    } finally {
      setLoading(false);
      setBtnDisabled(false);
    }
  };

 
  const nativeEthBalance = useSelector((state: RootState) => {
    const chainId = state.ethereum.activeChainId;
    const account = isImportedEvm && importedEvmAddress
      ? state.ethereum.globalAddresses?.find(a => a.address?.toLowerCase() === importedEvmAddress.toLowerCase())
      : state.ethereum.globalAddresses?.[state.ethereum.activeIndex ?? 0];
    console.log("chainId", chainId, account?.activeBalance ?? 0)
    return account?.activeBalance ?? 0;
  });

  console.log("solPrice",chainName)
    const calculateTransactionCosts = async () => {
    const chainPrice = chainName === Chains.EVM ? ethPrice : solPrice;
    try {
      if (chainName === Chains.EVM) {
        const isErc20 = Boolean(erc20tokenAddress);

        if (isErc20) {
          // ERC20 transfer - get private key for gas estimation
          let ethPrivateKey: string;
          if (isImportedEvm && importedEvmAddress) {
            const key = await getImportedEvmKey(importedEvmAddress);
            if (!key) throw new Error("Failed to retrieve imported private key");
            ethPrivateKey = key;
          } else {
            const seedPhrase = await getPhrase();
            const { wallet } = EVMService.deriveWalletByIndex(seedPhrase, activeEthIndex);
            ethPrivateKey = wallet.privateKey;
          }

          const gasResult = await evmService.calculateGasAndAmountsForERC20Transfer(
            ethPrivateKey,
            erc20tokenAddress as string,
            address,
            amount
          );

          if (gasResult) {
            const gasCostEth = Number(gasResult.gasCostEth);
            const gasEstimateUsd = formatDollar(gasCostEth * chainPrice);
            setTransactionFeeEstimate(gasEstimateUsd);
            setTotalCost(formatDollar(parseFloat(amount) * chainPrice));
           
              
            if (gasCostEth > Number(amount)) {
              setError("Insufficient native balance to cover gas fees for ERC20 transfer.");
              setBtnDisabled(true);
            } else {
              setError("");
              setBtnDisabled(false);
            }
          }
        } else {
          const { gasEstimate, totalCost, totalCostMinusGas } =
            await evmService.calculateGasAndAmounts(address, amount);

          const gasEstimateUsd = formatDollar(
            parseFloat(gasEstimate) * chainPrice
          );

          const totalCostPlusGasUsd = formatDollar(
            parseFloat(totalCost) * chainPrice
          );

          setTransactionFeeEstimate(gasEstimateUsd);
          setTotalCost(totalCostPlusGasUsd);

          if (totalCostMinusGas > amount) {
            setError("Not enough funds to send transaction.");
            setBtnDisabled(true);
          } else {
            setError("");
            setBtnDisabled(false);
          }
        }
      }
      if (chainName === Chains.Solana) {
        console.log("wefwefew",
            address,solAddess,
            parseFloat(amount))
        const transactionFeeLamports =
          await solanaService.calculateTransactionFee(
            csolAddess,
            address,
            parseFloat(amount)
          );

        const tokenBalanceLamports = parseFloat(amount) * LAMPORTS_PER_SOL;
        const maxAmountLamports = tokenBalanceLamports - transactionFeeLamports;
        const transactionFeeSol = transactionFeeLamports / LAMPORTS_PER_SOL;
        const maxAmount = maxAmountLamports / LAMPORTS_PER_SOL;

        const txFeeFloat = transactionFeeSol * chainPrice;
        const txFeeEstimateUsd = formatDollar(txFeeFloat);
        const totalCostPlusTxFeeUsd = formatDollar(maxAmount * chainPrice);
console.log("totalCostPlusTxFeeUsd",totalCostPlusTxFeeUsd)
        if (txFeeFloat > 0 && txFeeFloat < 0.01) {
          setTransactionFeeEstimate(`< ${txFeeEstimateUsd}`);
console.log("totalCostPlusTxFeeUsd",txFeeEstimateUsd)

        } else {
          setTransactionFeeEstimate(txFeeEstimateUsd);
          setTransactionFeeEstimate
        }

        setTotalCost(totalCostPlusTxFeeUsd);

        if (maxAmount > parseFloat(amount)) {
          setError("Not enough funds to send transaction.");
          setBtnDisabled(true);
        } else {
          setError("");
          setBtnDisabled(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch transaction costs:", error);
    }
  };
  useEffect(() => {
    calculateTransactionCosts();

    const intervalId = setInterval(async () => {
      await calculateTransactionCosts();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [address, amount]);

  const renderNetworkName = () => {
    const isDev = "development" === "development";
    if (chainName === Chains.EVM) {
      return isDev ? "Sepolia" : "Mainnet";
    }
    return isDev ? "Devnet" : "Mainnet";
  };

  return (
    <SafeAreaContainer>
      <ContentContainer>
        <IconView>
          <IconBackground>
            <ConfirmSend width={40} height={40} fill={theme.colors.primary} />
          </IconBackground>
        </IconView>
        <BalanceContainer>
          <CryptoBalanceText>{chainBalance}</CryptoBalanceText>
          <UsdBalanceText>{totalCost}</UsdBalanceText>
        </BalanceContainer>

        <CryptoInfoCardContainer>
          <SendConfCard
            toAddress={truncateWalletAddress(address)}
            network={`${capitalizeFirstLetter(
              chainName
            )} ${renderNetworkName()}`}
            networkFee={`Up to ${transactionFeeEstimate}`}
          />
          {error && (
            <ErrorView>
              <ErrorText>{error}</ErrorText>
            </ErrorView>
          )}
        </CryptoInfoCardContainer>
        <ButtonView>
          <ButtonContainer>
            <Button
              linearGradient={theme.colors.primaryLinearGradient}
              loading={loading}
              disabled={isBtnDisabled}
              backgroundColor={theme.colors.primary}
              onPress={handleSubmit}
              title="Send"
            />
          </ButtonContainer>
        </ButtonView>
      </ContentContainer>
    </SafeAreaContainer>
  );
}
