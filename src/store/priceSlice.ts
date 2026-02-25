import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { FETCH_PRICES_INTERVAL } from "../constants/price";
import { GeneralStatus } from "./types";
import { fetchPricesByChainIds } from "../utils/fetchCryptoPrices"; // updated batched function

// 🔹 Fetch multiple prices efficiently (batching)
export const fetchPrices = createAsyncThunk<
  { chainId: number; price: number }[],
  number[],
  { state: any }
>("price/fetchPrices", async (chainIds, { getState }) => {
  const { lastUpdated, data } = getState().price;
  const currentTime = Date.now();

  // Load cached prices from AsyncStorage
  let cachedData: Record<number, { usd: number }> = {};
  if (currentTime - lastUpdated < FETCH_PRICES_INTERVAL) {
    cachedData = JSON.parse((await AsyncStorage.getItem("prices")) || "{}");
  }

  // Determine which chainIds actually need a fresh fetch
  const idsToFetch = chainIds.filter(
    (chainId) => !cachedData[chainId]
  );

  // Fetch new prices in batch
  const fetchedPrices = idsToFetch.length
    ? await fetchPricesByChainIds(idsToFetch)
    : {};

  // Merge cached and fetched prices
  const finalResults: { chainId: number; price: number }[] = [];
  for (const chainId of chainIds) {
    const usd =
      cachedData[chainId]?.usd ?? fetchedPrices[chainId]?.usd ?? 0;
    finalResults.push({ chainId, price: usd });
    cachedData[chainId] = { usd };
  }

  // Save updated cache
  await AsyncStorage.setItem("prices", JSON.stringify(cachedData));

  return finalResults;
});

export interface PriceState {
  data: Record<number, { usd: number }>; // chainId → price
  lastUpdated: number;
  status: GeneralStatus;
}

const initialState: PriceState = {
  data: {},
  lastUpdated: 0,
  status: GeneralStatus.Idle,
};

const priceSlice = createSlice({
  name: "prices",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Fetch prices (multiple)
    builder.addCase(fetchPrices.pending, (state) => {
      state.status = GeneralStatus.Loading;
    });

    builder.addCase(
      fetchPrices.fulfilled,
      (state, action: PayloadAction<{ chainId: number; price: number }[]>) => {
        for (const item of action.payload) {
          state.data[item.chainId] = { usd: item.price };
        }
        state.lastUpdated = Date.now();
        state.status = GeneralStatus.Success;
      }
    );

    builder.addCase(fetchPrices.rejected, (state) => {
      state.status = GeneralStatus.Failed;
    });
  },
});

export default priceSlice.reducer;
