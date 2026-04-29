import { useState, useEffect, useCallback } from "react";
import { Alert, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "styled-components/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import { ThemeType } from "../../styles/theme";
import { AppDispatch, RootState } from "../../store";
import {
  authenticateBiometric,
  verifyWalletPassword,
  clearAuthError,
} from "../../store/biometricsSlice";
import { LinearGradientBackground } from "../(app)/_layout";
import Button from "../../components/Button/Button";
import { ROUTES } from "../../constants/routes";

export default function UnlockScreen() {
  const theme = useTheme() as ThemeType;
  const dispatch = useDispatch<AppDispatch>();
  const styles = createStyles(theme);

  const { biometricPreference, biometricAvailable, unlocked, errorMessage, status } =
    useSelector((state: RootState) => state.biometrics);

  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // Auto-trigger biometric prompt if user opted in AND device supports it
  useEffect(() => {
    if (biometricPreference && biometricAvailable && !unlocked) {
      dispatch(authenticateBiometric());
    } else if (!biometricPreference || !biometricAvailable) {
      // No biometric option — show password input immediately
      setShowPasswordInput(true);
    }
  }, []); // Run once on mount — intentionally empty deps

  // Navigate to home ONLY after confirmed unlock
  useEffect(() => {
    if (unlocked) {
      router.replace(ROUTES.home);
    }
  }, [unlocked]);

  const handlePasswordUnlock = useCallback(() => {
    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }
    dispatch(clearAuthError());
    dispatch(verifyWalletPassword(password));
  }, [password, dispatch]);

  const handleBiometricRetry = useCallback(() => {
    dispatch(clearAuthError());
    dispatch(authenticateBiometric());
  }, [dispatch]);

  const handleShowPassword = useCallback(() => {
    dispatch(clearAuthError());
    setShowPasswordInput(true);
  }, [dispatch]);

  const isBioLoading = status === "loading";
  const showBiometricUI = biometricPreference && biometricAvailable;

  return (
    <LinearGradientBackground colors={theme.colors.primaryLinearGradient}>
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          {/* Lock icon */}
          <View style={styles.iconCircle}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>

          <Text style={styles.title}>Unlock Wallet</Text>
          <Text style={styles.subtitle}>
            {showBiometricUI && !showPasswordInput
              ? "Use biometrics to access your wallet quickly."
              : "Enter your password to access your wallet."}
          </Text>

          {/* Biometric loading state */}
          {isBioLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <Text style={styles.loadingText}>Waiting for biometric...</Text>
            </View>
          )}

          {/* Error message */}
          {errorMessage && !isBioLoading ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorDot} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Password input — shown when user clicks "Use password" or bio unavailable */}
          {showPasswordInput && (
            <>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔑</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="Enter password"
                  placeholderTextColor={theme.colors.lightGrey}
                  value={password}
                  onChangeText={setPassword}
                  autoFocus={!showBiometricUI}
                  onSubmitEditing={handlePasswordUnlock}
                  returnKeyType="done"
                />
              </View>

              <View style={styles.buttonWrapper}>
                <Button
                  title="Unlock"
                  linearGradient={theme.colors.primaryLinearGradient}
                  onPress={handlePasswordUnlock}
                  loading={status === "loading"}
                />
              </View>
            </>
          )}

          {/* Biometric button — retry or initial trigger */}
          {showBiometricUI && !isBioLoading && (
            <TouchableOpacity
              style={styles.bioButton}
              onPress={handleBiometricRetry}
            >
              <Text style={styles.bioEmoji}>👆</Text>
              <Text style={styles.bioText}>Use FaceID / TouchID</Text>
            </TouchableOpacity>
          )}

          {/* "Use password instead" link — only when bio is primary */}
          {showBiometricUI && !showPasswordInput && !isBioLoading && (
            <TouchableOpacity
              style={styles.fallbackButton}
              onPress={handleShowPassword}
            >
              <Text style={styles.fallbackText}>Use password instead</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </LinearGradientBackground>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: parseFloat(theme.spacing.large as string),
      justifyContent: "center",
      paddingTop: 60,
    },
    card: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: 24,
      padding: 32,
      paddingHorizontal: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      width: "100%",
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "rgba(240, 185, 11, 0.15)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
      alignSelf: "center",
    },
    lockIcon: {
      fontSize: 28,
    },
    title: {
      fontFamily: theme.fonts.families.openBold,
      fontSize: 24,
      color: theme.colors.white,
      textAlign: "center",
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: theme.fonts.families.openRegular,
      fontSize: parseFloat(theme.fonts.sizes.normal as string),
      color: theme.colors.lightGrey,
      textAlign: "center",
      marginBottom: 28,
    },
    loadingContainer: {
      alignItems: "center",
      marginBottom: 20,
      gap: 12,
    },
    loadingText: {
      fontFamily: theme.fonts.families.openRegular,
      fontSize: parseFloat(theme.fonts.sizes.small as string),
      color: theme.colors.lightGrey,
    },
    inputWrapper: {
      backgroundColor: theme.colors.dark,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      marginBottom: 20,
      flexDirection: "row",
      alignItems: "center",
      height: 54,
    },
    input: {
      flex: 1,
      color: theme.colors.white,
      fontFamily: theme.fonts.families.openRegular,
      fontSize: parseFloat(theme.fonts.sizes.normal as string),
      height: 54,
    },
    inputIcon: {
      fontSize: 18,
      marginRight: 10,
    },
    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 82, 82, 0.1)",
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 16,
    },
    errorDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#ff5252",
      marginRight: 8,
    },
    errorText: {
      color: "#ff5252",
      fontFamily: theme.fonts.families.openRegular,
      fontSize: parseFloat(theme.fonts.sizes.small as string),
      flex: 1,
    },
    buttonWrapper: {
      marginTop: 8,
    },
    bioButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 16,
      padding: 12,
    },
    bioEmoji: {
      fontSize: 18,
    },
    bioText: {
      fontFamily: theme.fonts.families.openBold,
      fontSize: parseFloat(theme.fonts.sizes.normal as string),
      color: theme.colors.primary,
      marginLeft: 8,
    },
    fallbackButton: {
      alignItems: "center",
      marginTop: 12,
      padding: 8,
    },
    fallbackText: {
      fontFamily: theme.fonts.families.openRegular,
      fontSize: parseFloat(theme.fonts.sizes.small as string),
      color: theme.colors.lightGrey,
      textDecorationLine: "underline",
    },
  });
}
