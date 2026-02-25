import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootState } from ".";

const PASSWORD_KEY = "WALLET_PASSWORD";
const UNLOCKED_AT_KEY = "WALLET_UNLOCKED_AT";
export const UNLOCK_TIMEOUT = 1 * 60 * 1000; // 5 minutes

// ------------------- Async Thunks -------------------

// Biometric: Check enrollment
export const isAuthEnrolled = createAsyncThunk<
  boolean,
  void,
  { state: RootState; rejectValue: string }
>("biometrics/isAuthEnrolled", async (_, { rejectWithValue }) => {
  try {
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return rejectWithValue("No biometrics enrolled on this device.");
    return enrolled;
  } catch {
    return rejectWithValue("Failed to check biometrics.");
  }
});

// Biometric: Authenticate
export const authenticateBiometric = createAsyncThunk<
  boolean,
  void,
  { state: RootState; rejectValue: string }
>("biometrics/authenticate", async (_, { rejectWithValue }) => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return rejectWithValue("Biometric not available.");

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to access the wallet",
      fallbackLabel: "Use password instead",
      disableDeviceFallback: true,
      cancelLabel: "Cancel",
    });

    return result.success;
  } catch {
    return rejectWithValue("Biometric authentication failed.");
  }
});

// Password: Set wallet password
export const setWalletPassword = createAsyncThunk<
  boolean,
  string,
  { state: RootState; rejectValue: string }
>("password/setWalletPassword", async (password, { rejectWithValue }) => {
  try {
    await AsyncStorage.setItem(PASSWORD_KEY, password);
    return true;
  } catch {
    return rejectWithValue("Failed to save password.");
  }
});

// Password: Verify wallet password
export const verifyWalletPassword = createAsyncThunk<
  boolean,
  string,
  { state: RootState; rejectValue: string }
>("password/verifyWalletPassword", async (password, { rejectWithValue }) => {
  try {
    const saved = await AsyncStorage.getItem(PASSWORD_KEY);
    if (saved === password) return true;
    return rejectWithValue("Incorrect password.");
  } catch {
    return rejectWithValue("Failed to verify password.");
  }
});

// ------------------- Slice -------------------
export interface LockState {
  biometricsEnabled: boolean;
  isEnrolled: boolean;
  passwordSet: boolean;
  unlockedAt?: number;
  unlocked: boolean;
  errorMessage: string;
  status: "idle" | "loading" | "rejected";
}

const initialState: LockState = {
  biometricsEnabled: false,
  isEnrolled: false,
  passwordSet: false,
  unlocked: false,
  unlockedAt: undefined,
  errorMessage: "",
  status: "idle",
};

const lockSlice = createSlice({
  name: "lock",
  initialState,
  reducers: {
    // Lock wallet manually
    lockWallet(state) {
      state.unlocked = false;
      state.unlockedAt = undefined;
      AsyncStorage.removeItem(UNLOCKED_AT_KEY);
    },
    // Unlock wallet manually
    unlockWallet(state) {
      state.unlocked = true;
      state.unlockedAt = Date.now();
      AsyncStorage.setItem(UNLOCKED_AT_KEY, state.unlockedAt.toString());
    },
    // Unlock from persisted timestamp
    unlockWalletFromPersisted(state, action: PayloadAction<number>) {
      state.unlocked = true;
      state.unlockedAt = action.payload;
    },
    // Reset everything
    resetLockState(state) {
      state.biometricsEnabled = false;
      state.isEnrolled = false;
      state.passwordSet = false;
      state.unlocked = false;
      state.errorMessage = "";
      state.status = "idle";
      state.unlockedAt = undefined;
      AsyncStorage.removeItem(UNLOCKED_AT_KEY);
    },
    enableBiometricAuth(state, action: PayloadAction<boolean>) {
  state.biometricsEnabled = action.payload; // ✅ fix here
  state.isEnrolled = action.payload;        // optional, keep in sync
  if (!action.payload) {
    // lock wallet immediately if disabling biometrics
    state.unlocked = false;
    state.unlockedAt = undefined;
    AsyncStorage.removeItem("WALLET_UNLOCKED_AT");
  }
}
  },
  extraReducers: (builder) => {
    // Biometric enrolled
    builder.addCase(isAuthEnrolled.fulfilled, (state, action: PayloadAction<boolean>) => {
      state.isEnrolled = action.payload;
      state.status = "idle";
    });
    builder.addCase(isAuthEnrolled.pending, (state) => {
      state.status = "loading";
    });
    builder.addCase(isAuthEnrolled.rejected, (state, action) => {
      state.status = "rejected";
      state.errorMessage = action.payload || "Biometric check failed.";
    });

    // Biometric authenticate
    builder.addCase(authenticateBiometric.fulfilled, (state, action: PayloadAction<boolean>) => {
      state.biometricsEnabled = action.payload;
      if (action.payload) {
        state.unlocked = true;
        state.unlockedAt = Date.now();
        AsyncStorage.setItem(UNLOCKED_AT_KEY, state.unlockedAt.toString());
      }
      state.status = "idle";
    });
    builder.addCase(authenticateBiometric.pending, (state) => {
      state.status = "loading";
    });
    builder.addCase(authenticateBiometric.rejected, (state, action) => {
      state.biometricsEnabled = false;
      state.unlocked = false;
      state.status = "rejected";
      state.errorMessage = action.payload || "Biometric authentication failed.";
    });

    // Password set
    builder.addCase(setWalletPassword.fulfilled, (state) => {
      state.passwordSet = true;
      state.unlocked = true;
      state.unlockedAt = Date.now();
      AsyncStorage.setItem(UNLOCKED_AT_KEY, state.unlockedAt.toString());
      state.status = "idle";
    });
    builder.addCase(setWalletPassword.rejected, (state, action) => {
      state.passwordSet = false;
      state.status = "rejected";
      state.errorMessage = action.payload || "Failed to set password.";
    });

    // Password verify
    builder.addCase(verifyWalletPassword.fulfilled, (state) => {
      state.unlocked = true;
      state.unlockedAt = Date.now();
      AsyncStorage.setItem(UNLOCKED_AT_KEY, state.unlockedAt.toString());
      state.status = "idle";
    });
    builder.addCase(verifyWalletPassword.rejected, (state, action) => {
      state.unlocked = false;
      state.status = "rejected";
      state.errorMessage = action.payload || "Incorrect password.";
    });
  },
});

export const { lockWallet, unlockWallet, resetLockState, enableBiometricAuth, unlockWalletFromPersisted } = lockSlice.actions;
export default lockSlice.reducer;
