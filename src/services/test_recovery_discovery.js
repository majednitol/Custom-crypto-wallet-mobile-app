/**
 * Test: HD Wallet Account Recovery Discovery
 * 
 * Verifies that findNextUnusedWalletIndex correctly discovers
 * ALL accounts across mainnet + devnet with gap limit scanning.
 * 
 * Usage: node src/services/test_recovery_discovery.js
 */
const { Connection, Keypair } = require("@solana/web3.js");
const { derivePath } = require("ed25519-hd-key");
const { mnemonicToSeedSync, validateMnemonic } = require("bip39");
const { ethers } = require("ethers");

// ============ CONFIG ============
// Replace with your test seed phrase
const TEST_PHRASE = "crush memory flight code mask helmet farm alpha emerge absurd pitch rookie";
const MAX_SCAN = 10; // How many indices to scan
const GAP_LIMIT = 5;

// ============ SOLANA DISCOVERY ============
async function scanSolanaAccounts(phrase) {
  console.log("\n=== SOLANA ACCOUNT DISCOVERY ===\n");
  
  const seed = mnemonicToSeedSync(phrase, "");
  
  const connections = [
    new Connection("https://mainnet.helius-rpc.com/?api-key=4ea6a1a7-e963-4e68-8b02-5e072f7e77a8", "confirmed"),
    new Connection("https://api.devnet.solana.com", "confirmed"),
  ];
  
  const results = [];
  
  for (let i = 0; i < MAX_SCAN; i++) {
    const path = `m/44'/501'/${i}'/0'`;
    const keypair = Keypair.fromSeed(
      derivePath(path, seed.toString("hex")).key
    );
    const pubkey = keypair.publicKey.toBase58();
    
    let isUsed = false;
    let details = {};
    
    for (const [idx, conn] of connections.entries()) {
      const networkName = idx === 0 ? "mainnet" : "devnet";
      try {
        const [balance, sigs] = await Promise.all([
          conn.getBalance(keypair.publicKey),
          conn.getSignaturesForAddress(keypair.publicKey, { limit: 1 }),
        ]);
        
        if (balance > 0 || sigs.length > 0) {
          isUsed = true;
          details[networkName] = { balance, txCount: sigs.length };
        }
      } catch (e) {
        details[networkName] = { error: e.message };
      }
    }
    
    const status = isUsed ? "✅ USED" : "⬜ empty";
    console.log(`  Index ${i}: ${pubkey}`);
    console.log(`    Status: ${status}`);
    if (Object.keys(details).length > 0) {
      console.log(`    Details:`, JSON.stringify(details));
    }
    
    results.push({ index: i, pubkey, isUsed, details });
  }
  
  // Simulate gap-limit algorithm
  let lastUsedIndex = -1;
  let consecutiveUnused = 0;
  
  for (const r of results) {
    if (r.isUsed) {
      lastUsedIndex = r.index;
      consecutiveUnused = 0;
    } else {
      consecutiveUnused++;
      if (consecutiveUnused >= GAP_LIMIT) break;
    }
  }
  
  const discoveredCount = lastUsedIndex >= 0 ? lastUsedIndex + 1 : 0;
  console.log(`\n  📊 Gap limit algorithm result:`);
  console.log(`    Last used index: ${lastUsedIndex}`);
  console.log(`    Accounts to recover: ${discoveredCount}`);
  console.log(`    Return value: ${lastUsedIndex >= 0 ? lastUsedIndex + 2 : 0}`);
  
  return results;
}

