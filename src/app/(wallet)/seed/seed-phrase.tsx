import React, { useState, useEffect } from "react";
import { SafeAreaView, ScrollView } from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import styled from "styled-components/native";
import { useTheme } from "styled-components/native";
import { ThemeType } from "../../../styles/theme";
import CopyIcon from "../../../assets/svg/copy.svg";
import Button from "../../../components/Button/Button";
import Bubble from "../../../components/Bubble/Bubble";
import { ROUTES } from "../../../constants/routes";
import { getPhrase } from "../../../hooks/useStorageState";

const SafeAreaContainer = styled(SafeAreaView)<{ theme: ThemeType }>`
  flex: 1;
  background-color: ${(props) => props.theme.colors.dark};
`;

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: ${(props) => props.theme.spacing.medium};
`;

const HeaderSection = styled.View`
  align-items: center;
  margin-bottom: 24px;
`;

const SecurityIconCircle = styled.View<{ theme: ThemeType }>`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  background-color: rgba(240, 185, 11, 0.12);
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
`;

const SecurityIcon = styled.Text`
  font-size: 28px;
`;

const Title = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: 28px;
  color: ${(props) => props.theme.colors.white};
  text-align: center;
  margin-bottom: 10px;
`;

const Subtitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.lightGrey};
  text-align: center;
  padding-horizontal: ${(props) => props.theme.spacing.medium};
`;

const SeedCard = styled.View<{ theme: ThemeType }>`
  background-color: ${(props) => props.theme.colors.cardBackground};
  border-radius: 20px;
  border: 1px solid ${(props) => props.theme.colors.border};
  padding: 20px;
  margin-vertical: 16px;
  width: 100%;
`;

const SeedPhraseContainer = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
`;

const CopyButton = styled.TouchableOpacity<{ theme: ThemeType }>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.theme.colors.cardBackground};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 14px;
  padding: 14px 24px;
  margin-top: 8px;
`;

const CopyButtonText = styled.Text<{ theme: ThemeType; copied: boolean }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => (props.copied ? props.theme.colors.success : props.theme.colors.white)};
  margin-left: 10px;
`;

const ButtonContainer = styled.View<{ theme: ThemeType }>`
  padding-left: ${(props) => props.theme.spacing.large};
  padding-right: ${(props) => props.theme.spacing.large};
  padding-bottom: ${(props) => props.theme.spacing.medium};
  padding-top: ${(props) => props.theme.spacing.small};
  width: 100%;
`;

const WarningContainer = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  align-items: center;
  background-color: rgba(240, 185, 11, 0.08);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  width: 100%;
`;

const WarningDot = styled.View`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: #f0b90b;
  margin-right: 10px;
`;

const WarningText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => props.theme.fonts.sizes.small};
  color: ${(props) => props.theme.colors.lightGrey};
  flex: 1;
`;

export default function Page() {
  const theme = useTheme();
  const { phrase, readOnly } = useLocalSearchParams();
  const seedPhraseParams = phrase ? (phrase as string).split(" ") : [];
  const [seedPhrase, setPhrase] = useState(seedPhraseParams);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(seedPhraseParams.join(" "));
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 4000);
  };

  useEffect(() => {
    const fetchPhrase = async () => {
      const phraseStorage = await getPhrase();
      setPhrase(phraseStorage.split(" "));
    };
    if (readOnly) {
      fetchPhrase();
    }
  }, [readOnly]);

  return (
    <SafeAreaContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 40, paddingBottom: 20 }}>
        <ContentContainer>
          <HeaderSection>
            <SecurityIconCircle>
              <SecurityIcon>🔐</SecurityIcon>
            </SecurityIconCircle>
            <Title>Secret Recovery Phrase</Title>
            <Subtitle>
              This is the only way you will be able to recover your account.
              Please store it somewhere safe!
            </Subtitle>
          </HeaderSection>

          <WarningContainer>
            <WarningDot />
            <WarningText>
              Never share your recovery phrase with anyone. Anyone with this phrase can access your wallet.
            </WarningText>
          </WarningContainer>

          <SeedCard>
            <SeedPhraseContainer>
              {seedPhrase.map((word, index) => (
                <Bubble key={index} word={word} number={index + 1} />
              ))}
            </SeedPhraseContainer>
          </SeedCard>

          <CopyButton onPress={handleCopy}>
            <CopyIcon fill={copied ? "#4ade80" : theme.colors.white} width={18} height={18} />
            <CopyButtonText copied={copied}>
              {copied ? "Copied!" : "Copy to clipboard"}
            </CopyButtonText>
          </CopyButton>
        </ContentContainer>
      </ScrollView>
      {readOnly ? null : (
        <ButtonContainer>
          <Button
            color={theme.colors.white}
            linearGradient={theme.colors.primaryLinearGradient}
            onPress={() =>
              router.push({
                pathname: ROUTES.confirmSeedPhrase,
                params: { phrase: seedPhrase },
              })
            }
            title="Ok, I saved it"
          />
        </ButtonContainer>
      )}
    </SafeAreaContainer>
  );
}
