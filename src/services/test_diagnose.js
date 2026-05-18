const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, ComputeBudgetProgram } = require("@solana/web3.js");

async function diagnose() {
  const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=4ea6a1a7-e963-4e68-8b02-5e072f7e77a8", "confirmed");
  const sender = new PublicKey("B9hBF4uGunmyFU3R8Wuiq2kQVudofVuTqoYc6PzkV85s");
  const receiver = new PublicKey("GR2S23LeZYAgpiV3LzBXpnJj3KMdAAz1B7MZAesuYrSs");

  // 1. Get account info
  const info = await connection.getAccountInfo(sender);
  const balance = await connection.getBalance(sender);
  const space = info ? info.data.length : 0;
  const rentMin = await connection.getMinimumBalanceForRentExemption(space);
  const owner = info ? info.owner.toBase58() : "none";

  console.log("=== ACCOUNT DIAGNOSIS ===");
  console.log("Balance:", balance, "lamports =", balance / LAMPORTS_PER_SOL, "SOL");
  console.log("Data space:", space, "bytes");
  console.log("Owner:", owner);
  console.log("Rent-exempt minimum:", rentMin, "lamports =", rentMin / LAMPORTS_PER_SOL, "SOL");
  console.log("Spendable (balance - rent):", balance - rentMin, "lamports");
  console.log("Is rent-locked:", balance <= rentMin);

  // 2. Try simulation with NO priority fee (just base 5000)
  console.log("\n=== SIMULATION: Transfer with NO priority fee ===");
  const sendAmount = balance - 5000; // balance minus base fee
  const tx1 = new Transaction();
  tx1.add(SystemProgram.transfer({
    fromPubkey: sender,
    toPubkey: receiver,
    lamports: sendAmount,
  }));
  tx1.recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;
  tx1.feePayer = sender;
  try {
    const sim1 = await connection.simulateTransaction(tx1);
    console.log("Result:", sim1.value.err ? "FAILED" : "SUCCESS");
    console.log("Error:", JSON.stringify(sim1.value.err));
    console.log("Logs:", sim1.value.logs);
  } catch (e) {
    console.log("Simulation threw:", e.message);
  }

  // 3. Try NonceWithdraw simulation
  console.log("\n=== SIMULATION: NonceWithdraw (no priority fee) ===");
  const tx2 = new Transaction();
  tx2.add(SystemProgram.nonceWithdraw({
    noncePubkey: sender,
    authorizedPubkey: sender,
    toPubkey: receiver,
    lamports: sendAmount,
  }));
  tx2.recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;
  tx2.feePayer = sender;
  try {
    const sim2 = await connection.simulateTransaction(tx2);
    console.log("Result:", sim2.value.err ? "FAILED" : "SUCCESS");
    console.log("Error:", JSON.stringify(sim2.value.err));
    console.log("Logs:", sim2.value.logs);
  } catch (e) {
    console.log("Simulation threw:", e.message);
  }

  // 4. Check if account is actually a Nonce Account by parsing data
  if (info && info.data.length === 80) {
    const version = info.data.readUInt32LE(0);
    console.log("\n=== NONCE ACCOUNT DATA ===");
    console.log("Version field:", version);
    console.log("Is initialized nonce:", version === 1);
    if (version === 1) {
      // Nonce account layout: 4 bytes version + 32 bytes authority + 32 bytes nonce + padding
      const authority = new PublicKey(info.data.slice(8, 40));
      console.log("Nonce authority:", authority.toBase58());
      console.log("Authority matches sender:", authority.equals(sender));
    }
  }
}

diagnose().catch(console.error);
