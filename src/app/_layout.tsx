


// // @ts-ignore
// global.location = {
//   protocol: "file:",
// };

// import "react-native-reanimated";
// import "react-native-gesture-handler";

// import { StatusBar } from "expo-status-bar";
// import { Stack, router, useNavigation } from "expo-router";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { Provider } from "react-redux";
// import { PersistGate } from "redux-persist/integration/react";
// import styled, { ThemeProvider } from "styled-components/native";
// import * as SplashScreen from "expo-splash-screen";
// import { clearStorage } from "../hooks/useStorageState";
// import Theme from "../styles/theme";
// import { store, persistor, clearPersistedState } from "../store";
// import { resetSolanaState } from "../store/solanaSlice";
// import {  resetState } from "../store/ethereumSlice";
// import { ROUTES } from "../constants/routes";
// import LeftIcon from "../assets/svg/left-arrow.svg";
// import { EvmWallet } from "../components/EvmWallet";
// import { Alert, View } from "react-native";
// import { useCallback, useEffect, useState } from "react";
// // import TokenScreen from "./(app)/token/token";
// // import NFTScreen from "./(wallet)/nfts";
// import * as Sentry from "@sentry/react-native";
// import { isRunningInExpoGo } from "expo";

// SplashScreen.preventAutoHideAsync();
// const navigationIntegration = Sentry.reactNavigationIntegration({
//   enableTimeToInitialDisplay: !isRunningInExpoGo(),
// });

// Sentry.init({
//   dsn: "https://46a89d912b19196f003b963d917e334f@o4510794393714688.ingest.de.sentry.io/4510794395484240",
//   // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
//   // We recommend adjusting this value in production.
//   // Learn more at
//   // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
//   tracesSampleRate: 1.0,
//   integrations: [navigationIntegration],
//   enableNativeFramesTracking: !isRunningInExpoGo(),
// });

// const IconTouchContainer = styled.TouchableOpacity`
//   padding: 10px;
// `;

// export default function RootLayout() {
//   const navigation = useNavigation();
// const [appReady, setAppReady] = useState(false);

//   /**
//    * Prepare app (SDK 52 pattern)
//    */
//   useEffect(() => {
//     async function prepare() {
//       try {
//         // Place async startup logic here if needed
//         await new Promise(resolve => setTimeout(resolve, 300));
//       } catch (e) {
//         console.warn(e);
//       } finally {
//         setAppReady(true);
//       }
//     }

//     prepare();
//   }, []);

//   const onLayoutRootView = useCallback(async () => {
//     if (appReady) {
//       await SplashScreen.hideAsync();
//     }
//   }, [appReady]);

//     useEffect(() => {
//     if (appReady) {
//       const timeout = setTimeout(() => {
//         SplashScreen.hideAsync().catch(() => {});
//       }, 1500);

//       return () => clearTimeout(timeout);
//     }
//   }, [appReady]);
//  const goBack = () => {
//     try {
//       if (navigation.canGoBack()) {
//         navigation.goBack();
//       } else {
//         // Clear states safely
//         try {
//           resetSolanaState();
//           resetState();
//           clearStorage();
//           clearPersistedState();
//         } catch (err) {
//           Alert.alert(
//             "Error",
//             `Failed to reset app state: ${err instanceof Error ? err.message : err}`
//           );
//           console.error("Reset error:", err);
//         }

//         // Navigate to wallet setup
//         try {
//           router.replace(ROUTES.walletSetup);
//         } catch (err) {
//           Alert.alert(
//             "Navigation Error",
//             `Failed to navigate to wallet setup: ${err instanceof Error ? err.message : err}`
//           );
//           console.error("Router error:", err);
//         }
//       }
//     } catch (err) {
//       Alert.alert(
//         "Unexpected Error",
//         `Something went wrong: ${err instanceof Error ? err.message : err}`
//       );
//       console.error("GoBack error:", err);
//     }
//   };
//  if (!appReady) {
//     return null;
//   }
//   return (
//     <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
//     <Provider store={store}>
      
