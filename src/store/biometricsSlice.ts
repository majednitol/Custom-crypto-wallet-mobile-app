import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { REHYDRATE } from "redux-persist";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { RootState } from ".";

// ─── Secure Storage Keys ───
const PASSWORD_KEY = "WALLET_PASSWORD";
const UNLOCKED_AT_KEY = "WALLET_UNLOCKED_AT";
const BIOMETRIC_PREF_KEY = "WALLET_BIOMETRIC_PREF";

// 5 minutes auto-lock timeout
export const UNLOCK_TIMEOUT = 5 * 60 * 1000;

// ═══════════════════════════════════════════════════════════
// ASYNC THUNKS
// ═══════════════════════════════════════════════════════════

/**
 * Check if the device has biometric hardware AND enrollment.
 * Returns true only if both are present.
 */
export const checkBiometricAvailability = createAsyncThunk<
  boolean,
  void,
  { state: RootState; rejectValue: string }
>("auth/checkBiometricAvailability", async (_, { rejectWithValue }) => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  } catch {
    return rejectWithValue("Failed to check biometric availability.");
  }
});

/**
 * Trigger the OS biometric prompt.
 * Returns true/false — NEVER mutates biometric preference.
 * This is a pure authentication check.
 */
export const authenticateBiometric = createAsyncThunk<
  boolean,
  void,
  { state: RootState; rejectValue: string }
>("auth/authenticateBiometric", async (_, { rejectWithValue }) => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return rejectWithValue("Biometric hardware not available.");

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to access your wallet",
      fallbackLabel: "Use password instead",
      disableDeviceFallback: true,
      cancelLabel: "Cancel",
    });

    if (!result.success) {
      return rejectWithValue("Biometric authentication cancelled or failed.");
    }
    return true;
  } catch {
    return rejectWithValue("Biometric authentication error.");
  }
});

/**
 * Load the user's biometric preference from SecureStore.
 * Called once on app start from _layout.tsx.
 */
export const loadBiometricPreference = createAsyncThunk<
  boolean,
  void,
  { state: RootState }
>("auth/loadBiometricPreference", async () => {
  const pref = await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY);
  return pref === "true";
});

/**
 * Save the user's biometric preference to SecureStore.
 * Called from settings toggle and biometric setup screen.
 */
export const saveBiometricPreference = createAsyncThunk<
  boolean,
  boolean,
  { state: RootState }
>("auth/saveBiometricPreference", async (enabled) => {
  await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, enabled ? "true" : "false");
  return enabled;
});

/**
 * Set wallet password — stores in SecureStore (hardware-encrypted).
 * On iOS: Keychain. On Android: Keystore.
 */
export const setWalletPassword = createAsyncThunk<
  boolean,
  string,
  { state: RootState; rejectValue: string }
>("auth/setWalletPassword", async (password, { rejectWithValue }) => {
  try {
    await SecureStore.setItemAsync(PASSWORD_KEY, password);
    return true;
  } catch {
    return rejectWithValue("Failed to save password securely.");
  }
});

/**
 * Verify wallet password against SecureStore.
 */
export const verifyWalletPassword = createAsyncThunk<
  boolean,
  string,
  { state: RootState; rejectValue: string }
>("auth/verifyWalletPassword", async (password, { rejectWithValue }) => {
  try {
    const saved = await SecureStore.getItemAsync(PASSWORD_KEY);
    if (saved === password) return true;
    return rejectWithValue("Incorrect password.");
  } catch {
    return rejectWithValue("Failed to verify password.");
  }
});

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════

export interface LockState {
  /** Whether the wallet is currently unlocked */
  unlocked: boolean;
  /** Timestamp when wallet was last unlocked (for timeout calculation) */
  unlockedAt?: number;
  /** Whether the user has set a password (persisted via redux-persist) */
  passwordSet: boolean;
  /** Whether the device supports biometrics */
  biometricAvailable: boolean;
  /** Whether the user explicitly opted in to biometrics (loaded from SecureStore) */
  biometricPreference: boolean;
  /** Loading state for async operations */
  status: "idle" | "loading" | "rejected";
  /** Human-readable error message */
  errorMessage: string;
}

const initialState: LockState = {
  unlocked: false,
  unlockedAt: undefined,
  passwordSet: false,
  biometricAvailable: false,
  biometricPreference: false,
  status: "idle",
  errorMessage: "",
};

// ═══════════════════════════════════════════════════════════
// SLICE
// ═══════════════════════════════════════════════════════════

