import { router } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import { AppDispatch, clearPersistedState, RootState } from "../../../store";
import { clearStorage } from "../../../hooks/useStorageState";
import { ROUTES } from "../../../constants/routes";
import { ThemeType } from "../../../styles/theme";
import ClearIcon from "../../../assets/svg/clear.svg";

import { SafeAreaContainer } from "../../../components/Styles/Layout.styles";
import { EvmWallet } from "../../../components/EvmWallet";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { authenticateBiometric, enableBiometricAuth } from "../../../store/biometricsSlice";
import FingerprintIcon from "../../../assets/svg/edit.svg";
import { Switch } from "react-native";

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: flex-start;
  padding: ${(props) => props.theme.spacing.medium};
`;

const TextContainer = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  align-items: center;
  padding: ${(props) => props.theme.spacing.large};
  background-color: ${(props) => props.theme.colors.lightDark};
  border-radius: ${(props) => props.theme.spacing.medium};
`;

const TextTouchContainer = styled.TouchableHighlight``;

const Text = styled.Text<{ theme: ThemeType }>`
  color: ${(props) => props.theme.fonts.colors.primary};
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.large};
`;

const IconContainer = styled.View<{ theme: ThemeType }>`
  background-color: ${(props) => props.theme.colors.lightDark};
  border-radius: ${(props) => props.theme.spacing.medium};
  margin-right: ${(props) => props.theme.spacing.medium};
`;

const SectionTitle = styled.Text<{ theme: ThemeType }>`
  color: ${(props) => props.theme.fonts.colors.primary};
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.title};
  margin-bottom: ${(props) => props.theme.spacing.large};
  margin-left: ${(props) => props.theme.spacing.medium};
`;
const OptionCard = styled.TouchableOpacity<{ theme: ThemeType }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: ${(p) => p.theme.colors.lightDark};
  padding: ${(p) => p.theme.spacing.medium};
  border-radius: ${(p) => p.theme.borderRadius.large};
  margin-bottom: ${(p) => p.theme.spacing.medium};
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.2;
  shadow-radius: 4px;
  elevation: 2;
`;
const TopBar = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background-color: ${(props) => props.theme.colors.lightDark};
`;
const OptionLeft = styled.View`
  flex-direction: row;
  align-items: center;
`;
const IconTouch = styled.TouchableHighlight`
  padding: 20px;
`;
const OptionText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(p) => p.theme.fonts.families.openBold};
  font-size: ${(p) => p.theme.fonts.sizes.normal};
  color: ${(p) => p.theme.fonts.colors.primary};
  margin-left: ${(p) => p.theme.spacing.medium};
`;
const SettingsIndex = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { biometricsEnabled, isEnrolled } = useSelector(
    (state: RootState) => state.biometrics
  );
  console.log(biometricsEnabled)
  const handleToggleBiometrics = async (val: boolean) => {
    console.log(val)
    setBioEnabled(val);
    if (val) {
      // enroll biometric if enabling
      await dispatch(authenticateBiometric());
      // await dispatch(isEnrolled(true))
      await dispatch(enableBiometricAuth(true));
    } else {
      // disable biometric
    
      await dispatch(enableBiometricAuth(false));
        console.log("disable biometric")
      console.log("biometricsEnabled",biometricsEnabled)
    }
  };
  const [bioEnabled, setBioEnabled] = useState(biometricsEnabled);
  const clearWallets = () => {
    clearPersistedState();
    clearStorage();
    router.replace(ROUTES.walletSetup);
  };
  return (
    <>
      <TopBar>
          <SectionTitle></SectionTitle>
       
      </TopBar>
      <SafeAreaContainer>
        <ContentContainer>
          <SectionTitle>Settings</SectionTitle>
          <OptionCard activeOpacity={0.8} onPress={() => handleToggleBiometrics(!bioEnabled)}>
        <OptionLeft>
          <FingerprintIcon width={25} height={25} fill={theme.colors.primary} />
          <OptionText>Enable FaceID / TouchID</OptionText>
        </OptionLeft>
       <Switch
          value={bioEnabled}
          onValueChange={handleToggleBiometrics}
          thumbColor={bioEnabled ? theme.colors.primary : theme.colors.lightGrey}
          trackColor={{ false: theme.colors.darkGrey, true: theme.colors.secondary }}
        />
      </OptionCard>
          <TextTouchContainer onPress={clearWallets}>
            <TextContainer>
              <IconContainer>
                <ClearIcon width={25} height={25} fill={theme.colors.primary} />
              </IconContainer>
              <Text>Clear Wallets</Text>
            </TextContainer>

          </TextTouchContainer>
          <EvmWallet/>
        </ContentContainer>
      </SafeAreaContainer>
    </>
  );
};

export default SettingsIndex;
