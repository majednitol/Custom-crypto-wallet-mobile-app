import { useState } from "react";
import { router } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import {
  View,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { ThemeType } from "../../../styles/theme";
import { SafeAreaContainer } from "../../../components/Styles/Layout.styles";
import Button from "../../../components/Button/Button";
import { AppDispatch, RootState } from "../../../store";
import {
  addImportedEvmAccount,
  addImportedSolAccount,
  setActiveImportedAccount,
} from "../../../store/importedAccountSlice";
import { addAddress } from "../../../store/ethereumSlice";
import { updateSolanaAddresses } from "../../../store/solanaSlice";
import { GeneralStatus } from "../../../store/types";
import {
  getEvmAddressFromPrivateKey,
  getSolAddressFromPrivateKey,
  storeImportedEvmKey,
  storeImportedSolKey,
} from "../../../utils/importedKeyStorage";

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.medium};
  padding-top: 50px;
`;

const HeaderTitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${({ theme }) => theme.fonts.families.openBold};
  font-size: ${({ theme }) => theme.fonts.sizes.title};
  color: ${({ theme }) => theme.colors.white};
  margin-bottom: 24px;
`;

const Label = styled.Text<{ theme: ThemeType }>`
  font-family: ${({ theme }) => theme.fonts.families.openBold};
  font-size: ${({ theme }) => theme.fonts.sizes.normal};
  color: ${({ theme }) => theme.colors.lightGrey};
  margin-bottom: 8px;
  margin-top: 16px;
`;

const ChainSelector = styled.View`
  flex-direction: row;
  margin-bottom: 16px;
`;

const ChainButton = styled.TouchableOpacity<{
  theme: ThemeType;
  isActive: boolean;
}>`
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  background-color: ${({ theme, isActive }) =>
    isActive ? theme.colors.primary : theme.colors.cardBackground};
  border: 1px solid
    ${({ theme, isActive }) =>
      isActive ? theme.colors.primary : theme.colors.border};
  margin-right: ${({ isActive }) => (isActive ? "0px" : "8px")};
  margin-left: ${({ isActive }) => (isActive ? "8px" : "0px")};
  align-items: center;
`;

const ChainButtonText = styled.Text<{ theme: ThemeType; isActive: boolean }>`
  font-family: ${({ theme }) => theme.fonts.families.openBold};
  font-size: ${({ theme }) => theme.fonts.sizes.normal};
  color: ${({ theme, isActive }) =>
    isActive ? theme.colors.dark : theme.colors.white};
`;

const Input = styled.TextInput<{ theme: ThemeType }>`
  background-color: ${({ theme }) => theme.colors.cardBackground};
  border-radius: 12px;
  padding: 16px;
  color: ${({ theme }) => theme.colors.white};
  font-family: ${({ theme }) => theme.fonts.families.openRegular};
  font-size: ${({ theme }) => theme.fonts.sizes.normal};
  border: 1px solid ${({ theme }) => theme.colors.border};
  min-height: 100px;
  text-align-vertical: top;
`;

const WarningBox = styled.View<{ theme: ThemeType }>`
  background-color: rgba(255, 185, 0, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 185, 0, 0.3);
`;

const WarningText = styled.Text<{ theme: ThemeType }>`
  font-family: ${({ theme }) => theme.fonts.families.openRegular};
  font-size: ${({ theme }) => theme.fonts.sizes.small};
  color: ${({ theme }) => theme.colors.primary};
  line-height: 20px;
`;

const BottomContainer = styled.View<{ theme: ThemeType }>`
  padding: ${({ theme }) => theme.spacing.medium};
  padding-bottom: 32px;
`;

export default function ImportPrivateKeyScreen() {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const importedAccountsCount = useSelector((state: RootState) => state.importedAccounts.accounts.length);
  const nextImportedName = `Imported Account ${importedAccountsCount + 1}`;
  const [selectedChain, setSelectedChain] = useState<"evm" | "sol">("evm");
  const [privateKey, setPrivateKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async () => {
    if (!privateKey.trim()) {
      Alert.alert("Error", "Please enter a private key");
      return;
    }

    setIsLoading(true);
    try {
      if (selectedChain === "evm") {
        const address = getEvmAddressFromPrivateKey(privateKey.trim());
        await storeImportedEvmKey(address, privateKey.trim());
        dispatch(addImportedEvmAccount({ address }));
        // Register in globalAddresses so balance/tx thunks can update it
        dispatch(addAddress({
          accountName: nextImportedName,
          derivationPath: "",
          address,
          publicKey: address,
          balanceByChain: {},
          statusByChain: {},
          failedNetworkRequestByChain: {},
          transactionMetadataByChain: {},
          transactionConfirmations: [],
        }));
        // Set as active so send/balance screens detect it
        dispatch(setActiveImportedAccount({ evmAddress: address }));
        Alert.alert("Success", `EVM account imported\nAddress: ${address}`, [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        const address = getSolAddressFromPrivateKey(privateKey.trim());
        await storeImportedSolKey(address, privateKey.trim());
        dispatch(addImportedSolAccount({ address }));
        // Register in solana.addresses so balance/tx thunks can update it
        dispatch(updateSolanaAddresses({
          accountName: nextImportedName,
          derivationPath: "",
          address,
          publicKey: address,
          balance: 0,
          status: GeneralStatus.Idle,
          failedNetworkRequest: false,
          transactionMetadata: { paginationKey: undefined, transactions: [] },
          transactionConfirmations: [],
        }));
        // Set as active so send/balance screens detect it
        dispatch(setActiveImportedAccount({ solAddress: address }));
        Alert.alert("Success", `Solana account imported\nAddress: ${address}`, [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
      setPrivateKey("");
    } catch (error: any) {
      Alert.alert("Import Failed", error.message || "Invalid private key");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <ContentContainer>
              <HeaderTitle>Import Private Key</HeaderTitle>

              <WarningBox theme={theme}>
                <WarningText theme={theme}>
                  ⚠️ Warning: Importing a private key gives this wallet full
                  control over that account. Never share your private keys with
                  anyone.
                </WarningText>
              </WarningBox>

              <Label theme={theme}>Select Chain</Label>
              <ChainSelector>
                <ChainButton
                  theme={theme}
                  isActive={selectedChain === "evm"}
                  onPress={() => setSelectedChain("evm")}
                >
                  <ChainButtonText theme={theme} isActive={selectedChain === "evm"}>
                    Ethereum / EVM
                  </ChainButtonText>
                </ChainButton>
                <ChainButton
                  theme={theme}
                  isActive={selectedChain === "sol"}
                  onPress={() => setSelectedChain("sol")}
                >
                  <ChainButtonText theme={theme} isActive={selectedChain === "sol"}>
                    Solana
                  </ChainButtonText>
                </ChainButton>
              </ChainSelector>

              <Label theme={theme}>
                Private Key ({selectedChain === "evm" ? "0x..." : "hex or base58"})
              </Label>
              <Input
                theme={theme}
                multiline
                placeholder="Paste your private key here..."
                placeholderTextColor={theme.colors.lightGrey}
                value={privateKey}
                onChangeText={setPrivateKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </ContentContainer>

            <BottomContainer theme={theme}>
              <Button
                title="Import Account"
                onPress={handleImport}
                loading={isLoading}
                backgroundColor={theme.colors.primary}
              />
            </BottomContainer>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaContainer>
  );
}
