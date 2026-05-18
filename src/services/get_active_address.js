const { Connection } = require("@solana/web3.js");

async function main() {
  const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=4ea6a1a7-e963-4e68-8b02-5e072f7e77a8", "confirmed");
  
  try {
    const slot = await connection.getSlot();
    console.log("Current slot:", slot);
    
    // Fetch a recent block with transactions
    const block = await connection.getBlock(slot - 10, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
      transactionDetails: "full"
    });
    
    if (block && block.transactions && block.transactions.length > 0) {
      for (const tx of block.transactions) {
        const message = tx.transaction.message;
        const accountKeys = message.staticAccountKeys || message.accountKeys;
        if (accountKeys && accountKeys.length > 0) {
          for (let i = 0; i < accountKeys.length; i++) {
            const pubkeyStr = accountKeys[i].toString();
            const postBal = tx.meta.postBalances[i];
            if (postBal > 1000000000) { // Balance > 1 SOL (definitely rent-exempt!)
              console.log(`Found active address: ${pubkeyStr} with balance: ${postBal} lamports (${postBal / 1e9} SOL)`);
              return;
            }
          }
        }
      }
    } else {
      console.log("No transactions found in block");
    }
  } catch (err) {
    console.error("Error finding active address:", err);
  }
}

main();
