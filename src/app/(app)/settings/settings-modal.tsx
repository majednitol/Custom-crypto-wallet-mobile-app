import { router } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import { AppDispatch, clearPersistedState, RootState } from "../../../store";
import { clearStorage } from "../../../hooks/useStorageState";
import { ROUTES } from "../../../constants/routes";
import { ThemeType } from "../../../styles/theme";
import { SafeAreaContainer } from "../../../components/Styles/Layout.styles";
import { EvmWallet } from "../../../components/EvmWallet";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { authenticateBiometric, saveBiometricPreference } from "../../../store/biometricsSlice";
import { Switch, Alert } from "react-native";

const ScrollContainer = styled.ScrollView`
  flex: 1;
`;

const ContentContainer = styled.View<{ theme: ThemeType }>`
  padding: ${(props) => props.theme.spacing.medium};
  padding-top: 50px;
`;

const HeaderTitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.title};
  color: ${(props) => props.theme.colors.white};
  margin-bottom: 24px;
`;

const SettingsGroup = styled.View<{ theme: ThemeType }>`
  margin-bottom: 24px;
`;

const GroupTitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.small};
  color: ${(props) => props.theme.colors.lightGrey};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
  margin-left: 4px;
`;

const OptionCard = styled.TouchableOpacity<{ theme: ThemeType; danger?: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${(props) => props.theme.colors.cardBackground};
  padding: 16px;
  border-radius: 14px;
  margin-bottom: 8px;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const OptionLeft = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

const IconCircle = styled.View<{ theme: ThemeType; danger?: boolean }>`
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background-color: ${({ theme, danger }) =>
    danger ? "rgba(255, 82, 82, 0.1)" : "rgba(240, 185, 11, 0.1)"};
  margin-right: 14px;
`;

const OptionText = styled.Text<{ theme: ThemeType; danger?: boolean }>`
  font-family: ${(p) => p.theme.fonts.families.openBold};
  font-size: ${(p) => p.theme.fonts.sizes.normal};
  color: ${({ theme, danger }) => (danger ? theme.colors.error : theme.colors.white)};
`;

const OptionSubtext = styled.Text<{ theme: ThemeType }>`
  font-family: ${(p) => p.theme.fonts.families.openRegular};
  font-size: ${(p) => p.theme.fonts.sizes.small};
  color: ${(p) => p.theme.colors.lightGrey};
  margin-top: 2px;
`;

const SettingsIndex = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { biometricPreference, biometricAvailable } = useSelector(
    (state: RootState) => state.biometrics
  );

  const [bioEnabled, setBioEnabled] = useState(biometricPreference);

  const handleToggleBiometrics = async (val: boolean) => {
    if (val) {
      // Require biometric auth before enabling
      try {
        await dispatch(authenticateBiometric()).unwrap();
        await dispatch(saveBiometricPreference(true));
        setBioEnabled(true);
      } catch {
        // Auth cancelled or failed — revert toggle
        setBioEnabled(false);
      }
    } else {
      await dispatch(saveBiometricPreference(false));
      setBioEnabled(false);
    }
  };

  const clearWallets = () => {
    Alert.alert(
      "Clear All Wallets",
      "This will remove all wallets and network settings. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearPersistedState();
            clearStorage();
            router.replace(ROUTES.walletSetup);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaContainer>
      <ScrollContainer showsVerticalScrollIndicator={false}>
        <ContentContainer>
          <HeaderTitle>Settings</HeaderTitle>

          <SettingsGroup>
            <GroupTitle>Security</GroupTitle>
            <OptionCard
              activeOpacity={0.7}
              onPress={() => handleToggleBiometrics(!bioEnabled)}
            >
              <OptionLeft>
                <IconCircle>
                  <FingerprintIcon width={20} height={20} fill={theme.colors.primary} />
                </IconCircle>
                <View>
                  <OptionText>Enable FaceID / TouchID</OptionText>
                  <OptionSubtext>
                    {bioEnabled ? "Biometric authentication is on" : "Use biometrics to unlock"}
                  </OptionSubtext>
                </View>
              </OptionLeft>
              <Switch
                value={bioEnabled}
                onValueChange={handleToggleBiometrics}
                thumbColor={bioEnabled ? theme.colors.primary : theme.colors.lightGrey}
                trackColor={{ false: theme.colors.grey, true: theme.colors.primaryLight }}
              />
            </OptionCard>
          </SettingsGroup>

          <SettingsGroup>
            <GroupTitle>Accounts</GroupTitle>
            <OptionCard
              activeOpacity={0.7}
              onPress={() => router.push("/(app)/settings/import-private-key")}
            >
              <OptionLeft>
                <IconCircle>
                  <ImportIcon width={20} height={20} fill={theme.colors.primary} />
                </IconCircle>
                <View>
                  <OptionText>Import Private Key</OptionText>
                  <OptionSubtext>Import an existing account</OptionSubtext>
                </View>
              </OptionLeft>
            </OptionCard>
          </SettingsGroup>

          <SettingsGroup>
            <GroupTitle>Networks</GroupTitle>
            <EvmWallet />
          </SettingsGroup>

          <SettingsGroup>
            <GroupTitle>Data</GroupTitle>
            <OptionCard danger activeOpacity={0.7} onPress={clearWallets}>
              <OptionLeft>
                <IconCircle danger>
                  <TrashIcon width={20} height={20} fill={theme.colors.error} />
                </IconCircle>
                <View>
                  <OptionText danger>Clear Wallets</OptionText>
                  <OptionSubtext>Remove all wallets and reset app</OptionSubtext>
                </View>
              </OptionLeft>
            </OptionCard>
          </SettingsGroup>
        </ContentContainer>
      </ScrollContainer>
    </SafeAreaContainer>
  );
};

const View = styled.View``;

import FingerprintIcon from "../../../assets/svg/edit.svg";
import TrashIcon from "../../../assets/svg/clear.svg";
import ImportIcon from "../../../assets/svg/import-wallet.svg";

export default SettingsIndex;