const lockSlice = createSlice({
  name: "lock",
  initialState,
  reducers: {
    /** Lock the wallet and clear the unlock timestamp */
    lockWallet(state) {
      state.unlocked = false;
      state.unlockedAt = undefined;
      state.errorMessage = "";
      // Clear persisted timestamp
      SecureStore.deleteItemAsync(UNLOCKED_AT_KEY).catch(() => {});
    },

    /** Unlock the wallet and record the timestamp */
    unlockWallet(state) {
      state.unlocked = true;
      state.unlockedAt = Date.now();
      state.errorMessage = "";
      SecureStore.setItemAsync(UNLOCKED_AT_KEY, state.unlockedAt.toString()).catch(() => {});
    },

    /** Restore unlock state from a persisted timestamp (app cold start) */
    unlockWalletFromPersisted(state, action: PayloadAction<number>) {
      state.unlocked = true;
      state.unlockedAt = action.payload;
      state.errorMessage = "";
    },

    /** Clear error message */
    clearAuthError(state) {
      state.errorMessage = "";
      state.status = "idle";
    },

    /** Full reset — used when clearing all wallets */
    resetLockState(state) {
      state.unlocked = false;
      state.unlockedAt = undefined;
      state.passwordSet = false;
      state.biometricAvailable = false;
      state.biometricPreference = false;
      state.errorMessage = "";
      state.status = "idle";
      // Wipe all secure data
      SecureStore.deleteItemAsync(PASSWORD_KEY).catch(() => {});
      SecureStore.deleteItemAsync(UNLOCKED_AT_KEY).catch(() => {});
      SecureStore.deleteItemAsync(BIOMETRIC_PREF_KEY).catch(() => {});
    },
  },

  extraReducers: (builder) => {
    // ─── REHYDRATE: Force lock on every cold start ───
    // redux-persist restores the entire biometrics slice from AsyncStorage,
    // including unlocked: true. We MUST override this on cold start.
    // Only passwordSet should survive rehydration.
    builder.addMatcher(
      (action) => action.type === REHYDRATE,
      (state, action: any) => {
        if (action.payload?.biometrics) {
          // Keep only passwordSet from persisted state
          state.passwordSet = action.payload.biometrics.passwordSet ?? false;
          // Always lock on cold start
          state.unlocked = false;
          state.unlockedAt = undefined;
          state.errorMessage = "";
          state.status = "idle";
        }
      }
    );

    // ─── Biometric Availability ───
    builder.addCase(checkBiometricAvailability.fulfilled, (state, action) => {
      state.biometricAvailable = action.payload;
    });

    // ─── Biometric Authentication ───
    // NOTE: This thunk ONLY authenticates. It does NOT change biometricPreference.
    // The unlock happens in the component after checking the result.
    builder.addCase(authenticateBiometric.pending, (state) => {
      state.status = "loading";
      state.errorMessage = "";
    });
    builder.addCase(authenticateBiometric.fulfilled, (state) => {
      state.unlocked = true;
      state.unlockedAt = Date.now();
      state.status = "idle";
      state.errorMessage = "";
      SecureStore.setItemAsync(UNLOCKED_AT_KEY, state.unlockedAt!.toString()).catch(() => {});
    });
    builder.addCase(authenticateBiometric.rejected, (state, action) => {
      state.status = "rejected";
      state.errorMessage = action.payload || "Biometric authentication failed.";
      // Do NOT change unlocked state — leave it as is
    });

    // ─── Load Biometric Preference (from SecureStore) ───
    builder.addCase(loadBiometricPreference.fulfilled, (state, action) => {
      state.biometricPreference = action.payload;
    });

    // ─── Save Biometric Preference (to SecureStore) ───
    builder.addCase(saveBiometricPreference.fulfilled, (state, action) => {
      state.biometricPreference = action.payload;
    });

    // ─── Set Password ───
    builder.addCase(setWalletPassword.pending, (state) => {
      state.status = "loading";
      state.errorMessage = "";
    });
    builder.addCase(setWalletPassword.fulfilled, (state) => {
      state.passwordSet = true;
      state.unlocked = true;
      state.unlockedAt = Date.now();
      state.status = "idle";
      SecureStore.setItemAsync(UNLOCKED_AT_KEY, state.unlockedAt!.toString()).catch(() => {});
    });
    builder.addCase(setWalletPassword.rejected, (state, action) => {
      state.status = "rejected";
      state.errorMessage = action.payload || "Failed to set password.";
    });

    // ─── Verify Password ───
    builder.addCase(verifyWalletPassword.pending, (state) => {
      state.status = "loading";
      state.errorMessage = "";
    });
    builder.addCase(verifyWalletPassword.fulfilled, (state) => {
      state.unlocked = true;
      state.unlockedAt = Date.now();
      state.status = "idle";
      state.errorMessage = "";
      SecureStore.setItemAsync(UNLOCKED_AT_KEY, state.unlockedAt!.toString()).catch(() => {});
    });
    builder.addCase(verifyWalletPassword.rejected, (state, action) => {
      state.unlocked = false;
      state.status = "rejected";
      state.errorMessage = action.payload || "Incorrect password.";
    });
  },
});

export const {
  lockWallet,
  unlockWallet,
  unlockWalletFromPersisted,
  clearAuthError,
  resetLockState,
} = lockSlice.actions;

export default lockSlice.reducer;
