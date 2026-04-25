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
import { evmServices } from "../services/EthereumService";
import erc20Reducer from "./tokenSlice";
// import nftReducer from "./nftSlice";
import solTokenReducer from "./solTokenSlice";

/* ---------------- Persist ---------------- */

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["ethereum", "solana", "biometrics", "erc20", "nft"],
};

const rootReducer = combineReducers({
  ethereum: ethereumReducer,
  solana: solanaReducer,
  price: priceReducer,
  biometrics: biometricsReducer,
  erc20: erc20Reducer,
  solToken: solTokenReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

/* ---------------- WebSocket Middleware ---------------- */

const activeWsListeners: Record<number, boolean> = {};

export const evmWebSocketMiddleware: Middleware =
  (store) => (next) => (action) => {
    const result = next(action);
    const state = store.getState();

    const chainId = state.ethereum.activeChainId;
    if (!chainId) return result;

    const service = evmServices[chainId];
    if (!service?.provider) return result;

    if (activeWsListeners[chainId]) return result;
    activeWsListeners[chainId] = true;

    const index = state.ethereum.activeIndex ?? 0;
    const address =
  state.ethereum.globalAddresses?.[index]?.address;


    if (!address) return result;

    service.provider.on("block", async () => {
      try {
        // Some RPCs announce a block before it's fully available for balance queries
        // We add a small retry loop for resilience
        let balance: bigint;
        try {
          balance = await service.getBalance(address);
        } catch (initialError: any) {
          if (initialError.message?.includes("block with number") || initialError.code === -32000) {
            // Wait 1 second and retry once
            await new Promise(resolve => setTimeout(resolve, 1000));
            balance = await service.getBalance(address);
          } else {
            throw initialError;
          }
        }

        store.dispatch(
          updateBalance({
            chainId,
            address,
            balance: Number(formatEther(balance)),
          })
        );
      } catch (e: any) {
        // Suppress transient RPC errors in production/dev UI to avoid red boxes
        // Only log if it's a persistent or critical issue
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

/* ---------------- Persistor ---------------- */

export const persistor = persistStore(store);

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
