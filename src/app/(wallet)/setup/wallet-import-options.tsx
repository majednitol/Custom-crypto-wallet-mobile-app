import { router } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import { ThemeType } from "../../../styles/theme";
import { ROUTES } from "../../../constants/routes";
import ImportWalletIcon from "../../../assets/svg/import-wallet.svg";
import { SafeAreaContainer } from "../../../components/Styles/Layout.styles";

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding-horizontal: ${(props) => props.theme.spacing.large};
`;

const HeroSection = styled.View`
  align-items: center;
  margin-bottom: 32px;
`;

const IconGrid = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-bottom: 24px;
`;

const IconCircle = styled.View<{ theme: ThemeType }>`
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background-color: rgba(240, 185, 11, 0.15);
  justify-content: center;
  align-items: center;
  margin-horizontal: 8px;
`;

const IconCircleSecondary = styled.View<{ theme: ThemeType }>`
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background-color: rgba(240, 185, 11, 0.08);
  justify-content: center;
  align-items: center;
  margin-horizontal: 8px;
`;

const Emoji = styled.Text`
  font-size: 24px;
`;

const EmojiLarge = styled.Text`
  font-size: 28px;
`;

const Title = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: 32px;
  color: ${(props) => props.theme.colors.white};
  margin-bottom: 12px;
  text-align: center;
`;

const Subtitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.lightGrey};
  text-align: center;
`;

const ButtonContainer = styled.View<{ theme: ThemeType }>`
  padding-left: ${(props) => props.theme.spacing.large};
  padding-right: ${(props) => props.theme.spacing.large};
  padding-bottom: ${(props) => props.theme.spacing.large};
  padding-top: ${(props) => props.theme.spacing.small};
  width: 100%;
`;

const InfoButtonContainer = styled.TouchableOpacity<{ theme: ThemeType }>`
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.cardBackground};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 16px 20px;
  border-radius: 16px;
  height: 80px;
  width: 100%;
`;

const InfoButtonText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.large};
  color: ${({ theme }) => theme.colors.white};
`;

const InfoText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${({ theme }) => theme.colors.lightGrey};
  margin-top: 2px;
`;

const InfoTextContainer = styled.View<{ theme: ThemeType }>`
  flex-direction: column;
`;

const Circle = styled.View<{ theme: ThemeType }>`
  justify-content: center;
  align-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background-color: rgba(240, 185, 11, 0.15);
  margin-right: ${(props) => props.theme.spacing.large};
`;

const InfoButton = () => {
  const theme = useTheme();
  return (
    <InfoButtonContainer
      onPress={() => router.push(ROUTES.walletImportSeedPhrase)}
    >
      <Circle>
        <ImportWalletIcon width={25} height={25} fill={theme.colors.primary} />
      </Circle>
      <InfoTextContainer>
        <InfoButtonText>Import Secret Recovery Phrase</InfoButtonText>
        <InfoText>Import an existing wallet</InfoText>
      </InfoTextContainer>
    </InfoButtonContainer>
  );
};

export default function WalletSetup() {
  return (
    <SafeAreaContainer>
      <ContentContainer>
        <HeroSection>
          <IconGrid>
            <IconCircleSecondary>
              <Emoji>📥</Emoji>
            </IconCircleSecondary>
            <IconCircle>
              <EmojiLarge>🔐</EmojiLarge>
            </IconCircle>
            <IconCircleSecondary>
              <Emoji>📝</Emoji>
            </IconCircleSecondary>
          </IconGrid>
          <Title>Import a wallet</Title>
          <Subtitle>
            Import an existing wallet with your secret phrase or with your
            private key
          </Subtitle>
        </HeroSection>
      </ContentContainer>
      <ButtonContainer>
        <InfoButton />
      </ButtonContainer>
    </SafeAreaContainer>
  );
}
