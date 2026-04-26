import { router } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import { useSelector, useDispatch } from "react-redux";
import { useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { useState } from "react";
import { Alert } from "react-native";
import { ROUTES } from "../../../constants/routes";
import type { ThemeType } from "../../../styles/theme";
import type { RootState, AppDispatch } from "../../../store";
import type { AddressState, SAddressState } from "../../../store/types";
import EditIcon from "../../../assets/svg/edit.svg";
import { BlockchainIcon } from "../../../components/BlockchainIcon/BlockchainIcon";
import CopyIcon from "../../../assets/svg/copy.svg";
import { SafeAreaContainer } from "../../../components/Styles/Layout.styles";
import { authenticateBiometric } from "../../../store/biometricsSlice";
import { deriveEthPrivateKey, deriveSolPrivateKey } from "../../../utils/privateKeyUtils";
import { getImportedEvmKey, getImportedSolKey } from "../../../utils/importedKeyStorage";

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: flex-start;
  padding: ${(props) => props.theme.spacing.medium};
  padding-top: 50px;
`;
const SectionTitle = styled.Text<{ theme: ThemeType }>`
  color: ${(props) => props.theme.fonts.colors.primary};
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.header};
  margin-bottom: ${(props) => props.theme.spacing.large};
  margin-top: ${(props) => props.theme.spacing.medium};
  margin-left: ${(props) => props.theme.spacing.medium};
`;

const AccountDetailsText = styled.Text<{ theme: ThemeType }>`
  color: ${(props) => props.theme.fonts.colors.primary};
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.large};
  margin-left: ${(props) => props.theme.spacing.medium};
`;

const AccountSettingsContainer = styled.View<{ theme: ThemeType }>`
  margin-bottom: ${(props) => props.theme.spacing.medium};
`;

const AccountSection = styled.View<{
  theme: ThemeType;
  isBottom?: boolean;
  isTop?: boolean;
}>`
  background-color: ${({ theme }) => theme.colors.lightDark};
  padding: ${(props) => props.theme.spacing.medium};
  border-bottom-left-radius: ${({ theme, isBottom }) =>
    isBottom ? theme.borderRadius.large : "0px"};
  border-bottom-right-radius: ${({ theme, isBottom }) =>
    isBottom ? theme.borderRadius.large : "0px"};
  border-top-left-radius: ${({ theme, isTop }) =>
    isTop ? theme.borderRadius.large : "0px"};
  border-top-right-radius: ${({ theme, isTop }) =>
    isTop ? theme.borderRadius.large : "0px"};
  padding-right: ${(props) => props.theme.spacing.large};
  padding-left: ${(props) => props.theme.spacing.large};
  border: 1px solid ${(props) => props.theme.colors.dark};
`;

const CryptoSection = styled.View<{
  theme: ThemeType;
  isBottom?: boolean;
  isTop?: boolean;
}>`
  flex-direction: row;
  background-color: ${({ theme }) => theme.colors.lightDark};
  padding: ${(props) => props.theme.spacing.medium};
  border-bottom-left-radius: ${({ theme, isBottom }) =>
    isBottom ? theme.borderRadius.large : "0px"};
  border-bottom-right-radius: ${({ theme, isBottom }) =>
    isBottom ? theme.borderRadius.large : "0px"};
  border-top-left-radius: ${({ theme, isTop }) =>
    isTop ? theme.borderRadius.large : "0px"};
  border-top-right-radius: ${({ theme, isTop }) =>
    isTop ? theme.borderRadius.large : "0px"};
  padding-right: ${(props) => props.theme.spacing.large};
  padding-left: ${(props) => props.theme.spacing.large};
  border: 1px solid ${(props) => props.theme.colors.dark};
`;

const CryptoName = styled.Text<{ theme: ThemeType }>`
  color: ${(props) => props.theme.colors.white};
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.large};
  margin-left: ${(props) => props.theme.spacing.small};
`;

const SectionCaption = styled.Text<{ theme: ThemeType }>`
  color: ${(props) => props.theme.colors.lightGrey};
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  margin-left: ${(props) => props.theme.spacing.medium};
  margin-bottom: ${(props) => props.theme.spacing.small};
