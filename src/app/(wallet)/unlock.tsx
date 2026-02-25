import { useState, useEffect } from "react";
import { Alert } from "react-native";
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

// import Button from "../../../components/Button/Button";
// import { LinearGradientBackground } from "(app)/_layout";
// import type { AppDispatch, RootState } from "../../../store";
// import {
//   authenticateBiometric,
//   verifyWalletPassword,
// } from "../../../store/biometricsSlice";
// import { ThemeType } from "../../../styles/theme";

/* ---------------- STYLES ---------------- */

const Container = styled(SafeAreaView)<{ theme: ThemeType }>`
  flex: 1;
  padding: ${(p) => p.theme.spacing.large};
  justify-content: center;
`;

const Title = styled.Text<{ theme: ThemeType }>`
  font-family: ${(p) => p.theme.fonts.families.openBold};
  font-size: 28px;
  color: ${(p) => p.theme.fonts.colors.primary};
  margin-bottom: ${(p) => p.theme.spacing.medium};
`;

const Subtitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(p) => p.theme.fonts.families.openRegular};
  font-size: ${(p) => p.theme.fonts.sizes.normal};
  color: ${(p) => p.theme.fonts.colors.primary};
  margin-bottom: ${(p) => p.theme.spacing.large};
`;

const Input = styled.TextInput<{ theme: ThemeType }>`
  border: 1px solid ${(p) => p.theme.colors.lightDark};
  border-radius: 12px;
  padding: ${(p) => p.theme.spacing.medium};
  margin-bottom: ${(p) => p.theme.spacing.medium};
  color: ${(p) => p.theme.fonts.colors.primary};
`;

const ErrorText = styled.Text<{ theme: ThemeType }>`
  color: ${(p) => p.theme.colors.error || "red"};
  margin-top: ${(p) => p.theme.spacing.small};
`;

const ButtonWrapper = styled.View<{ theme: ThemeType }>`
  margin-top: ${(p) => p.theme.spacing.large};
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
console.log(isEnrolled ,biometricsEnabled)
  return (
    <LinearGradientBackground colors={theme.colors.primaryLinearGradient}>
      <Container>
        <Title>Unlock Wallet</Title>
        <Subtitle>
          {isEnrolled && biometricsEnabled
            ? "Use FaceID to access your wallet quickly."
            : "Enter your password to access your wallet."}
        </Subtitle>

        {/* Show password input only if biometrics is disabled */}
        {!biometricsEnabled && (
          <>
            <Input
              secureTextEntry
              placeholder="Enter password" 
              value={password}
              onChangeText={setPassword}
            />

            <ButtonWrapper>
              <Button
                title="Unlock"
                linearGradient={theme.colors.secondaryLinearGradient}
                onPress={handleUnlock}
              />
            </ButtonWrapper>
          </>
        )}

        {/* Show FaceID button if enrolled and not auto-used */}
        {isEnrolled && !biometricsEnabled && (
          <ButtonWrapper>
            <Button
              title="Use FaceID"
              linearGradient={theme.colors.secondaryLinearGradient}
              onPress={handleBiometricPress}
            />
          </ButtonWrapper>
        )}

        {errorMessage ? <ErrorText>{errorMessage}</ErrorText> : null}
      </Container>
    </LinearGradientBackground>
  );
}
