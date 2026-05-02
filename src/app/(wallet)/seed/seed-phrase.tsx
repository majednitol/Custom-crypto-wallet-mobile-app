import React, { useState, useEffect } from "react";
import { SafeAreaView, ScrollView, View, StyleSheet, Text, TouchableOpacity } from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import styled from "styled-components/native";
import { useTheme } from "styled-components/native";
import { ThemeType } from "../../../styles/theme";
import CopyIcon from "../../../assets/svg/copy.svg";
import LockIcon from "../../../assets/svg/lock.svg";
import PhraseIcon from "../../../assets/svg/phrase.svg";
import Button from "../../../components/Button/Button";
import Bubble from "../../../components/Bubble/Bubble";
import { ROUTES } from "../../../constants/routes";
import { getPhrase } from "../../../hooks/useStorageState";
import { LinearGradientBackground } from "../../../components/Styles/Gradient";
import { MotiView } from "moti";

const SafeAreaContainer = styled(SafeAreaView)<{ theme: ThemeType }>`
  flex: 1;
`;

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: ${(props) => props.theme.spacing.medium};
`;

const HeaderSection = styled.View`
  align-items: center;
  margin-bottom: 16px;
  width: 100%;
`;

const SecurityIconCircle = styled.View<{ theme: ThemeType }>`
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background-color: rgba(240, 185, 11, 0.15);
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
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
  justify-content: flex-start;
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
  background-color: rgba(240, 185, 11, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(240, 185, 11, 0.2);
  padding: 16px;
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
    <LinearGradientBackground colors={theme.colors.primaryLinearGradient}>
      <SafeAreaContainer>
        <ScrollView 
          contentContainerStyle={{ paddingTop: 40, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <ContentContainer>
            <MotiView
              from={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 12, delay: 200 }}
            >
              <HeaderSection>
                <View style={{ position: "relative", justifyContent: "center", alignItems: "center" }}>
                  <MotiView
                    from={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.4, 1] }}
                    transition={{
                      type: "timing",
                      duration: 2000,
                      loop: true,
                      repeatReverse: true,
                    }}
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        backgroundColor: theme.colors.primary,
                        borderRadius: 32,
                        marginBottom: 20,
                      },
                    ]}
                  />
                  <SecurityIconCircle>
                    <LockIcon width={32} height={32} fill={theme.colors.primary} />
                  </SecurityIconCircle>
                </View>
                <Title>Secret Recovery Phrase</Title>
                <Subtitle>
                  This is the only way you will be able to recover your account.
                  Please store it somewhere safe!
                </Subtitle>
              </HeaderSection>
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 600, delay: 400 }}
              style={{ width: "100%" }}
            >
              <WarningContainer>
                <WarningDot />
                <WarningText>
                  Never share your recovery phrase with anyone. Anyone with this phrase can access your wallet.
                </WarningText>
              </WarningContainer>
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 800, delay: 600 }}
              style={{ width: "100%" }}
            >
              <SeedCard>
                <SeedPhraseContainer>
                  {seedPhrase.map((word, index) => (
                    <MotiView
                      key={index}
                      from={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "timing", duration: 400, delay: 800 + index * 50 }}
                    >
                      <Bubble word={word} number={index + 1} />
                    </MotiView>
                  ))}
                </SeedPhraseContainer>
              </SeedCard>
            </MotiView>

            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: "timing", duration: 600, delay: 1500 }}
            >
              <CopyButton onPress={handleCopy}>
                <CopyIcon fill={copied ? "#4ade80" : theme.colors.white} width={18} height={18} />
                <CopyButtonText copied={copied}>
                  {copied ? "Copied!" : "Copy to clipboard"}
                </CopyButtonText>
              </CopyButton>
            </MotiView>
          </ContentContainer>
        </ScrollView>

        {readOnly ? null : (
          <MotiView
            from={{ opacity: 0, translateY: 40 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600, delay: 1700 }}
            style={{ width: "100%" }}
          >
            <ButtonContainer>
              <Button
                backgroundColor={theme.colors.primary}
                color={theme.colors.black}
                onPress={() =>
                  router.push({
                    pathname: ROUTES.confirmSeedPhrase,
                    params: { phrase: seedPhrase },
                  })
                }
                title="Ok, I saved it"
              />
            </ButtonContainer>
          </MotiView>
        )}
      </SafeAreaContainer>
    </LinearGradientBackground>
  );
}
