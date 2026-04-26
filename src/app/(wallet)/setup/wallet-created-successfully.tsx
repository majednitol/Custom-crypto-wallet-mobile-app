import { useState, useEffect } from "react";
import { BackHandler, SafeAreaView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import Button from "../../../components/Button/Button";
import { LinearGradientBackground } from "../../../components/Styles/Gradient";
import { ThemeType } from "../../../styles/theme";
import { ROUTES } from "../../../constants/routes";
import CheckMark from "../../../assets/svg/check-mark.svg";

const SafeAreaContainer = styled(SafeAreaView)<{ theme: ThemeType }>`
  flex: 1;
  justify-content: flex-end;
`;

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding-horizontal: ${(props) => props.theme.spacing.large};
`;

const HeroSection = styled.View`
  align-items: center;
  margin-bottom: 32px;
`;

const SuccessCircle = styled.View<{ theme: ThemeType }>`
  width: 100px;
  height: 100px;
  border-radius: 50px;
  background-color: rgba(240, 185, 11, 0.15);
  justify-content: center;
  align-items: center;
  margin-bottom: 28px;
`;

const SuccessIcon = styled.Text`
  font-size: 44px;
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
`;

export default function WalletCreationSuccessPage() {
  const { successState } = useLocalSearchParams();
  const theme = useTheme();
  const [title, setTitle] = useState("Welcome Aboard!");
  const [subtitle, setSubtitle] = useState(
    "Your new digital wallet is ready! Dive into securing and exploring your financial future. Your crypto journey starts now."
  );

  useEffect(() => {
    if (successState === "import") {
      setTitle("Wallet Imported Successfully");
      setSubtitle(
        "Your imported wallet is ready! Dive into securing and exploring your financial future. Your crypto journey starts now."
      );
    }
  }, [successState]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  return (
    <LinearGradientBackground colors={theme.colors.primaryLinearGradient}>
      <SafeAreaContainer>
        <ContentContainer>
          <HeroSection>
            <SuccessCircle>
              <SuccessIcon>🎉</SuccessIcon>
            </SuccessCircle>
            <Title>{title}</Title>
            <Subtitle>{subtitle}</Subtitle>
          </HeroSection>
        </ContentContainer>
        <ButtonContainer>
          <Button
            linearGradient={theme.colors.secondaryLinearGradient}
            onPress={() => router.push(ROUTES.setPassword)}
            title="Continue to wallet"
            icon={
              <CheckMark width={25} height={25} fill={theme.colors.white} />
            }
          />
        </ButtonContainer>
      </SafeAreaContainer>
    </LinearGradientBackground>
  );
}
