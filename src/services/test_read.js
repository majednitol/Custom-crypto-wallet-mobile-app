const { Connection, PublicKey } = require("@solana/web3.js");

async function main() {
  const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=4ea6a1a7-e963-4e68-8b02-5e072f7e77a8", "confirmed");
  const addr1 = new PublicKey("B9hBF4uGunmyFU3R8Wuiq2kQVudofVuTqoYc6PzkV85s");
  const addr2 = new PublicKey("9W5aQ165qabu4Jjfucm5nB7tP47tRR7A4HQw84HiAup7");

  try {
    const bal1 = await connection.getBalance(addr1);
    const bal2 = await connection.getBalance(addr2);
    console.log(`Balance of B9hBF4...: ${bal1} lamports (${bal1 / 1e9} SOL)`);
    console.log(`Balance of 9W5aQ1...: ${bal2} lamports (${bal2 / 1e9} SOL)`);
  } catch (err) {
    console.error("Read error:", err);
  }
}

main();
