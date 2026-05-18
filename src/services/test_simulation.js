const { Connection, PublicKey, TransactionMessage, VersionedTransaction, SystemProgram } = require("@solana/web3.js");

async function main() {
  const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=4ea6a1a7-e963-4e68-8b02-5e072f7e77a8", "confirmed");
  const fromPubkey = new PublicKey("B9hBF4uGunmyFU3R8Wuiq2kQVudofVuTqoYc6PzkV85s");
  const toPubkey = new PublicKey("Awes4Tr6TX8JDzEhCZY2QVNimT6iD1zWHzf1vNyGvpLM");

  const instructions = [
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: 10000,
    })
  ];

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  
  const messageV0 = new TransactionMessage({
    payerKey: fromPubkey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);

  console.log("Simulating transfer without priority fees...");
  try {
    const response = await connection.simulateTransaction(transaction, { sigVerify: false });
    console.log("Simulation Response:", JSON.stringify(response, null, 2));
  } catch (err) {
    console.error("Simulation error:", err);
  }
}

main();