//       <PersistGate loading={null} persistor={persistor}>
//         <ThemeProvider theme={Theme}>
//           <GestureHandlerRootView style={{ flex: 1 }}>
//             <StatusBar style="light" />
//             {/* <EvmWallet/> */}
            
//            <Stack
//               screenOptions={{
//                 headerShown: false,
//                 headerTransparent: true,
//                 gestureEnabled: true,
//                 headerLeft: () => (
//                   <IconTouchContainer onPress={goBack}>
//                     <LeftIcon width={35} height={35} fill="#FFF" />
//                   </IconTouchContainer>
//                 ),
//               }}
//             >
//               <Stack.Screen
//                 name={ROUTES.walletSetup}
//                 options={{
//                   headerShown: false,
//                 }}
//               />
//               <Stack.Screen
//                 name="(wallet)/seed/seed-phrase"
//                 options={{
//                   title: "Seed Phrase",
//                   headerShown: true,
//                   headerTransparent: true,
//                   headerTitleStyle: {
//                     color: "transparent",
//                   },
//                 }}
//               />
//               <Stack.Screen
//                 name="(wallet)/seed/confirm-seed-phrase"
//                 options={{
//                   title: "Confirm Seed Phrase",
//                   headerShown: true,
//                   headerTransparent: true,
//                   headerTitleStyle: {
//                     color: "transparent",
//                   },
//                   headerLeft: () => (
//                     <IconTouchContainer onPress={() => router.back()}>
//                       <LeftIcon width={35} height={35} fill="#FFF" />
//                     </IconTouchContainer>
//                   ),
//                 }}
//               />
//               <Stack.Screen
//                 name="(wallet)/setup/wallet-created-successfully"
//                 options={{
//                   title: "Confirm Seed Phrase",
//                   headerShown: false,
//                   headerTransparent: true,
//                   headerTitleStyle: {
//                     color: "transparent",
//                   },
//                   headerLeft: null,
//                 }}
//               />
//               <Stack.Screen
//                 name="(wallet)/setup/wallet-import-options"
//                 options={{
//                   title: "Confirm Seed Phrase",
//                   headerShown: true,
//                   headerTransparent: true,
//                   headerTitleStyle: {
//                     color: "transparent",
//                   },
//                   headerLeft: () => (
//                     <IconTouchContainer onPress={() => router.back()}>
//                       <LeftIcon width={35} height={35} fill="#FFF" />
//                     </IconTouchContainer>
//                   ),
//                 }}
//               />
//               <Stack.Screen
//                 name="(wallet)/seed/wallet-import-seed-phrase"
//                 options={{
//                   title: "Confirm Seed Phrase",
//                   headerShown: true,
//                   headerTransparent: true,
//                   headerTitleStyle: {
//                     color: "transparent",
//                   },
//                   headerLeft: () => (
//                     <IconTouchContainer onPress={() => router.back()}>
//                       <LeftIcon width={35} height={35} fill="#FFF" />
//                     </IconTouchContainer>
//                   ),
//                 }}
//               />
//             </Stack>
//           </GestureHandlerRootView>
//         </ThemeProvider>
//       </PersistGate>
//       </Provider>
//       </View>
//   );
// }
  // headerStyle: {
  //           backgroundColor: 'transparent',
  //         },
  //         headerShown: true,
  //         headerTransparent: true,
  //         headerBackVisible: false,
  //         headerShadowVisible: false,
  //         title: '',
  //         headerLeft: () => <ChevronBack direction="left" />,

// @ts-ignore
// global.location = { protocol: "file:" };

