import { useState, useEffect } from "react";
import { Alert, View } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import { ThemeType } from "../../styles/theme";
import { AppDispatch, RootState } from "../../store";
import { authenticateBiometric, verifyWalletPassword } from "../../store/biometricsSlice";
import { LinearGradientBackground } from "../(app)/_layout";
import Button from "../../components/Button/Button";
import { ROUTES } from "../../constants/routes";

/* ---------------- STYLES ---------------- */

const Container = styled(SafeAreaView)<{ theme: ThemeType }>`
  flex: 1;
  padding: ${(p) => p.theme.spacing.large};
  justify-content: center;
  padding-top: 60px;
`;

const Card = styled.View<{ theme: ThemeType }>`
  background-color: ${(p) => p.theme.colors.cardBackground};
  border-radius: 24px;
  padding: 32px 24px;
  border: 1px solid ${(p) => p.theme.colors.border};
  width: 100%;
`;

const IconCircle = styled.View<{ theme: ThemeType }>`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  background-color: rgba(240, 185, 11, 0.15);
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  align-self: center;
`;

const LockIcon = styled.Text`
  font-size: 28px;
`;

const Title = styled.Text<{ theme: ThemeType }>`
  font-family: ${(p) => p.theme.fonts.families.openBold};
  font-size: 24px;
  color: ${(p) => p.theme.colors.white};
  text-align: center;
  margin-bottom: 8px;
`;

const Subtitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(p) => p.theme.fonts.families.openRegular};
  font-size: ${(p) => parseFloat(p.theme.fonts.sizes.normal)};
  color: ${(p) => p.theme.colors.lightGrey};
  text-align: center;
  margin-bottom: 28px;
`;

const InputWrapper = styled.View<{ theme: ThemeType }>`
  background-color: ${(p) => p.theme.colors.dark};
  border-radius: 14px;
  border: 1px solid ${(p) => p.theme.colors.border};
  padding: 0 16px;
  margin-bottom: 20px;
  flex-direction: row;
  align-items: center;
  height: 54px;
`;

const Input = styled.TextInput<{ theme: ThemeType }>`
  flex: 1;
  color: ${(p) => p.theme.colors.white};
  font-family: ${(p) => p.theme.fonts.families.openRegular};
  font-size: ${(p) => parseFloat(p.theme.fonts.sizes.normal)};
  height: 54px;
`;

const InputIcon = styled.Text`
  font-size: 18px;
  margin-right: 10px;
`;

const ErrorContainer = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  align-items: center;
  background-color: rgba(255, 82, 82, 0.1);
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 16px;
`;

const ErrorDot = styled.View`
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: #ff5252;
  margin-right: 8px;
`;

const ErrorText = styled.Text<{ theme: ThemeType }>`
  color: #ff5252;
  font-family: ${(p) => p.theme.fonts.families.openRegular};
  font-size: ${(p) => parseFloat(p.theme.fonts.sizes.small)};
  flex: 1;
`;

const ButtonWrapper = styled.View<{ theme: ThemeType }>`
  margin-top: 8px;
`;

const FaceIdButton = styled.TouchableOpacity<{ theme: ThemeType }>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  padding: 12px;
`;

const FaceIdText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(p) => p.theme.fonts.families.openBold};
  font-size: ${(p) => parseFloat(p.theme.fonts.sizes.normal)};
  color: ${(p) => p.theme.colors.primary};
  margin-left: 8px;
`;

const FaceIdEmoji = styled.Text`
  font-size: 18px;
`;

/* ---------------- SCREEN ---------------- */

export default function UnlockScreen() {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();

  const { isEnrolled, biometricsEnabled, unlocked, errorMessage } =
    useSelector((state: RootState) => state.biometrics);

  const [password, setPassword] = useState("");

  // Auto biometric on open if enrolled
  useEffect(() => {
    if (isEnrolled && biometricsEnabled) {
      dispatch(authenticateBiometric());
    }
  }, [isEnrolled, biometricsEnabled]);

  // Navigate after unlock
  useEffect(() => {
    if (unlocked) {
      router.replace(ROUTES.home);
    }
  }, [unlocked]);

  const handleUnlock = () => {
    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }
    dispatch(verifyWalletPassword(password));
  };

  const handleBiometricPress = () => {
    dispatch(authenticateBiometric());
  };

  return (
    <LinearGradientBackground colors={theme.colors.primaryLinearGradient}>
      <Container>
        <Card>
          <IconCircle>
            <LockIcon>🔒</LockIcon>
          </IconCircle>

          <Title>Unlock Wallet</Title>
          <Subtitle>
            {isEnrolled && biometricsEnabled
              ? "Use FaceID to access your wallet quickly."
              : "Enter your password to access your wallet."}
          </Subtitle>

          {/* Show password input only if biometrics is disabled */}
          {!biometricsEnabled && (
            <>
              <InputWrapper>
                <InputIcon>🔑</InputIcon>
                <Input
                  secureTextEntry
                  placeholder="Enter password"
                  placeholderTextColor={theme.colors.lightGrey}
                  value={password}
                  onChangeText={setPassword}
                />
              </InputWrapper>

              {errorMessage ? (
                <ErrorContainer>
                  <ErrorDot />
                  <ErrorText>{errorMessage}</ErrorText>
                </ErrorContainer>
              ) : null}

              <ButtonWrapper>
                <Button
                  title="Unlock"
                  linearGradient={theme.colors.primaryLinearGradient}
                  onPress={handleUnlock}
                />
              </ButtonWrapper>
            </>
          )}

          {/* Show FaceID button if enrolled */}
          {isEnrolled && (
            <FaceIdButton onPress={handleBiometricPress}>
              <FaceIdEmoji>👆</FaceIdEmoji>
              <FaceIdText>Use FaceID / TouchID</FaceIdText>
            </FaceIdButton>
          )}
        </Card>
      </Container>
    </LinearGradientBackground>
  );
}
