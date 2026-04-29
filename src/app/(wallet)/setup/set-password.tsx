import { useState } from "react";
import { Alert, View } from "react-native";
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
  justify-content: center;
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
  font-size: ${(p) => p.theme.fonts.sizes.normal};
  color: ${(p) => p.theme.colors.lightGrey};
  text-align: center;
  margin-bottom: 28px;
`;

const InputWrapper = styled.View<{ theme: ThemeType }>`
  background-color: ${(p) => p.theme.colors.dark};
  border-radius: 14px;
  border: 1px solid ${(p) => p.theme.colors.border};
  padding: 0 16px;
  margin-bottom: 16px;
  flex-direction: row;
  align-items: center;
  height: 54px;
`;

const Input = styled.TextInput<{ theme: ThemeType }>`
  flex: 1;
  color: ${(p) => p.theme.colors.white};
  font-family: ${(p) => p.theme.fonts.families.openRegular};
  font-size: ${(p) => p.theme.fonts.sizes.normal};
  height: 54px;
`;

const InputIcon = styled.Text`
  font-size: 18px;
  margin-right: 10px;
`;

const StrengthContainer = styled.View`
  flex-direction: row;
  margin-bottom: 16px;
  gap: 6px;
`;

const StrengthBar = styled.View<{ active: boolean; theme: ThemeType }>`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background-color: ${({ active, theme }) =>
    active ? theme.colors.primary : theme.colors.grey};
`;

const StrengthText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(p) => p.theme.fonts.families.openRegular};
  font-size: ${(p) => p.theme.fonts.sizes.small};
  color: ${(p) => p.theme.colors.lightGrey};
  margin-bottom: 16px;
  text-align: right;
`;

const ButtonWrapper = styled.View<{ theme: ThemeType }>`
  margin-top: 8px;
`;

/* ---------------- SCREEN ---------------- */

export default function SetPasswordScreen() {
  const theme = useTheme();
  const dispatch = useDispatch();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const getStrength = (pass: string) => {
    if (pass.length === 0) return 0;
    if (pass.length < 6) return 1;
    if (pass.length < 10) return 2;
    return 3;
  };

  const strength = getStrength(password);

  const strengthLabel = ["", "Weak", "Medium", "Strong"][strength];

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
      // Route to biometric setup (not unlock — wallet is already unlocked at this point)
      router.replace(ROUTES.biometrics);
    } catch (e: any) {
      Alert.alert("Error", e);
    }
  };

  return (
    <LinearGradientBackground colors={theme.colors.primaryLinearGradient}>
      <Container>
        <Card>
          <IconCircle>
            <LockIcon>🔐</LockIcon>
          </IconCircle>

          <Title>Secure Your Wallet</Title>
          <Subtitle>
            Create a password to protect your wallet. You’ll need this password
            to unlock your wallet.
          </Subtitle>

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

          {password.length > 0 && (
            <>
              <StrengthContainer>
                <StrengthBar active={strength >= 1} />
                <StrengthBar active={strength >= 2} />
                <StrengthBar active={strength >= 3} />
              </StrengthContainer>
              <StrengthText>{strengthLabel}</StrengthText>
            </>
          )}

          <InputWrapper>
            <InputIcon>🔑</InputIcon>
            <Input
              secureTextEntry
              placeholder="Confirm password"
              placeholderTextColor={theme.colors.lightGrey}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </InputWrapper>

          <ButtonWrapper>
            <Button
              title="Set Password"
              linearGradient={theme.colors.primaryLinearGradient}
              onPress={handleSetPassword}
            />
          </ButtonWrapper>
        </Card>
      </Container>
    </LinearGradientBackground>
  );
}
