import { useState, ChangeEvent, useRef, act } from "react";
import { Platform } from "react-native";
import { useSelector } from "react-redux";
import { router, useLocalSearchParams } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import { Formik, FormikProps } from "formik";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ThemeType } from "../../../../styles/theme";
import { TICKERS } from "../../../../constants/tickers";
import { ROUTES } from "../../../../constants/routes";
import type { RootState } from "../../../../store";
import { Chains } from "../../../../types";
import SolanaIcon from "../../../../assets/svg/solana.svg";
import EthereumIcon from "../../../../assets/svg/ethereum_plain.svg";
import { capitalizeFirstLetter } from "../../../../utils/capitalizeFirstLetter";
import { formatDollar } from "../../../../utils/formatDollars";
// import ethService from "../../../../services/EthereumService";
import solanaService from "../../../../services/SolanaService";
import Button from "../../../../components/Button/Button";
import { SafeAreaContainer } from "../../../../components/Styles/Layout.styles";
import { EVMService, evmServices } from "../../../../services/EthereumService";
import { getPhrase } from "../../../../hooks/useStorageState";

type FormikChangeHandler = {
  (e: ChangeEvent<any>): void;
  <T = string | ChangeEvent<any>>(field: T): T extends ChangeEvent<any>
    ? void
    : (e: string | ChangeEvent<any>) => void;
};

interface TextInputProps {
  isAddressInputFocused?: boolean;
  isAmountInputFocused?: boolean;
  theme: ThemeType;
}

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: flex-start;
  padding: ${(props) => props.theme.spacing.medium};
  margin-top: ${(props) =>
    Platform.OS === "android" && props.theme.spacing.huge};
`;

const IconView = styled.View<{ theme: ThemeType }>`
  justify-content: center;
  align-items: center;
  margin-bottom: ${(props) => props.theme.spacing.medium};
  width: 100%;
`;

const IconBackground = styled.View<{ theme: ThemeType }>`
  background-color: ${(props) => props.theme.colors.ethereum};
  border-radius: 100px;
  padding: ${(props) => props.theme.spacing.large};
`;

const AddressTextInput = styled.TextInput<TextInputProps>`
  height: 60px;
  background-color: ${({ theme }) => theme.colors.lightDark};
  padding: ${({ theme }) => theme.spacing.medium};
  border: 1px solid
    ${({ theme, isAddressInputFocused }) =>
      isAddressInputFocused ? theme.colors.primary : theme.colors.grey};
  border-radius: ${({ theme }) => theme.borderRadius.default};
  color: ${({ theme }) => theme.fonts.colors.primary};
  font-size: ${(props) => props.theme.fonts.sizes.large};
  font-family: ${(props) => props.theme.fonts.families.openRegular};
`;

const AmountTextInput = styled.TextInput<TextInputProps>`
  height: 60px;
  color: ${({ theme }) => theme.fonts.colors.primary};
  font-size: ${(props) => props.theme.fonts.sizes.large};
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  padding: ${({ theme }) => theme.spacing.medium};
`;

const AmountTextInputContainer = styled.View<TextInputProps>`
  height: 60px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.lightDark};
  border: 1px solid
    ${({ theme, isAmountInputFocused }) =>
      isAmountInputFocused ? theme.colors.primary : theme.colors.grey};
  border-radius: ${({ theme }) => theme.borderRadius.default};
`;

const TextView = styled.View<{ theme: ThemeType }>`
  margin-bottom: ${({ theme }) => theme.spacing.medium};
`;

const TextContainer = styled.View<{ theme: ThemeType }>`
  margin-top: ${(props) => props.theme.spacing.large};
`;

const TransactionDetailsContainer = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  background-color: ${(props) => props.theme.colors.dark};
  justify-content: space-between;
  width: 100%;
`;

const TransactionDetailsText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => props.theme.fonts.sizes.large};
  color: ${(props) => props.theme.colors.lightGrey};
`;

const ErrorText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.error};
  margin-bottom: ${(props) => props.theme.spacing.small};
`;

