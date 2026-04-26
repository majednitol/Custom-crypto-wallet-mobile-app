import { FC } from "react";
import * as WebBrowser from "expo-web-browser";
import styled from "styled-components/native";
import type { ThemeType } from "../../styles/theme";
import { LinearGradient } from "expo-linear-gradient";

export const InfoContainer = styled(LinearGradient)`
  flex-direction: row;
  align-items: center;
  border-radius: ${(props) => props.theme.borderRadius.medium};
  padding: ${(props) => props.theme.spacing.large};
  margin-top: ${(props) => props.theme.spacing.small};
  border: 1px solid ${(props) => props.theme.colors.border};
`;

export const InfoTitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.white};
  margin-bottom: 6px;
`;

export const InfoText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => props.theme.fonts.sizes.small};
  color: ${(props) => props.theme.colors.lightGrey};
  line-height: 20px;
`;

export const TextContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

export const HighlightText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.small};
  color: ${(props) => props.theme.colors.primary};
`;

const IconContainer = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background-color: rgba(240, 185, 11, 0.12);
  justify-content: center;
  align-items: center;
  margin-right: 14px;
  border: 1px solid ${(props) => props.theme.colors.borderLight};
`;

const BulbIcon = styled.Text`
  font-size: 20px;
`;

const ethFaucet = "https://www.infura.io/faucet/sepolia";
const solFaucet = "https://faucet.solana.com/";

const InfoBanner: FC = () => {
  const handlePressButtonAsync = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };
  return (
    <InfoContainer
      colors={["rgba(26, 31, 46, 0.8)", "rgba(21, 25, 32, 0.6)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <IconContainer>
        <BulbIcon>💡</BulbIcon>
      </IconContainer>
      <TextContainer>
        <InfoTitle>No activity yet</InfoTitle>
        <InfoText>
          Don't have any assets?{" "}
          <HighlightText onPress={() => handlePressButtonAsync(ethFaucet)}>
            Get ETH
          </HighlightText>{" "}
          or{" "}
          <HighlightText onPress={() => handlePressButtonAsync(solFaucet)}>
            Get SOL
          </HighlightText>{" "}
          from testnet faucets
        </InfoText>
      </TextContainer>
    </InfoContainer>
  );
};

export default InfoBanner;
