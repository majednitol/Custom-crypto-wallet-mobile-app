import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getSolBalance,
  getSplTokenBalance,
  getAllSplTokens,
  getWalletNFTs,
  sendSplToken,
  SplTokenAccount,
} from "../services/solTokenService";
import { Keypair } from "@solana/web3.js";

/* ---------------- TYPES ---------------- */

export interface TrackedSolToken {
  mint: string; 
}

export interface SolTokenBalance {
  mint: string;
  ata: string;
  amount: number;
  decimals: number;
}

export interface SolTransferResult {
  signature: string;
}

export interface SolNFT {
  mint: string;
  name?: string;
  uri?: string;
}

interface SolTokenState {
  trackedTokens: TrackedSolToken[];
  balances: Record<string, SolTokenBalance>;
  allTokens: SplTokenAccount[];
  allNfts: SolNFT[];
  solBalance?: {
    lamports: number;
    sol: number;
  };
}

/* ---------------- STORAGE ---------------- */

const STORAGE_KEY = "SOL_TRACKED_TOKENS_V1";

/* ---------------- INITIAL STATE ---------------- */

const initialState: SolTokenState = {
  trackedTokens: [],
  balances: {},
  allTokens: [],
  allNfts: [],
};

/* ---------------- STORAGE HELPERS ---------------- */

const saveTokens = async (tokens: TrackedSolToken[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
};

/* ---------------- LOAD TOKENS ---------------- */

export const loadSolTokens = createAsyncThunk<TrackedSolToken[]>(
  "sol/loadTokens",
  async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    try {
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
);

/* ---------------- THUNKS ---------------- */

/* SOL balance */
export const fetchSolBalance = createAsyncThunk(
  "sol/fetchSolBalance",
  async ({ wallet }: { wallet: string }) => {
    return await getSolBalance(wallet);
  }
);

/* Single SPL token balance */
export const fetchSplTokenBalance = createAsyncThunk<
  SolTokenBalance,
  { mint: string; wallet: string }
>("sol/fetchSplBalance", async ({ mint, wallet }) => {
  const data = await getSplTokenBalance(wallet, mint);
  console.log("getSplTokenBalance",wallet,mint,data)
  if (!data) throw new Error("Token not found");
  return data;
});

/* All SPL tokens */
export const fetchAllSplTokens = createAsyncThunk<
  SplTokenAccount[],
  { wallet: string }
>("sol/fetchAllSplTokens", async ({ wallet }) => {
  return await getAllSplTokens(wallet);
});


/* NFTs */
export const fetchSolNfts = createAsyncThunk<
  SolNFT[],
  { wallet: string }
  >("sol/fetchNfts", async ({ wallet }) => {
    console.log("wallet10000000000000000000", wallet)
    const nfts = await getWalletNFTs(wallet);
    console.log("nfts",nfts)
    return nfts;
});

/* Send SPL token */
export const sendSolToken = createAsyncThunk<
  SolTransferResult,
  {
    mint: string;
    to: string;
    amount: number;
    decimals: number;
    secretKey: Uint8Array;
  }
>("sol/sendToken", async ({ mint, to, amount, decimals, secretKey }) => {
  const keypair = Keypair.fromSecretKey(secretKey);

  return await sendSplToken({
    mint,
    fromKeypair: keypair,
    toAddress: to,
    amount,
    decimals,
  });
});

/* ---------------- SLICE ---------------- */

const solTokenSlice = createSlice({
  name: "sol",
  initialState,
  reducers: {
    addSolToken(state, action: PayloadAction<TrackedSolToken>) {
      const mint = action.payload.mint;

      const exists = state.trackedTokens.some(
        t => t.mint === mint
      );

      if (!exists) {
        state.trackedTokens.push({ mint });
        saveTokens(state.trackedTokens);
      }
    },

    removeToken(state, action: PayloadAction<TrackedSolToken>) {
      state.trackedTokens = state.trackedTokens.filter(
        t => t.mint !== action.payload.mint
      );
      saveTokens(state.trackedTokens);
    },
  },

  extraReducers: builder => {
    builder
      /* load tracked tokens */
      .addCase(loadSolTokens.fulfilled, (state, action) => {
        state.trackedTokens = action.payload;
      })

      /* SOL balance */
      .addCase(fetchSolBalance.fulfilled, (state, action) => {
        state.solBalance = action.payload;
      })

      /* single SPL token */
      .addCase(fetchSplTokenBalance.fulfilled, (state, action) => {
        const key = action.payload.mint;
        state.balances[key] = action.payload;
      })

      /* all SPL tokens */
      .addCase(fetchAllSplTokens.fulfilled, (state, action) => {
        state.allTokens = action.payload;
      })

      /* NFTs */
      .addCase(fetchSolNfts.fulfilled, (state, action) => {
        state.allNfts = action.payload;
      });
  },
});

/* ---------------- EXPORTS ---------------- */

export const { addSolToken, removeToken } = solTokenSlice.actions;
export default solTokenSlice.reducer;
