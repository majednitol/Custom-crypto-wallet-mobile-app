# Custom Wallet (Multi-Chain Crypto Wallet)

A secure **multi-chain mobile wallet** built with **React Native (Expo)** that supports **Ethereum (EVM)** and **Solana**.  
Includes wallet setup/import, biometric unlock, auto-lock security, multi-account management, and **send/receive for native coins + ERC-20 + SPL tokens + NFTs**.

---

## ✨ Key Features

### 🔐 Security
- **Biometric unlock** (FaceID / TouchID) using Expo Local Authentication
- **Password unlock** fallback
- **Auto-lock** after inactivity timeout (configurable)
- Persisted lock state using AsyncStorage + Redux Persist

### 🧩 Wallet Core
- Create / Import wallet (seed phrase)
- Seed phrase confirmation flow
- Multi-account support (EVM + Solana)
- Token list & token details screens

### 💸 Transfers
- **Send / Receive**
  - **Ethereum native** (ETH)
  - **ERC-20 tokens**
  - **Solana native** (SOL)
  - **SPL tokens**
  - **NFTs (EVM + Solana supported by UI/flow)**

### 🧭 UX
- Expo Router navigation
- Clean theme system + gradient background
- Toast notifications
- Sentry error tracking integration

---

## 🛠 Tech Stack
- **React Native (Expo) + TypeScript**
- **Redux Toolkit + Redux Persist**
- Expo Router
- Expo Local Authentication
- AsyncStorage
- Styled Components
- Sentry

---
npx expo run:ios

npx expo run:android --variant release