`;

const IconContainer = styled.View<{ theme: ThemeType }>`
  margin-left: ${(props) => props.theme.spacing.medium};
`;

const Row = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const Col = styled.View`
  display: flex;
  flex-direction: column;
`;

const IconOnPressView = styled.TouchableOpacity`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 50px;
  height: 50px;
`;

const RevealButton = styled.TouchableOpacity<{ theme: ThemeType }>`
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  padding: 8px 16px;
  margin-left: ${(props) => props.theme.spacing.small};
`;

const RevealButtonText = styled.Text<{ theme: ThemeType }>`
  color: ${({ theme }) => theme.colors.dark};
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.small};
`;

const AccountsModalIndex = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { ethAddress, solAddress, balance } = useLocalSearchParams();
  const chainId = useSelector(
    (state: RootState) => state.ethereum.activeChainId
  );
  console.log("acc-model8686", chainId);

  const ethereumAccount = useSelector((state: RootState) => {
    return state.ethereum.globalAddresses.find(
      (item: AddressState) => item.address === ethAddress
    );
  });

  const solanaAccount = useSelector((state: RootState) =>
    state.solana.addresses.find(
      (item: SAddressState) => item.address === solAddress
    )
  );

  const importedAccount = useSelector((state: RootState) =>
    state.importedAccounts?.accounts?.find(
      (acc) => acc.evmAddress === ethAddress || acc.solAddress === solAddress
    )
  );

  const isImported = !!importedAccount;

  // Get account indices for private key derivation (seed-based only)
  const ethIndex = useSelector((state: RootState) =>
    state.ethereum.globalAddresses.findIndex(
      (item: AddressState) => item.address === ethAddress
    )
  );

  // Private key reveal state
  const [ethKeyRevealed, setEthKeyRevealed] = useState(false);
  const [solKeyRevealed, setSolKeyRevealed] = useState(false);
  const [ethPrivateKey, setEthPrivateKey] = useState("");
  const [solPrivateKey, setSolPrivateKey] = useState("");

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Toast.show({
      type: "success",
      text1: `Copied!`,
    });
  };

  const authenticateAndReveal = async (type: "eth" | "sol") => {
    try {
      const result = await dispatch(authenticateBiometric()).unwrap();
      if (result) {
        if (type === "eth") {
          if (isImported && ethAddress) {
            const key = await getImportedEvmKey(ethAddress as string);
            if (key) {
              setEthPrivateKey(key);
              setEthKeyRevealed(true);
            } else {
              Alert.alert("Error", "Failed to retrieve imported private key");
            }
          } else {
            const key = await deriveEthPrivateKey(ethIndex);
            if (key) {
              setEthPrivateKey(key);
              setEthKeyRevealed(true);
            } else {
              Alert.alert("Error", "Failed to derive private key");
            }
          }
        } else {
          if (isImported && solAddress) {
            const key = await getImportedSolKey(solAddress as string);
            if (key) {
              setSolPrivateKey(key);
              setSolKeyRevealed(true);
            } else {
              Alert.alert("Error", "Failed to retrieve imported private key");
            }
          } else {
            const key = await deriveSolPrivateKey(solanaAccount?.derivationPath ?? "");
            if (key) {
              setSolPrivateKey(key);
              setSolKeyRevealed(true);
            } else {
              Alert.alert("Error", "Failed to derive private key");
            }
          }
        }
      }
    } catch (error) {
      Alert.alert(
        "Authentication Failed",
        "Biometric authentication is required to view private keys."
      );
    }
  };

  // Build display objects for imported accounts
  const displayEthAccount = ethereumAccount || (ethAddress ? {
    accountName: importedAccount?.accountName || "Imported Account",
    address: ethAddress,
  } as AddressState : undefined);

  const displaySolAccount = solanaAccount || (solAddress ? {
    accountName: importedAccount?.accountName || "Imported Account",
    address: solAddress,
  } as SAddressState : undefined);

  return (
    <>
      <SafeAreaContainer>
        <ContentContainer>
          <SectionTitle>Settings</SectionTitle>
          <AccountSettingsContainer>
            <AccountSection isTop>
              <Row>
                <Col>
                  <SectionCaption>Account Name</SectionCaption>
                  <AccountDetailsText>
                    {displayEthAccount?.accountName || displaySolAccount?.accountName || "Account"}
                  </AccountDetailsText>
                </Col>
                {!isImported && (
                  <IconOnPressView
                    onPress={() =>
                      router.push({
                        pathname: ROUTES.accountNameModal,
                        params: {
                          ethAddress: displayEthAccount?.address || "",
                          solAddress: displaySolAccount?.address || "",
                        },
                      })
                    }
                  >
                    <EditIcon width={25} height={25} fill={theme.colors.white} />
                  </IconOnPressView>
                )}
              </Row>
            </AccountSection>
            <AccountSection isBottom>
              <SectionCaption>Total Balance</SectionCaption>
              <AccountDetailsText>{balance}</AccountDetailsText>
            </AccountSection>
          </AccountSettingsContainer>

          <SectionTitle>Advanced Settings</SectionTitle>
          {/* Ethereum Private Key */}
          {ethAddress && (
            <AccountSettingsContainer>
              <CryptoSection isTop>
                <IconContainer>
                  <BlockchainIcon symbol="eth" size={25} />
                </IconContainer>
                <CryptoName>Ethereum</CryptoName>
              </CryptoSection>
              <AccountSection isBottom>
                <Row>
                  <Col style={{ flex: 1 }}>
                    <SectionCaption>Private Key {isImported ? "(Imported)" : ""}</SectionCaption>
                    <AccountDetailsText
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {ethKeyRevealed
                        ? ethPrivateKey
                        : "••••••••••••••••••••••••••••••••"}
                    </AccountDetailsText>
                  </Col>
                  <Row>
                    {ethKeyRevealed ? (
                      <>
                        <IconOnPressView
                          onPress={() => setEthKeyRevealed(false)}
                        >
                          <AccountDetailsText style={{ fontSize: 12, color: theme.colors.lightGrey }}>
                            HIDE
                          </AccountDetailsText>
                        </IconOnPressView>
                        <IconOnPressView
                          onPress={() => handleCopy(ethPrivateKey)}
                        >
                          <CopyIcon
                            width={22}
                            height={22}
                            fill={theme.colors.white}
                          />
                        </IconOnPressView>
                      </>
                    ) : (
                      <RevealButton
                        theme={theme}
                        onPress={() => authenticateAndReveal("eth")}
                      >
                        <RevealButtonText theme={theme}>REVEAL</RevealButtonText>
                      </RevealButton>
                    )}
                  </Row>
                </Row>
              </AccountSection>
            </AccountSettingsContainer>
          )}

          {/* Solana Private Key */}
          {solAddress && (
            <AccountSettingsContainer>
              <CryptoSection isTop>
                <IconContainer>
                  <BlockchainIcon symbol="sol" size={25} />
                </IconContainer>
                <CryptoName>Solana</CryptoName>
              </CryptoSection>
              <AccountSection isBottom>
                <Row>
                  <Col style={{ flex: 1 }}>
                    <SectionCaption>Private Key {isImported ? "(Imported)" : ""}</SectionCaption>
                    <AccountDetailsText
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {solKeyRevealed
                        ? solPrivateKey
                        : "••••••••••••••••••••••••••••••••"}
                    </AccountDetailsText>
                  </Col>
                  <Row>
                    {solKeyRevealed ? (
                      <>
                        <IconOnPressView
                          onPress={() => setSolKeyRevealed(false)}
                        >
                          <AccountDetailsText style={{ fontSize: 12, color: theme.colors.lightGrey }}>
                            HIDE
                          </AccountDetailsText>
                        </IconOnPressView>
                        <IconOnPressView
                          onPress={() => handleCopy(solPrivateKey)}
                        >
                          <CopyIcon
                            width={22}
                            height={22}
                            fill={theme.colors.white}
                          />
                        </IconOnPressView>
                      </>
                    ) : (
                      <RevealButton
                        theme={theme}
                        onPress={() => authenticateAndReveal("sol")}
                      >
                        <RevealButtonText theme={theme}>REVEAL</RevealButtonText>
                      </RevealButton>
                    )}
                  </Row>
                </Row>
              </AccountSection>
            </AccountSettingsContainer>
          )}
        </ContentContainer>
      </SafeAreaContainer>
    </>
  );
};

export default AccountsModalIndex;