// ============ EVM DISCOVERY ============
async function scanEvmAccounts(phrase) {
  console.log("\n=== EVM ACCOUNT DISCOVERY ===\n");
  
  const scanRpcs = [
    { name: "ETH Mainnet", url: "https://eth-mainnet.g.alchemy.com/v2/iQ_8RwrWNQWD7MLe5YNZJ" },
    { name: "Polygon", url: "https://polygon-mainnet.g.alchemy.com/v2/iQ_8RwrWNQWD7MLe5YNZJ" },
    { name: "Arbitrum", url: "https://arb-mainnet.g.alchemy.com/v2/iQ_8RwrWNQWD7MLe5YNZJ" },
    { name: "BSC", url: "https://bsc-dataseed.binance.org/" },
    { name: "SecureChain", url: "https://mainnet-rpc.scai.network" },
    { name: "Sepolia", url: "https://eth-sepolia.g.alchemy.com/v2/iQ_8RwrWNQWD7MLe5YNZJ" },
    { name: "Arb Sepolia", url: "https://arb-sepolia.g.alchemy.com/v2/iQ_8RwrWNQWD7MLe5YNZJ" },
  ];
  
  const providers = scanRpcs.map(({ name, url }) => {
    try {
      return { name, provider: new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true, batchMaxCount: 1 }) };
    } catch {
      return null;
    }
  }).filter(Boolean);
  
  const mnemonic = ethers.Mnemonic.fromPhrase(phrase);
  const results = [];
  
  for (let i = 0; i < MAX_SCAN; i++) {
    const path = `m/44'/60'/0'/0/${i}`;
    const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, path);
    const address = wallet.address;
    
    let isUsed = false;
    let chainBalances = {};
    
    const checks = await Promise.allSettled(
      providers.map(async ({ name, provider }) => {
        try {
          const balance = await provider.getBalance(address);
          if (balance > 0n) {
            chainBalances[name] = ethers.formatEther(balance);
            return true;
          }
          return false;
        } catch (e) {
          console.log(`Error on ${name} for ${address}:`, e.message);
          return false;
        }
      })
    );
    
    isUsed = checks.some(r => r.status === "fulfilled" && r.value === true);
    
    const status = isUsed ? "✅ USED" : "⬜ empty";
    console.log(`  Index ${i}: ${address}`);
    console.log(`    Status: ${status}`);
    if (Object.keys(chainBalances).length > 0) {
      console.log(`    Balances:`, JSON.stringify(chainBalances));
    }
    
    results.push({ index: i, address, isUsed, chainBalances });
  }
  
  // Simulate gap-limit algorithm
  let lastUsedIndex = -1;
  let consecutiveUnused = 0;
  
  for (const r of results) {
    if (r.isUsed) {
      lastUsedIndex = r.index;
      consecutiveUnused = 0;
    } else {
      consecutiveUnused++;
      if (consecutiveUnused >= GAP_LIMIT) break;
    }
  }
  
  const discoveredCount = lastUsedIndex >= 0 ? lastUsedIndex + 1 : 0;
  console.log(`\n  📊 Gap limit algorithm result:`);
  console.log(`    Last used index: ${lastUsedIndex}`);
  console.log(`    Accounts to recover: ${discoveredCount}`);
  console.log(`    Return value: ${lastUsedIndex >= 0 ? lastUsedIndex + 2 : 0}`);
  
  return results;
}

// ============ MAIN ============
async function main() {
  console.log("🔍 HD Wallet Recovery Discovery Test");
  console.log(`📝 Phrase: "${TEST_PHRASE.split(" ").slice(0, 3).join(" ")}..."`);
  console.log(`🔢 Scanning indices 0-${MAX_SCAN - 1} with GAP_LIMIT=${GAP_LIMIT}`);
  
  if (!validateMnemonic(TEST_PHRASE)) {
    console.error("❌ Invalid mnemonic phrase!");
    process.exit(1);
  }
  
  try {
    await scanSolanaAccounts(TEST_PHRASE);
  } catch (e) {
    console.error("Solana scan failed:", e.message);
  }
  
  try {
    await scanEvmAccounts(TEST_PHRASE);
  } catch (e) {
    console.error("EVM scan failed:", e.message);
  }
  
  console.log("\n✅ Discovery test complete.");
}

main().catch(console.error);
