import "react-native-get-random-values";
import "@ethersproject/shims";

import { combineReducers } from "redux";
import {
  configureStore,
  Middleware,
  ThunkAction,
  Action,
  createListenerMiddleware,
} from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatEther } from "ethers";

import ethereumReducer, {
  updateBalance,
} from "./ethereumSlice";
import solanaReducer from "./solanaSlice";
import priceReducer from "./priceSlice";
import biometricsReducer from "./biometricsSlice";
import importedAccountReducer from "./importedAccountSlice";
import { evmServices, registerEvmService } from "../services/EthereumService";

import erc20Reducer from "./tokenSlice";
// import nftReducer from "./nftSlice";
import solTokenReducer from "./solTokenSlice";
import settingsReducer from "./settingsSlice";

/* ---------------- Persist ---------------- */

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["ethereum", "solana", "price", "biometrics", "erc20", "nft", "importedAccounts", "settings"],
};

const rootReducer = combineReducers({
  ethereum: ethereumReducer,
  solana: solanaReducer,
  price: priceReducer,
  biometrics: biometricsReducer,
  erc20: erc20Reducer,
  solToken: solTokenReducer,
  importedAccounts: importedAccountReducer,
  settings: settingsReducer,
});


const persistedReducer = persistReducer(persistConfig, rootReducer);

/* ---------------- WebSocket Middleware ---------------- */

const activeProviderListeners = new WeakSet();

export const evmWebSocketMiddleware: Middleware =
  (store) => (next) => (action) => {
    const result = next(action);
    const state = store.getState() as any;

    const chainId = state.ethereum?.activeChainId;
    if (!chainId) return result;

    const service = evmServices[chainId];
    if (!service?.provider) return result;

    if (activeProviderListeners.has(service.provider)) return result;
    activeProviderListeners.add(service.provider);

    const index = state.ethereum.activeIndex ?? 0;
    const address = state.ethereum.globalAddresses?.[index]?.address;

    if (!address) return result;

    service.provider.on("block", async () => {
      try {
        let balance: bigint;
        try {
          balance = await service.getBalance(address);
        } catch (initialError: any) {
          if (initialError.message?.includes("block with number") || initialError.code === -32000) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            balance = await service.getBalance(address);
          } else {
            throw initialError;
          }
        }

        // Only dispatch if balance actually changed (prevents unnecessary re-renders)
        const newBalance = Number(formatEther(balance));
        const currentState = store.getState() as any;
        const currentBalance = currentState.ethereum.globalAddresses?.[index]?.balanceByChain?.[chainId];
        if (currentBalance === newBalance) return; // Skip — no change

        store.dispatch(
          updateBalance({
            chainId,
            address,
            balance: newBalance,
          })
        );
      } catch (e: any) {
        if (!e.message?.includes("block with number")) {
          console.warn("EVM WS balance sync warning:", e.message || e);
        }
      }
    });

    return result;
  };

/* ---------------- Listener Middleware ---------------- */

const listenerMiddleware = createListenerMiddleware();

/* ---------------- Store ---------------- */

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false })
      .prepend(listenerMiddleware.middleware)
      .concat(evmWebSocketMiddleware),
});

export const persistor = persistStore(store);

// Automatically register EVM Services for any custom networks loaded via redux-persist or added/modified in real-time
let lastNetworksFingerprint = "";
store.subscribe(() => {
  try {
    const state = store.getState() as any;
    const networks = state.ethereum?.networks;
    if (!networks) return;

    const fp = Object.values(networks)
      .map((n: any) => `${n.chainId}:${n.rpcUrl}:${n.chainName}:${n.symbol}`)
      .join(",");
    if (fp === lastNetworksFingerprint) return;
    lastNetworksFingerprint = fp;

    Object.values(networks).forEach((net: any) => {
      if (net?.rpcUrl) {
        registerEvmService(net);
      }
    });
  } catch (err) {
    console.warn("[Store] Error auto-registering EVM Services:", err);
  }
});

/* ---------------- Helpers ---------------- */

export const clearPersistedState = async () => {
  try {
    await persistor.purge();
    Object.values(evmServices).forEach((s) =>
      s.provider?.removeAllListeners()
    );
  } catch (err) {
    console.error("Persist purge failed:", err);
  }
};

/* ---------------- Types ---------------- */

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
