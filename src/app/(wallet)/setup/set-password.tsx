import { useState } from "react";
import { Alert } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { router } from "expo-router";
import { ThemeType } from "../../../styles/theme";
import { setWalletPassword } from "../../../store/biometricsSlice";
import { ROUTES } from "../../../constants/routes";
import { LinearGradientBackground } from "../../(app)/_layout";
import Button from "../../../components/Button/Button";



/* ---------------- STYLES ---------------- */

const Container = styled(SafeAreaView)<{ theme: ThemeType }>`
  flex: 1;
  padding: ${(p) => p.theme.spacing.large};
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

const ButtonWrapper = styled.View<{ theme: ThemeType }>`
  margin-top: ${(p) => p.theme.spacing.large};
`;

/* ---------------- SCREEN ---------------- */

export default function SetPasswordScreen() {
  const theme = useTheme();
  const dispatch = useDispatch();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match");
      return;
    }

    try {
      await dispatch(setWalletPassword(password));
      router.replace(ROUTES.unlock);
    } catch (e: any) {
      Alert.alert("Error", e);
    }
  };

  return (
    <LinearGradientBackground colors={theme.colors.primaryLinearGradient}>
      <Container>
        <Title>Secure Your Wallet</Title>
        <Subtitle>
          Create a password to protect your wallet. You’ll need this password
          to unlock your wallet.
        </Subtitle>

        <Input
          secureTextEntry
          placeholder="Enter password"
          value={password}
          onChangeText={setPassword}
        />

        <Input
          secureTextEntry
          placeholder="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <ButtonWrapper>
          <Button
            title="Set Password"
            linearGradient={theme.colors.secondaryLinearGradient}
            onPress={handleSetPassword}
          />
        </ButtonWrapper>
      </Container>
    </LinearGradientBackground>
  );
}
