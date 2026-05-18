const { Connection, PublicKey, Transaction, ComputeBudgetProgram, SystemProgram } = require("@solana/web3.js");

async function main() {
  const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=4ea6a1a7-e963-4e68-8b02-5e072f7e77a8", "confirmed");
  const fromPubkey = new PublicKey("B9hBF4uGunmyFU3R8Wuiq2kQVudofVuTqoYc6PzkV85s");
  const toPubkey = new PublicKey("GR2S23LeZYAgpiV3LzBXpnJj3KMdAAz1B7MZAesuYrSs");

  const transaction = new Transaction();
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 150000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500000 })
  );
  transaction.add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: 1367680,
    })
  );

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  console.log("Getting fee for transaction...");
  try {
    const feeResult = await connection.getFeeForMessage(transaction.compileMessage(), "confirmed");
    console.log("Fee Result:", JSON.stringify(feeResult, null, 2));
  } catch (err) {
    console.error("Fee error:", err);
  }
}

main();