const MaxButton = styled.TouchableOpacity<{ theme: ThemeType }>`
  background-color: ${(props) => props.theme.colors.primary};
  padding: ${(props) => props.theme.spacing.medium};
  border-radius: ${(props) => props.theme.borderRadius.default};
  align-items: center;
  justify-content: center;
  margin-right: 2px;
`;

const TickerText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.large};
  color: ${(props) => props.theme.colors.lightGrey};
  text-align: center;
  margin-right: ${(props) => props.theme.spacing.medium};
`;

const MaxText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.large};
  color: ${(props) => props.theme.colors.white};
  text-align: center;
  width: 50px;
`;

const AmountDetailsView = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  align-items: center;
`;

const ButtonContainer = styled.View<{ theme: ThemeType }>`
  margin-bottom: ${(props) => props.theme.spacing.medium};
`;

const ButtonView = styled.View<{ theme: ThemeType }>``;

const FormWrapper = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: space-between;
`;

interface FormValues {
  address: string;
  amount: string;
}
export default function SendPage() {
  // const { send, toAddress } = useLocalSearchParams();
  const { send, toAddress, token, balance,symbol, symbol: tokenSymbol, chainId: tokenChainId,Erc20TokenName,erc20tokenAddress,solAddess,chainId ,nativeTokenSymbol} =
  useLocalSearchParams();

  const theme = useTheme();
  const formRef = useRef<FormikProps<FormValues>>(null);

  const chainName = send as string;
  console.log("chainName345", balance);
  
  let currentChainName = ""; 
 if (chainName === Chains.Solana) {
    currentChainName = "solana";
 } else {
   currentChainName = "ethereum";
  }

  const toWalletAddress = toAddress as string;
  const ticker = TICKERS[currentChainName];
 console.log("solAddessfe2fer3gfr3gfr3",solAddess)

  const activeChainId = useSelector(
  (state: RootState) => state.ethereum.activeChainId
);

const activeEthIndex = useSelector(
  (state: RootState) =>
    state.ethereum.activeIndex[activeChainId] ?? 0
);
  // const service = evmServices[activeChainId];

const service = evmServices[activeChainId];
// check before usage
if (currentChainName === Chains.EVM && !service) {
  console.warn(`EVM service not initialized for chain ${activeChainId}`);
}

  const activeSolIndex = useSelector(
    (state: RootState) => state.solana.activeIndex
  );
const tokenBalance = useSelector((state: RootState) => {
  if (currentChainName == "ethereum") {

    const activeEthIndex = state.ethereum.activeIndex[state.ethereum.activeChainId] ?? 0;

    console.log("tokenBalance",state.ethereum.globalAddresses?.[activeEthIndex]. balanceByChain[state.ethereum.activeChainId])  
    return state.ethereum.globalAddresses?.[activeEthIndex].balanceByChain[state.ethereum.activeChainId]; 
  } else if (currentChainName === Chains.Solana) {
    if (token) {
      // SPL token balance
      return tokenParam
  ? state.solToken.balances[tokenParam]?.amount ?? 0
  : 0

    }

    // Native SOL
    const activeSolIndex = state.solana.activeIndex ?? 0;
    return state.solana.addresses[activeSolIndex].balance;
  }
  return undefined;
});
console.log(currentChainName, activeChainId, activeEthIndex, activeSolIndex, tokenBalance)
 




// const failedStatus = activeAccount?.status === GeneralStatus.Failed ?? false;
  const address = useSelector(
    (state: RootState) => state["solana"]?.addresses[activeSolIndex]?.address
  );
  const prices = useSelector((state: RootState) => state.price.data);
  const solPrice = prices[101]?.usd;
  const ethPrice = prices[activeChainId].usd;

  const [isAddressInputFocused, setIsAddressInputFocused] = useState(false);
  const [isAmountInputFocused, setIsAmountInputFocused] = useState(false);
const tokenParam = Array.isArray(token) ? token[0] : token;
const tokenSymbolParam = Array.isArray(tokenSymbol) ? tokenSymbol[0] : tokenSymbol;
const tokenChainIdParam = Array.isArray(tokenChainId)
  ? tokenChainId[0]
  : tokenChainId;

  const renderIcons = () => {
    switch (currentChainName) {
      
      case Chains.Solana:
        console.log("chainName22",chainName);
        return <SolanaIcon width={45} height={45} />;
      case Chains.EVM:
        return <EthereumIcon width={45} height={45} />;
      default:
        return null;
    }
  };

  const renderDollarAmount = (amountValue: string) => {
    if (amountValue === "") return formatDollar(0);
// Ensure tokenSymbol is a string
const tokenSymbolStr = Array.isArray(tokenSymbol) ? tokenSymbol[0] : tokenSymbol;

const chainPrice =
  currentChainName === Chains.Solana
    ? token
      ? prices[tokenParam]?.usd ?? 0
  // SPL token price
      : solPrice                 // Native SOL
    : token
      ? prices[tokenParam]?.usd ?? 0

      : ethPrice;

console.log("chainPrice",chainPrice)
    const USDAmount = chainPrice * parseFloat(amountValue);
    // console.log("USDAmount45",USDAmount)
    return formatDollar(USDAmount);
  };

  const handleNumericChange =
    (handleChange: FormikChangeHandler) => (field: string) => {
      return (value: string | ChangeEvent<any>) => {
        const finalValue =
          typeof value === "object" && value.target
            ? value.target.value
            : value;
        const numericValue = finalValue
          .replace(/[^0-9.]/g, "")
          .replace(/(\..*)\./g, "$1");
        handleChange(field)(numericValue);
      };
    };

  const validateFields = async (values: FormValues) => {
    const errors: Record<string, string> = {};

    if (!values.address) {
      errors.address = "This field is required";
    }
    if (!values.amount) {
      errors.amount = "This field is required";
    }

    const isAddressValid = await validateAddress(values.address);
    if (!isAddressValid) {
      errors.address = "Recipient address is invalid";
    }

    if (values.amount && parseFloat(values.amount) > 0) {
      await validateFunds(values, errors);
    }

    return errors;
  };

  const validateAddress = async (address: string): Promise<boolean> => {
    return currentChainName === Chains.EVM
      ? EVMService.validateAddress(address)
      : await solanaService.validateAddress(address);
  };
 const rawBalance =
      Array.isArray(balance) ? balance[0] : balance;
  const balanceNumber = Number(rawBalance);
  console.log("balanceNumber",balanceNumber)
  const validateFunds = async (
  values: FormValues,
  errors: Record<string, string>
) => {
  const amount = parseFloat(values.amount);
  const nativeBalance =
    typeof tokenBalance === "string" ? parseFloat(tokenBalance) : tokenBalance;
  const erc20Balance = Array.isArray(balance) ? balance[0] : balance;

  if (!token) {
    if (amount > Number(nativeBalance)) {
      errors.amount = "Insufficient funds";
    } else {
      await calculateCostsAndValidate(amount, values.address, errors);
    }
  } else {
    if (amount > Number(erc20Balance)) {
      errors.amount = "Insufficient funds";
    } else {
      await calculateCostsAndValidate(amount, values.address, errors);
    }
  }
};


  const calculateCostsAndValidate = async (
    amount: number,
    toAddress: string,
    errors: Record<string, string>
  ) => {
    if (currentChainName === Chains.EVM) {
      const seedPhrase = await getPhrase();
      try {
        if (token) {
           const nativeBalance =
        typeof tokenBalance === "string" ? parseFloat(tokenBalance) : tokenBalance;
           const { wallet } = EVMService.deriveWalletByIndex(
                    seedPhrase,
                    activeEthIndex
           );
           const ethPrivateKey = wallet.privateKey;
           const gasResult  = await service.calculateGasAndAmountsForERC20Transfer(ethPrivateKey, erc20tokenAddress as string, toAddress, amount.toString())
          
                  if (!gasResult) {
          errors.amount = "Failed to estimate gas";
          return;
        }

        const gasCostEth = Number(gasResult.gasCostEth);
console.log("gasCostEth",gasCostEth,  nativeBalance)
        // 3️⃣ Check native balance for gas only
        if (gasCostEth > nativeBalance) {
          errors.amount = "Insufficient native balance for gas fees";
          return;
        }
            return;
        }
      const { totalCostMinusGas } = await service.calculateGasAndAmounts(
        toAddress,
        amount.toString()
      );

      // Compare using parseFloat to handle decimals safely
      const balanceNumber =
        typeof tokenBalance === "string" ? parseFloat(tokenBalance) : tokenBalance;
console.log(" totalCostMinusGas ",totalCostMinusGas,balanceNumber )
      if (parseFloat(totalCostMinusGas) > balanceNumber) {
        errors.amount = "Insufficient funds for amount plus gas costs";
      }
    } catch (error) {
      console.error("EVM cost validation failed:", error);
      errors.amount = "Failed to validate transaction costs";
    }
    } else if (currentChainName === Chains.Solana) {
      const transactionFeeLamports =
        await solanaService.calculateTransactionFee(address, toAddress, amount);

      const tokenBalanceLamports = amount * LAMPORTS_PER_SOL;
      const maxAmountLamports = tokenBalanceLamports - transactionFeeLamports;
      const maxAmount = maxAmountLamports / LAMPORTS_PER_SOL;
      if (maxAmount > amount) {
        errors.amount = "Insufficient funds for amount plus transaction fees";
      }
    }
  };

// const calculateCostsAndValidate = async (
//     amount: number,
//     toAddress: string,
//     errors: Record<string, string>
//   ) => {
//     if (currentChainName === Chains.EVM) {
//       const { totalCostMinusGas } = await service.calculateGasAndAmounts(
//         toAddress,
//         amount.toString()
//       );
//      if (Number(totalCostMinusGas) > (typeof tokenBalance === "string" ? parseFloat(tokenBalance) : tokenBalance)) {
//   errors.amount = "Insufficient funds for amount plus gas costs";
// }
//     } else if (currentChainName === Chains.Solana) {
//       const transactionFeeLamports =
//         await solanaService.calculateTransactionFee(address, toAddress, amount);

//       const tokenBalanceLamports = amount * LAMPORTS_PER_SOL;
//       const maxAmountLamports = tokenBalanceLamports - transactionFeeLamports;
//       const maxAmount = maxAmountLamports / LAMPORTS_PER_SOL;
//       if (maxAmount > amount) {
//         errors.amount = "Insufficient funds for amount plus transaction fees";
//       }
//     }
//   };

  const calculateMaxAmount = async (
    setFieldValue: (field: string, value: any) => void,
    tokenBalance: string,
    address: string
  ) => {
    const toAddress = formRef.current?.values?.address || "";

    const isAddressValid =
      currentChainName === Chains.EVM
        ?  EVMService.validateAddress(toAddress)
        : await solanaService.validateAddress(toAddress);

    if (!isAddressValid) {
      formRef.current?.setFieldError(
        "address",
        "A valid address is required to calculate max amount"
      );
      return;
    }

    try {
      if (currentChainName === Chains.EVM) {
        const { totalCostMinusGas } = await service.calculateGasAndAmounts(
          address,
          rawBalance
        );

        if (!token) {
  // native ETH, subtract gas
  const { totalCostMinusGas } = await service.calculateGasAndAmounts(
    address,
    tokenBalance
  ); setFieldValue("amount", totalCostMinusGas);
} else {
  setFieldValue("amount", tokenBalance);
}
        // setFieldValue("amount", totalCostMinusGas);
      }  else if (currentChainName === Chains.Solana) {
  if (token) {
    // SPL token → no fee subtraction
    setFieldValue("amount", tokenBalance);
    return;
  }

  // Native SOL
  const balanceLamports = Number(tokenBalance) * LAMPORTS_PER_SOL;
  const feeLamports =
    await solanaService.calculateTransactionFee(address, toAddress, balanceLamports);

  const maxLamports = balanceLamports - feeLamports;
  setFieldValue(
    "amount",
    Math.max(maxLamports / LAMPORTS_PER_SOL, 0).toString()
  );
}

    } catch (error) {
      console.error("Failed to calculate max amount:", error);
      setFieldValue("amount", "0");
    }
  };

  const handleSubmit = async (values: { address: string; amount: string }) => {
    router.push({
      pathname: ROUTES.sendConfirmation,
      params: {
        address: values.address,
        amount: values.amount,
        chainName: currentChainName,
        Erc20TokenName: Erc20TokenName,
        tokenSymbol: tokenSymbol,
        token: token,
        erc20tokenAddress: erc20tokenAddress,
        solAddess: solAddess,
        
      },
    });
  };

  const initialValues = { address: toWalletAddress, amount: "" };

  return (
    <SafeAreaContainer>
      <ContentContainer>
        <IconView>
          <IconBackground>{renderIcons()}</IconBackground>
        </IconView>
        <Formik
          innerRef={formRef}
          initialValues={initialValues}
          validate={validateFields}
          onSubmit={handleSubmit}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            setFieldValue,
          }) => (
            <FormWrapper>
              <TextContainer>
                <TextView>
                  <AddressTextInput
                    isAddressInputFocused={isAddressInputFocused}
                    placeholder={`Recipient's ${capitalizeFirstLetter(
                      currentChainName
                    )} address`}
                    value={values.address}
                    onChangeText={handleChange("address")}
                    onFocus={() => setIsAddressInputFocused(true)}
                    onBlur={handleBlur("email")}
                    onEndEditing={() => setIsAddressInputFocused(false)}
                    placeholderTextColor={theme.colors.lightGrey}
                  />
                </TextView>
                {errors.address && <ErrorText>{errors.address}</ErrorText>}
                <TextView>
                  <AmountTextInputContainer>
                    <AmountTextInput
                      returnKeyType="done"
                      isAmountInputFocused={isAmountInputFocused}
                      placeholder="Amount"
                      value={values.amount}
                      onChangeText={handleNumericChange(handleChange)("amount")}
                      onFocus={() => setIsAmountInputFocused(true)}
                      onBlur={handleBlur("email")}
                      onEndEditing={() => setIsAmountInputFocused(false)}
                      placeholderTextColor={theme.colors.lightGrey}
                      keyboardType="numeric"
                    /> 
                    <AmountDetailsView>
                     <TickerText>
  {tokenSymbolParam || (currentChainName === Chains.Solana ? "SOL" : nativeTokenSymbol)}


</TickerText>


                      <MaxButton
                        onPress={() =>
                          calculateMaxAmount(
                            setFieldValue,
                            tokenBalance.toString(),
                            values.address
                          )
                        }
                      >
                        <MaxText>Max</MaxText>
                      </MaxButton>
                    </AmountDetailsView>
                  </AmountTextInputContainer>
                </TextView>
                {errors.amount && <ErrorText>{errors.amount}</ErrorText>}
                <TransactionDetailsContainer>
                  <TransactionDetailsText>
                    {renderDollarAmount(values.amount)}
                  </TransactionDetailsText>
                  <TransactionDetailsText>
                     Available {token ?balance  : tokenBalance} {tokenSymbol || nativeTokenSymbol}
                  </TransactionDetailsText>
                </TransactionDetailsContainer>
              </TextContainer>
              <ButtonView>
                <ButtonContainer>
                  <Button
                    backgroundColor={theme.colors.lightDark}
                    color={theme.colors.white}
                    onPress={() => router.back()}
                    title="Cancel"
                  />
                </ButtonContainer>
                <ButtonContainer>
                  <Button
                    backgroundColor={theme.colors.primary}
                    onPress={handleSubmit}
                    title="Next"
                  />
                </ButtonContainer>
              </ButtonView>
            </FormWrapper>
          )}
        </Formik>
      </ContentContainer>
    </SafeAreaContainer>
  );
}
