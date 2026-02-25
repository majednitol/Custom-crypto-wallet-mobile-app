import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Keypair,
} from "@solana/web3.js";

import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

/* ---------------- CONFIG ---------------- */

const RPC_URL = "https://api.devnet.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

/* ---------------- CONSTANTS ---------------- */

const TOKEN_MINT = new PublicKey(
  "63aZEC4QH7d5dhefpp9yx2rbk6p4NhY1AXd5rpuDqxx6"
);

/* ---------------- SOL BALANCE ---------------- */

async function getSolBalance(wallet: PublicKey) {
  const lamports = await connection.getBalance(wallet);
  return lamports / LAMPORTS_PER_SOL;
}

/* ---------------- MINT INFO ---------------- */

async function getMintInfo(mint: PublicKey) {
  console.log("\n=== TOKEN MINT INFO ===");

  const supplyInfo = await connection.getTokenSupply(mint);

  console.log("Mint Address :", mint.toBase58());
  console.log("Decimals     :", supplyInfo.value.decimals);
  console.log("Total Supply :", supplyInfo.value.uiAmount);

  return supplyInfo.value;
}

/* ---------------- WALLET TOKEN BALANCE ---------------- */

async function getWalletTokenBalance(
  wallet: PublicKey,
  mint: PublicKey
) {
  console.log("\n=== WALLET TOKEN BALANCE ===");

  const ata = await getAssociatedTokenAddress(mint, wallet);

  console.log("Wallet       :", wallet.toBase58());
  console.log("Token ATA    :", ata.toBase58());

  const accountInfo = await connection.getAccountInfo(ata);

  if (!accountInfo) {
    console.log("Token Balance: 0 (ATA not created)");
    return {
      ata: ata.toBase58(),
      amount: 0,
    };
  }

  const balance = await connection.getTokenAccountBalance(ata);

  console.log("Token Balance:", balance.value.uiAmount);

  return {
    ata: ata.toBase58(),
    amount: balance.value.uiAmount,
    decimals: balance.value.decimals,
  };
}

/* ---------------- TEST RUN ---------------- */

(async () => {
  // ⚠️ DEVNET PRIVATE KEY ONLY
  const secretKey = Uint8Array.from([
    
  ]);

  const wallet = Keypair.fromSecretKey(secretKey);

  console.log("=== WALLET INFO ===");
  console.log("Address:", wallet.publicKey.toBase58());

  const solBalance = await getSolBalance(wallet.publicKey);
  console.log("SOL Balance:", solBalance);

  await getMintInfo(TOKEN_MINT);

  await getWalletTokenBalance(wallet.publicKey, TOKEN_MINT);
})();