import "react-native-reanimated";
import "react-native-gesture-handler";
import React, { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { AppState, AppStateStatus, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { lockWallet, UNLOCK_TIMEOUT, loadBiometricPreference, checkBiometricAvailability } from "../store/biometricsSlice";


import { store, persistor, RootState } from "../store";
import Theme from "../styles/theme";
import FloatingBackButton from "./FloatingBackButton";
import * as Sentry from "@sentry/react-native";
import { isRunningInExpoGo } from "expo";
import { ThemeProvider } from "styled-components/native";

// Prevent auto hide for splash
SplashScreen.preventAutoHideAsync();

// ----- SENTRY -----
const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

Sentry.init({
  dsn: "https://46a89d912b19196f003b963d917e334f@o4510794393714688.ingest.de.sentry.io/4510794395484240",
  tracesSampleRate: 1.0,
  integrations: [navigationIntegration],
  enableNativeFramesTracking: !isRunningInExpoGo(),
});

// ---------- Inner App Component ----------
function InnerApp() {
  const unlockedAt = useSelector((state: RootState) => state.biometrics.unlockedAt);

  // ─── Auto-lock: foreground timer + background return check ───
  // 
  // JS timers PAUSE when the app is backgrounded on Android/iOS.
  // So we CANNOT rely on setTimeout alone. We need to:
  //   1. Set a timer for foreground auto-lock (works while app is in use)
  //   2. On returning to foreground ("active"), re-check if timeout expired
  //      while we were backgrounded (since the timer didn't tick)
  //
  useEffect(() => {
    let lockTimeout: NodeJS.Timeout | null = null;

    const scheduleAutoLock = () => {
      // Clear any existing timer
      if (lockTimeout) clearTimeout(lockTimeout);
      
      const { unlockedAt, unlocked } = store.getState().biometrics;
      if (!unlocked || !unlockedAt) return;

      const elapsed = Date.now() - unlockedAt;
      const timeLeft = UNLOCK_TIMEOUT - elapsed;

      if (timeLeft <= 0) {
        // Already expired
        store.dispatch(lockWallet());
      } else {
        // Schedule foreground lock
        lockTimeout = setTimeout(() => {
          store.dispatch(lockWallet());
        }, timeLeft);
      }
    };

    // Schedule on mount
    scheduleAutoLock();

    // Re-check EVERY TIME the app comes back to foreground
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        // App returned from background — re-check timeout
        // (the timer was paused while backgrounded)
        scheduleAutoLock();
      }
    });

    return () => {
      if (lockTimeout) clearTimeout(lockTimeout);
      subscription.remove();
    };
  }, [unlockedAt]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <FloatingBackButton />

      <Stack screenOptions={{ headerShown: false, gestureEnabled: true }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(wallet)/setup/wallet-setup" />
        <Stack.Screen name="(wallet)/seed/seed-phrase" />
        <Stack.Screen name="(wallet)/seed/confirm-seed-phrase" />
        <Stack.Screen name="(wallet)/setup/wallet-created-successfully" />
        <Stack.Screen name="(wallet)/setup/wallet-import-options" />
        <Stack.Screen name="(wallet)/seed/wallet-import-seed-phrase" />
        <Stack.Screen name="(wallet)/unlock" />
        <Stack.Screen name="(app)/index" />
      </Stack>
    </GestureHandlerRootView>
  );
}

// ---------- Root Layout Component ----------
function RootLayoutComponent() {
  const [appReady, setAppReady] = useState(false);

  // Initialize auth state on cold start — ALWAYS lock
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Load biometric preference and device capability
        store.dispatch(loadBiometricPreference());
        store.dispatch(checkBiometricAvailability());

        // Always lock on cold start (app kill = lock screen)
        // The REHYDRATE handler in biometricsSlice also enforces this,
        // but we dispatch explicitly as a safety net.
        store.dispatch(lockWallet());
      } catch (e) {
        console.warn("Failed to initialize auth state", e);
        store.dispatch(lockWallet());
      } finally {
        setAppReady(true);
      }
    };

    initAuth();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) await SplashScreen.hideAsync();
  }, [appReady]);

  if (!appReady) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ThemeProvider theme={Theme}>
            <InnerApp />
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </View>
  );
}

export default Sentry.wrap(RootLayoutComponent);

