import React, { useState } from "react";
import { Dimensions, ScrollView, SafeAreaView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import styled from "styled-components/native";
import { useTheme } from "styled-components/native";
import * as Clipboard from "expo-clipboard";
import { savePhrase } from "../../../hooks/useStorageState";
import { ThemeType } from "../../../styles/theme";
import Button from "../../../components/Button/Button";
import Bubble from "../../../components/Bubble/Bubble";
import { ROUTES } from "../../../constants/routes";
import PasteIcon from "../../../assets/svg/paste.svg";

const SafeAreaContainer = styled(SafeAreaView)<{ theme: ThemeType }>`
  flex: 1;
  background-color: ${(props) => props.theme.colors.dark};
`;

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  align-items: center;
  padding: ${(props) => props.theme.spacing.medium};
`;

const HeaderSection = styled.View`
  align-items: center;
  margin-bottom: 20px;
`;

const IconCircle = styled.View<{ theme: ThemeType }>`
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background-color: rgba(240, 185, 11, 0.12);
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
`;

const VerifyIcon = styled.Text`
  font-size: 24px;
`;

const Title = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: 24px;
  color: ${(props) => props.theme.colors.white};
  text-align: center;
  margin-bottom: 8px;
`;

const Subtitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.lightGrey};
  text-align: center;
  padding-horizontal: ${(props) => props.theme.spacing.small};
`;

const SelectedCard = styled.View<{ theme: ThemeType }>`
  background-color: ${(props) => props.theme.colors.cardBackground};
  border-radius: 20px;
  border: 1px solid ${(props) => props.theme.colors.border};
  padding: 16px;
  min-height: 120px;
  width: 100%;
  margin-bottom: 16px;
`;

const SelectedLabel = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.small};
  color: ${(props) => props.theme.colors.lightGrey};
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const SelectedWordsRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
`;

const WordBankCard = styled.View<{ theme: ThemeType }>`
  background-color: ${(props) => props.theme.colors.cardBackground};
  border-radius: 20px;
  border: 1px solid ${(props) => props.theme.colors.border};
  padding: 16px;
  width: 100%;
  flex: 1;
  margin-bottom: 16px;
`;

const WordBankLabel = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.small};
  color: ${(props) => props.theme.colors.lightGrey};
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const WordBankRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
`;

const PasteButton = styled.TouchableOpacity<{ theme: ThemeType }>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.theme.colors.cardBackground};
  border: 1px dashed ${(props) => props.theme.colors.primary};
  border-radius: 12px;
  padding: 12px 20px;
  margin-bottom: 16px;
`;

const PasteButtonText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.primary};
  margin-left: 8px;
`;

const ErrorContainer = styled.View<{ theme: ThemeType }>`
  background-color: rgba(255, 82, 82, 0.1);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  width: 100%;
`;

const ErrorText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => props.theme.fonts.sizes.small};
  color: #ff5252;
  text-align: center;
`;

const ButtonContainer = styled.View<{ theme: ThemeType }>`
  padding-left: ${(props) => props.theme.spacing.large};
  padding-right: ${(props) => props.theme.spacing.large};
  padding-bottom: ${(props) => props.theme.spacing.medium};
  width: 100%;
`;

export default function Page() {
  const theme = useTheme();
  const { phrase } = useLocalSearchParams();
  const seedPhraseParams = phrase
    ? (phrase as string).split(",").sort(() => 0.5 - Math.random())
    : [];

  const [seedPhrase, setSeedPhrase] = useState<string[]>(seedPhraseParams);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  const handleSelectedWord = (word: string) => {
    if (selectedWords.length === 12) return;
    setSelectedWords([...selectedWords, word]);
    setSeedPhrase(seedPhrase.filter((w) => w !== word));
    setError("");
  };

  const handleRemoveSelectedWord = (word: string) => {
    setSelectedWords(selectedWords.filter((w) => w !== word));
    setSeedPhrase([...seedPhrase, word]);
    setError("");
  };

  const handleVerifySeedPhrase = async () => {
    if (selectedWords.length !== 12) {
      setError("Please select all 12 words in the correct order");
      return;
    }

    if (selectedWords.join(",") === phrase) {
      try {
        const originalPhrase = JSON.stringify(phrase.split(",").join(" "));
        await savePhrase(originalPhrase);
      } catch (e) {
        console.error("Failed to save private key", e);
        throw e;
      }
      router.push({
        pathname: ROUTES.walletCreatedSuccessfully,
        params: { successState: "CREATED_WALLET" },
      });
    } else {
      setError("The seed phrase order is incorrect. Please try again.");
    }
  };

  const fetchCopiedText = async () => {
    const copiedText = await Clipboard.getStringAsync();
    const phraseString = phrase as string;
    const originalPhrase = phraseString.split(",").join(" ");
    const isValid = copiedText === originalPhrase;
    if (isValid) {
      setSelectedWords(copiedText.split(" "));
      setSeedPhrase([]);
      setError("");
    } else {
      setError("Clipboard does not contain the correct phrase");
    }
  };

  return (
    <SafeAreaContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 30, paddingBottom: 20 }}>
        <ContentContainer>
          <HeaderSection>
            <IconCircle>
              <VerifyIcon>✅</VerifyIcon>
            </IconCircle>
            <Title>Verify you saved it correctly</Title>
            <Subtitle>
              Tap the words in the correct order to verify you saved your secret
              recovery phrase.
            </Subtitle>
          </HeaderSection>

          <SelectedCard>
            <SelectedLabel>
              {selectedWords.length > 0
                ? `Selected (${selectedWords.length}/12)`
                : "Tap words below to select"}
            </SelectedLabel>
            <SelectedWordsRow>
              {selectedWords.map((word, index) => (
                <Bubble
                  smallBubble
                  hideDetails
                  key={`sel-${index}`}
                  word={word}
                  number={index + 1}
                  onPress={() => handleRemoveSelectedWord(word)}
                />
              ))}
            </SelectedWordsRow>
          </SelectedCard>

          <PasteButton onPress={fetchCopiedText}>
            <PasteIcon fill={theme.colors.primary} width={18} height={18} />
            <PasteButtonText>Paste Phrase</PasteButtonText>
          </PasteButton>

          <WordBankCard>
            <WordBankLabel>Word Bank</WordBankLabel>
            <WordBankRow>
              {seedPhrase.map((word, index) => (
                <Bubble
                  onPress={() => handleSelectedWord(word)}
                  smallBubble
                  hideDetails
                  key={`bank-${index}`}
                  word={word}
                  number={index + 1}
                />
              ))}
            </WordBankRow>
          </WordBankCard>

          {error && (
            <ErrorContainer>
              <ErrorText>{error}</ErrorText>
            </ErrorContainer>
          )}
        </ContentContainer>
      </ScrollView>

      <ButtonContainer>
        <Button
          color={theme.colors.white}
          backgroundColor={theme.colors.primary}
          onPress={handleVerifySeedPhrase}
          title="Verify seed phrase"
        />
      </ButtonContainer>
    </SafeAreaContainer>
  );
}
