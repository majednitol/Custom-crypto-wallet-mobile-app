import React from "react";
import { router } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { ThemeType } from "../../styles/theme";
import SettingsIcon from "../../assets/svg/settings.svg";
import QRCodeIcon from "../../assets/svg/qr-code.svg";
import DownArrowIcon from "../../assets/svg/down-arrow.svg";
import { ROUTES } from "../../constants/routes";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "react-native";

interface ThemeComponent {
  theme: ThemeType;
}

const GradientHeader = styled(LinearGradient)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
`;

const Container = styled.View<ThemeComponent>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-left: ${(props) => props.theme.spacing.medium};
  padding-right: ${(props) => props.theme.spacing.medium};
  padding-bottom: ${(props) => props.theme.spacing.small};
`;

const LeftContainer = styled.View<ThemeComponent>``;

const CenterContainer = styled.TouchableOpacity<ThemeComponent>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.theme.colors.cardBackground};
  border-radius: ${(props) => props.theme.borderRadius.pill};
  padding-vertical: 6px;
  padding-horizontal: 20px;
  border: 1px solid ${(props) => props.theme.colors.border};
  min-width: 200px;
`;

const RightContainer = styled.View<ThemeComponent>``;

const HeaderText = styled.Text<ThemeComponent>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.white};
  letter-spacing: 0.3px;
  padding-right: 2px;
`;

const IconTouchContainer = styled.TouchableOpacity`
  padding: 10px;
  justify-content: center;
  align-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background-color: ${(props) => props.theme.colors.cardBackground};
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const NetworkDot = styled.View`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: ${(props) => props.theme.colors.success};
  margin-right: 8px;
`;

const Header: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const activeIndex = useSelector(
    (state: RootState) => state.ethereum.activeIndex ?? 0
  );

  const activeAccountName = useSelector((state: RootState) => {
    // Check for active imported account first
    const importedEvm = state.importedAccounts?.activeEvmAddress;
    const importedSol = state.importedAccounts?.activeSolAddress;
    if (importedEvm || importedSol) {
      const imported = state.importedAccounts?.accounts?.find(
        (acc) => acc.evmAddress === importedEvm || acc.solAddress === importedSol
      );
      if (imported) return imported.accountName;
    }
    const accounts = state.ethereum.globalAddresses;
    const activeIndex = state.ethereum.activeIndex ?? 0;
    return accounts?.[activeIndex]?.accountName ?? "Account";
  });


  return (
    <GradientHeader
      colors={["rgba(11,14,20,0.95)", "rgba(11,14,20,0)"]}
      locations={[0, 1]}
      style={{ paddingTop: insets.top }}
    >
      <Container>
        <LeftContainer>
          <IconTouchContainer onPress={() => router.push(ROUTES.settings)}>
            <SettingsIcon width={20} height={20} fill={theme.colors.lightGrey} />
          </IconTouchContainer>
        </LeftContainer>

        <CenterContainer onPress={() => router.push(ROUTES.accounts)}>
          <NetworkDot />
          <Text
            style={{
              fontFamily: theme.fonts.families.openBold,
              fontSize: 14,
              color: theme.colors.white,
              minWidth: 90,
              textAlign: "center",
              includeFontPadding: false,
            }}
          >
            {activeAccountName}
          </Text>
          <DownArrowIcon
            width={14}
            height={14}
            fill={theme.colors.lightGrey}
            style={{ marginLeft: 6 }}
          />
        </CenterContainer>

        <RightContainer>
          <IconTouchContainer onPress={() => router.push(ROUTES.camera)}>
            <QRCodeIcon width={20} height={20} fill={theme.colors.lightGrey} />
          </IconTouchContainer>
        </RightContainer>
      </Container>
    </GradientHeader>
  );
};

export default Header;
