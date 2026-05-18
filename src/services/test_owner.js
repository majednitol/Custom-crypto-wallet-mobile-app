const { Connection, PublicKey } = require("@solana/web3.js");

async function main() {
  const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=4ea6a1a7-e963-4e68-8b02-5e072f7e77a8", "confirmed");
  const addr = new PublicKey("B9hBF4uGunmyFU3R8Wuiq2kQVudofVuTqoYc6PzkV85s");

  try {
    const info = await connection.getAccountInfo(addr);
    console.log("Account Info:", JSON.stringify(info, null, 2));
  } catch (err) {
    console.error("Error reading account info:", err);
  }
}

main();
