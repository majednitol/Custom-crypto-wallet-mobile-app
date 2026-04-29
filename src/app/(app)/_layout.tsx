import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { useCallback, useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { useSelector } from "react-redux";
import styled, { useTheme } from "styled-components/native";
import Toast from "react-native-toast-message";
import {
  useFonts,
  OpenSans_400Regular,
  OpenSans_700Bold,
} from "@expo-google-fonts/open-sans";
import {
  Roboto_400Regular as RobotoReg,
  Roboto_700Bold as RobotoBld,
} from "@expo-google-fonts/roboto";
import { LinearGradient } from "expo-linear-gradient";
import type { RootState } from "../../store";


import { getPhrase, clearStorage } from "../../hooks/useStorageState";
import { clearPersistedState, store } from "../../store";
import { toastConfig } from "../../config/toast";
import Header from "../../components/Header/Header";
import SplashScreenOverlay from "../../components/AnimatedSplashScreen/AnimatedSplashScreen";
import { ThemeType } from "../../styles/theme";
import { ROUTES } from "../../constants/routes";
import { Alert } from "react-native";

const IconTouchContainer = styled.TouchableOpacity`
  padding: 10px;
`;

export const LinearGradientBackground = styled(LinearGradient) <{
  theme: ThemeType;
}>`
  flex: 1;
`;

export default function AppLayout() {
  const [fontsLoaded] = useFonts({
    OpenSans_400Regular,
    OpenSans_700Bold,
    Roboto_400Regular: RobotoReg,
    Roboto_700Bold: RobotoBld,
  });
  const theme = useTheme();


  const solActiveIndex = useSelector(
    (state: RootState) => state.solana.activeIndex ?? 0
  );
  const activeChainId = useSelector(
    (state: RootState) => state.ethereum.activeChainId
  );

  const activeIndex = useSelector(
    (state: RootState) =>
      state.ethereum.activeIndex ?? 0
  );

  const ethAccounts = useSelector(
    (state: RootState) => state.ethereum.globalAddresses || []
  );

  const ethAddress = ethAccounts[activeIndex]?.address ?? "";

  const solWallet = useSelector(
    (state: RootState) => state.solana.addresses[solActiveIndex]?.address ?? ""
  );
  const [appReady, setAppReady] = useState<boolean>(false);
  const [userExists, setUserExists] = useState<boolean>(false);
  const walletsExist = ethAddress !== "" && solWallet !== "";

useEffect(() => {
  const prepare = async () => {
    try {
      const phrase = await getPhrase();

      // No wallets? clean up
      if (!phrase || !walletsExist) {
        clearPersistedState();
        clearStorage();
        setUserExists(false);
        return;
      }
      // Wallet exists
      setUserExists(true);

      // Check if wallet is locked — root _layout handles all lock/unlock state.
      // We only redirect here if the wallet is currently locked.
      const { passwordSet, unlocked } = store.getState().biometrics;
      if (passwordSet && !unlocked) {
        router.replace(ROUTES.unlock);
      }

    } catch (err) {
      console.error("Error fetching phrase:", err);
      Alert.alert("Error", `Something went wrong: ${err instanceof Error ? err.message : err}`);
    } finally {
      setAppReady(true);
      await SplashScreen.hideAsync();

    }

  };

  SystemUI.setBackgroundColorAsync("black");
  prepare();

  // NOTE: Auto-lock AppState listener is in root _layout.tsx InnerApp.
  // Do NOT add a duplicate here — it causes conflicting lock behavior.
}, [walletsExist]);

  // ─── REACTIVE LOCK NAVIGATION ───
  // When auto-lock fires (timeout or background return), Redux sets unlocked=false.
  // This effect watches that state and navigates to the unlock screen.
  const isUnlocked = useSelector((state: RootState) => state.biometrics.unlocked);
  const passwordSet = useSelector((state: RootState) => state.biometrics.passwordSet);

  useEffect(() => {
    if (appReady && passwordSet && !isUnlocked) {
      router.replace(ROUTES.unlock);
    }
  }, [isUnlocked, appReady, passwordSet]);


const onLayoutRootView = useCallback(async () => {
    if (appReady && fontsLoaded) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn("SplashScreen hide failed:", e);
      }
    }
}, [appReady, fontsLoaded]);
  
   useEffect(() => {
    if (appReady && fontsLoaded) {
      const fallback = setTimeout(() => {
        SplashScreen.hideAsync().catch(console.warn);
      }, 500); // 0.5s fallback

      return () => clearTimeout(fallback);
    }
  }, [appReady, fontsLoaded]);
  return (
    <LinearGradientBackground colors={theme.colors.primaryLinearGradient} onLayout={onLayoutRootView}>
      <SplashScreenOverlay
        userExists={userExists}
        appReady={appReady && fontsLoaded}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: true,
              headerTransparent: true,
              gestureEnabled: true,
              header: (props) => <Header {...props} />,
            }}
          />
          <Stack.Screen
            name="token/[id]"
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />



          <Stack.Screen
            name="token/send/send-options"
            options={{
              headerShown: false,
              gestureEnabled: true,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="token/send/[send]"
            options={{
              headerShown: false,
              gestureEnabled: true,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="token/receive/[receive]"
            options={{
              headerShown: false,
              gestureEnabled: true,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="token/send/send-confirmation"
            options={{
              headerShown: false,
              gestureEnabled: true,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="token/receive/receive-options"
            options={{
              headerShown: false,
              gestureEnabled: true,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="camera/index"
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="settings/settings-modal"
            options={{
              headerShown: false,
              gestureEnabled: true,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="accounts/accounts"
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="accounts/account-modal"
            options={{
              headerShown: false,
              gestureEnabled: true,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="accounts/account-name-modal"
            options={{
              headerShown: false,
              gestureEnabled: true,
              presentation: "modal",
              contentStyle: {
                paddingTop: 0,
              },
            }}
          />
        </Stack>
        <Toast position="top" topOffset={75} config={toastConfig} />
      </SplashScreenOverlay>
    </LinearGradientBackground>
  );
}
