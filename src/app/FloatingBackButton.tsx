import React from "react";
import { Pressable, StyleSheet, Platform } from "react-native";
import { useRouter, useSegments } from "expo-router";
import LeftIcon from "../assets/svg/left-arrow.svg";

const DISABLED_ROUTES = [
  "wallet-setup",
    "wallet-created-successfully",
  "unlock"
];

export default function FloatingBackButton() {
  const router = useRouter();
  const segments = useSegments();

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
      <LeftIcon width={32} height={32} fill="#FFF" />
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
