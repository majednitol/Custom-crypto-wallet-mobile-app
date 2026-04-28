import "react-native-get-random-values";
import "@ethersproject/shims";

import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import solanaService from "../services/SolanaService";
import { truncateBalance } from "../utils/truncateBalance";
import {
  GeneralStatus,
 
  Transaction,
  TransactionConfirmation,
  ConfirmationState,
  SolanaWalletState,
  SAddressState,
} from "./types";

const CONFIRMATION_TIMEOUT = 60000;
const initialState: SolanaWalletState = {
  activeIndex: 0,
  addresses: [
    {
      accountName: "",
      derivationPath: "",
      address: "",
      publicKey: "",
      balance: 0,
      failedNetworkRequest: false,
      status: GeneralStatus.Idle,
      transactionConfirmations: [],
      transactionMetadata: {
        paginationKey: undefined,
        transactions: [],
      },
    },
  ],
};

export interface FetchTransactionsArg {
  address: string;
  paginationKey?: string[] | string;
}

export const fetchSolanaTransactions = createAsyncThunk(
  "wallet/fetchSolanaTransactions",
  async (address: string, { rejectWithValue }): Promise<any> => {
    try {
      const transactions = await solanaService.getTransactionsByWallet(address);
      return transactions;
    } catch (error) {
      console.error("error", error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSolanaTransactionsInterval = createAsyncThunk(
  "wallet/fetchSolanaTransactionsInterval",
  async (address: string, { rejectWithValue }): Promise<any> => {
    try {
      const transactions = await solanaService.getTransactionsByWallet(address);
      return transactions;
    } catch (error) {
      console.error("error", error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSolanaBalance = createAsyncThunk(
  "wallet/fetchSolanaBalance",
  async (tokenAddress: string, { rejectWithValue }): Promise<any> => {
    try {
      const currentSolBalance = await solanaService.getBalance(tokenAddress);
      return currentSolBalance;
    } catch (error) {
      console.error("error", error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSolanaBalanceInterval = createAsyncThunk(
  "wallet/fetchSolanaBalanceInterval",
  async (tokenAddress: string, { rejectWithValue }): Promise<any> => {
    try {
      const currentSolBalance = await solanaService.getBalance(tokenAddress);
      return currentSolBalance;
    } catch (error) {
      console.error("error", error);
      return rejectWithValue(error.message);
    }
  }
);

interface SolTransactionArgs {
  privateKey: Uint8Array;
  address: string;
  amount: string;
  fromAddress: string;
}

export const sendSolanaTransaction = createAsyncThunk(
  "solana/sendSolanaTransaction",
  async (
    { privateKey, address, amount, fromAddress }: SolTransactionArgs,
    { rejectWithValue }
  ) => {
    try {
      const response = await solanaService.sendTransaction(
        privateKey,
        address,
        parseFloat(amount)
      );
      return { txHash: response, fromAddress };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const confirmSolanaTransaction = createAsyncThunk(
  "wallet/confirmSolanaTransaction",
  async ({ txHash, fromAddress }: { txHash: string; fromAddress: string }, { rejectWithValue }) => {
    try {
      const confirmationPromise = solanaService.confirmTransaction(txHash);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Transaction confirmation timed out")),
          CONFIRMATION_TIMEOUT
        )
      );

      const confirmation = await Promise.race([
        confirmationPromise,
        timeoutPromise,
      ]);
      return { txHash, confirmation, fromAddress };
    } catch (error) {
      return rejectWithValue({ txHash, error: error.message, fromAddress });
    }
  }
);

export const solanaSlice = createSlice({
  name: "solana",
  initialState,
  reducers: {
    saveSolanaAddresses: (state, action: PayloadAction<SAddressState[]>) => {
      state.addresses = [...action.payload];
      state.activeIndex = 0;
    },
    depositSolana: (state, action: PayloadAction<number>) => {
      state.addresses[state.activeIndex].balance += action.payload;
    },
    withdrawSolana: (state, action: PayloadAction<number>) => {
      if (state.addresses[state.activeIndex].balance >= action.payload) {
        state.addresses[state.activeIndex].balance -= action.payload;
      } else {
        console.warn("Not enough Solana balance");
      }
    },
    addSolanaTransaction: (state, action: PayloadAction<Transaction>) => {
      state.addresses[state.activeIndex].transactionMetadata.transactions.push(
        action.payload
      );
    },
    updateSolanaBalance: (state, action: PayloadAction<number>) => {
      state.addresses[state.activeIndex].balance = action.payload;
    },
    updateSolanaAddresses: (state, action: PayloadAction<SAddressState>) => {
      const exists = state.addresses.some(a => a.address === action.payload.address);
      if (!exists) {
        state.addresses.push(action.payload);
      }
    },
    // TODO: Refactor. This is an tech debt from redux refactor
    updateSolanaAccountName: (
      state,
      action: PayloadAction<{
        accountName: string;
        solAddress: string;
      }>
    ) => {
      const solAddressIndex = state.addresses.findIndex(
        (item) => item.address === action.payload.solAddress
      );
      if (solAddressIndex !== -1) {
        state.addresses[solAddressIndex].accountName =
          action.payload.accountName;
      }
    },
    // TODO: Refactor. This is an tech debt from redux refactor
    setActiveSolanaAccount: (state, action: PayloadAction<number>) => {
      state.activeIndex = action.payload;
    },
    resetSolanaState: (state) => {
      state = initialState;
    },
  },
  extraReducers: (builder) => {
    // Helper: find index by address (from thunk arg), fallback to activeIndex
    const findIdx = (state: SolanaWalletState, address?: string) => {
      if (address) {
        const idx = state.addresses.findIndex(a => a.address === address);
        if (idx >= 0) return idx;
      }
      return state.activeIndex;
    };

    builder
      .addCase(fetchSolanaBalance.pending, (state, action) => {
        const idx = findIdx(state, action.meta.arg);
        state.addresses[idx].status = GeneralStatus.Loading;
      })
      .addCase(fetchSolanaBalance.fulfilled, (state, action) => {
        const idx = findIdx(state, action.meta.arg);
        state.addresses[idx].balance = parseFloat(
          truncateBalance(action.payload)
        );
        state.addresses[idx].status = GeneralStatus.Idle;
      })
      .addCase(fetchSolanaBalance.rejected, (state, action) => {
        const idx = findIdx(state, action.meta.arg);
        state.addresses[idx].status = GeneralStatus.Failed;
        console.error("Failed to fetch balance:", action.payload);
      })
      .addCase(fetchSolanaBalanceInterval.fulfilled, (state, action) => {
        const idx = findIdx(state, action.meta.arg);
        state.addresses[idx].balance = parseFloat(
          truncateBalance(action.payload)
        );
        state.addresses[idx].status = GeneralStatus.Idle;
      })
      .addCase(fetchSolanaBalanceInterval.rejected, (state, action) => {
        const idx = findIdx(state, action.meta.arg);
        state.addresses[idx].status = GeneralStatus.Failed;
        console.error("Failed to fetch balance:", action.payload);
      })
      .addCase(fetchSolanaTransactions.pending, (state, action) => {
        const idx = findIdx(state, action.meta.arg);
        state.addresses[idx].status = GeneralStatus.Loading;
      })
      .addCase(fetchSolanaTransactions.fulfilled, (state, action) => {
        const idx = findIdx(state, action.meta.arg);
        if (action.payload) {
          state.addresses[idx].failedNetworkRequest = false;
          state.addresses[idx].transactionMetadata.transactions =
            action.payload;
        } else {
          state.addresses[idx].failedNetworkRequest = true;
        }
        state.addresses[idx].status = GeneralStatus.Idle;
      })
      .addCase(fetchSolanaTransactions.rejected, (state, action) => {
        const idx = findIdx(state, action.meta.arg);
        state.addresses[idx].status = GeneralStatus.Failed;
        console.error("Failed to fetch transactions:", action.payload);
      })
      .addCase(fetchSolanaTransactionsInterval.fulfilled, (state, action) => {
        const idx = findIdx(state, action.meta.arg);
        if (action.payload) {
          state.addresses[idx].failedNetworkRequest = false;
          state.addresses[idx].transactionMetadata.transactions =
            action.payload;
        } else {
          state.addresses[idx].failedNetworkRequest = true;
        }
        state.addresses[idx].status = GeneralStatus.Idle;
      })
      .addCase(fetchSolanaTransactionsInterval.rejected, (state, action) => {
        const idx = findIdx(state, action.meta.arg);
        state.addresses[idx].status = GeneralStatus.Failed;
        console.error("Failed to fetch transactions:", action.payload);
      })
      .addCase(confirmSolanaTransaction.pending, (state, action) => {
        const { txHash, fromAddress } = action.meta.arg;
        const idx = findIdx(state, fromAddress);
        const newConfirmation: TransactionConfirmation = {
          txHash,
          status: ConfirmationState.Pending,
        };
        state.addresses[idx].transactionConfirmations.push(
          newConfirmation
        );
      })
      .addCase(confirmSolanaTransaction.fulfilled, (state, action) => {
        const { txHash, confirmation, fromAddress } = action.payload;
        const idx = findIdx(state, fromAddress);
        const confIdx = state.addresses[idx].transactionConfirmations.findIndex(
          (tx) => tx.txHash === txHash
        );
        if (confIdx !== -1) {
          state.addresses[idx].transactionConfirmations[confIdx].status =
            confirmation ? ConfirmationState.Confirmed : ConfirmationState.Failed;
        }
      })
      .addCase(confirmSolanaTransaction.rejected, (state, action) => {
        const { txHash, error, fromAddress } = action.payload as any;
        const idx = findIdx(state, fromAddress);
        const confIdx = state.addresses[idx].transactionConfirmations.findIndex(
          (tx: any) => tx.txHash === txHash
        );
        if (confIdx !== -1) {
          state.addresses[idx].transactionConfirmations[confIdx].status =
            ConfirmationState.Failed;
          state.addresses[idx].transactionConfirmations[confIdx].error = error;
        }
      })
      .addCase(sendSolanaTransaction.pending, (state, action) => {
        const idx = findIdx(state, action.meta.arg.fromAddress);
        state.addresses[idx].status = GeneralStatus.Loading;
      })
      .addCase(sendSolanaTransaction.fulfilled, (state, action) => {
        const { txHash, fromAddress } = action.payload;
        const idx = findIdx(state, fromAddress);
        state.addresses[idx].status = GeneralStatus.Idle;
        state.addresses[idx].transactionConfirmations.push({
          txHash,
          status: ConfirmationState.Pending,
        });
      })
      .addCase(sendSolanaTransaction.rejected, (state, action) => {
        const idx = findIdx(state, action.meta.arg.fromAddress);
        state.addresses[idx].status = GeneralStatus.Failed;
        console.error("Failed to send Solana transaction:", action.payload);
      });
  },
});

export const {
  depositSolana,
  withdrawSolana,
  addSolanaTransaction,
  updateSolanaBalance,
  saveSolanaAddresses,
  resetSolanaState,
  setActiveSolanaAccount,
  updateSolanaAddresses,
  updateSolanaAccountName,
} = solanaSlice.actions;

export default solanaSlice.reducer;
