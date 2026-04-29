import { useState, useCallback } from "react";
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useTheme } from "styled-components/native";
import { useDispatch, useSelector } from "react-redux";
import {
  authenticateBiometric,
  saveBiometricPreference,
  unlockWallet,
} from "../../../store/biometricsSlice";
import { type AppDispatch, type RootState } from "../../../store";
import Button from "../../../components/Button/Button";
import { ROUTES } from "../../../constants/routes";
import { ThemeType } from "../../../styles/theme";

export default function BiometricsSetup() {
  const theme = useTheme() as ThemeType;
  const dispatch = useDispatch<AppDispatch>();
  const styles = createStyles(theme);

  const { biometricAvailable, status } = useSelector(
    (state: RootState) => state.biometrics
  );

  const [error, setError] = useState("");

  const handleEnableBiometrics = useCallback(async () => {
    setError("");
    try {
      const result = await dispatch(authenticateBiometric()).unwrap();
      if (result) {
        // Auth succeeded — save the user's preference
        await dispatch(saveBiometricPreference(true));
        dispatch(unlockWallet());
        router.replace(ROUTES.home);
      }
    } catch (e: any) {
      setError(
        typeof e === "string"
          ? e
          : "Biometric authentication failed. Please try again."
      );
    }
  }, [dispatch]);

  const handleSkip = useCallback(() => {
    // User opts out of biometrics — go straight to home
    dispatch(unlockWallet());
    router.replace(ROUTES.home);
  }, [dispatch]);

  const isLoading = status === "loading";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.contentContainer}>
        <View style={styles.imageContainer}>
          <Image
            source={require("../../../assets/images/biometrics.png")}
            contentFit="cover"
            style={styles.image}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Secure With Biometrics</Text>
          <Text style={styles.subtitle}>
            {biometricAvailable
              ? "Use FaceID or TouchID for quick and secure access to your wallet. You can always change this in Settings."
              : "Biometric authentication is not available on this device. You can use your password to unlock."}
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {/* Error display */}
        {error ? (
          <View style={styles.errorView}>
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
        ) : null}

        {/* Loading state */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.white} size="small" />
          </View>
        )}

        {biometricAvailable ? (
          <>
            <Button
              loading={isLoading}
              onPress={handleEnableBiometrics}
              title="Enable Biometrics"
            />
            <Button
              onPress={handleSkip}
              title="Skip for Now"
              variant="outline"
              style={{ marginTop: 12 }}
            />
          </>
        ) : (
          <Button
            onPress={handleSkip}
            title="Continue"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: theme.colors.primary,
    },
    contentContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    imageContainer: {
      flex: 1,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    image: {
      flex: 1,
      width: "100%",
    },
    textContainer: {
      padding: parseFloat(theme.spacing.large as string),
    },
    title: {
      fontFamily: theme.fonts.families.openBold,
      fontSize: 32,
      color: theme.fonts.colors.primary,
      marginBottom: parseFloat(theme.spacing.small as string),
    },
    subtitle: {
      fontFamily: theme.fonts.families.openRegular,
      fontSize: parseFloat(theme.fonts.sizes.large as string),
      color: theme.fonts.colors.primary,
    },
    buttonContainer: {
      paddingHorizontal: parseFloat(theme.spacing.large as string),
      paddingBottom: parseFloat(theme.spacing.large as string),
      paddingTop: parseFloat(theme.spacing.small as string),
    },
    errorView: {
      marginBottom: parseFloat(theme.spacing.medium as string),
    },
    errorCard: {
      backgroundColor: "rgba(255, 82, 82, 0.15)",
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: "rgba(255, 82, 82, 0.3)",
    },
    errorText: {
      fontFamily: theme.fonts.families.openBold,
      fontSize: parseFloat(theme.fonts.sizes.normal as string),
      color: theme.colors.white,
    },
    loadingContainer: {
      alignItems: "center",
      marginBottom: 12,
    },
  });
}
