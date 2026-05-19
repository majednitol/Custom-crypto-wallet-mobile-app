import React from "react";
import { Pressable, StyleSheet, Platform } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useTheme } from "styled-components/native";
import LeftIcon from "../assets/svg/left-arrow.svg";

const DISABLED_ROUTES = [
  "wallet-setup",
    "wallet-created-successfully",
  "unlock",
  "[id]",
];


export default function FloatingBackButton() {
  const router = useRouter();
  const segments = useSegments();
  const theme = useTheme();

  const lastSegment = segments[segments.length - 1];

  const shouldShowBack =
    segments.length > 1 && !DISABLED_ROUTES.includes(lastSegment);

  if (!shouldShowBack) return null;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/wallet-setup");
  };

  return (
    <Pressable
      onPress={goBack}
      hitSlop={12}
      style={styles.container}
    >
      <LeftIcon width={32} height={32} fill={theme.colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "android" ? 42 : 56,
    left: 16,
    zIndex: 999,
  },
});
