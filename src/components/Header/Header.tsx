import React from "react";
import { Platform } from "react-native";
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

interface ThemeComponent {
  theme: ThemeType;
}

const Container = styled.View<ThemeComponent>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-left: ${(props) => props.theme.spacing.medium};
  padding-right: ${(props) => props.theme.spacing.medium};
`;

const LeftContainer = styled.View<ThemeComponent>``;

const CenterContainer = styled.TouchableOpacity<ThemeComponent>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const RightContainer = styled.View<ThemeComponent>``;

const HeaderText = styled.Text<ThemeComponent>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.header};
  color: ${(props) => props.theme.colors.white};
`;

const IconTouchContainer = styled.TouchableOpacity`
  padding: 10px;
`;

const Header: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  /** ✅ Step 1: active chain */
  const activeChainId = useSelector(
    (state: RootState) => state.ethereum.activeChainId
  );
  console.log(activeChainId)

  /** ✅ Step 2: active index for that chain */
  const activeIndex = useSelector(
    (state: RootState) =>
      state.ethereum.activeIndex ?? 0
  );

  const activeAccountName = useSelector((state: RootState) => {
  const accounts = state.ethereum.globalAddresses; 
  const activeIndex = state.ethereum.activeIndex ?? 0;
  return accounts?.[activeIndex]?.accountName ?? "Account";
});


  return (
    <Container style={{ paddingTop: insets.top }}>
      <LeftContainer>
        <IconTouchContainer onPress={() => router.push(ROUTES.settings)}>
          <SettingsIcon width={25} height={25} fill={theme.colors.primary} />
        </IconTouchContainer>
      </LeftContainer>

      <CenterContainer onPress={() => router.push(ROUTES.accounts)}>
        <HeaderText>{activeAccountName}</HeaderText>
        <DownArrowIcon width={30} height={30} fill={theme.colors.white} />
      </CenterContainer>

      <RightContainer>
        <IconTouchContainer onPress={() => router.push(ROUTES.camera)}>
          <QRCodeIcon width={25} height={25} fill={theme.colors.primary} />
        </IconTouchContainer>
      </RightContainer>
    </Container>
  );
};

export default Header;
