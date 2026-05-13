import axios from "axios";
import { ethers } from "ethers";

async function testFetch(explorerUrl: string, wallet: string) {
  const baseUrl = explorerUrl.endsWith("/") ? explorerUrl.slice(0, -1) : explorerUrl;
  let apiEndpoint = `${baseUrl}/api`;

  if (baseUrl.includes("monadscan.com") && !baseUrl.includes("api.")) {
    apiEndpoint = "https://api.monadscan.com/api";
  }

  console.log(`\n🚀 Testing Explorer: ${apiEndpoint}`);
  console.log(`👛 Wallet: ${wallet}`);

  try {
    const tryFetch = async (endpoint: string) => {
      try {
        const res = await axios.get(`${endpoint}?module=account&action=txlist&address=${wallet}&sort=desc`, { timeout: 8000 });
        if (typeof res.data.result === "string" && res.data.result.includes("deprecated V1")) return null;
        return res;
      } catch (e) {
        return null;
      }
    };

    let res = await tryFetch(apiEndpoint);
    if (!res) {
      const v2 = apiEndpoint.replace(/\/api$/, "/api/v2");
      console.log(`⚠️  V1 Deprecated, trying V2: ${v2}`);
      res = await tryFetch(v2);
    }

    if (res) {
      console.log(`✅ Status: ${res.data.status}`);
      console.log(`💬 Message: ${res.data.message}`);
      if (Array.isArray(res.data.result)) {
        console.log(`📊 Found ${res.data.result.length} transactions.`);
      }
    } else {
      console.log("❌ Both V1 and V2 failed.");
    }
  } catch (err: any) {
    console.error("❌ Fetch failed:", err.message);
  }
}

// Test with a known active address on a popular explorer
const TEST_WALLET = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const EXPLORERS = [
  "https://blockscout.com/eth/mainnet",
  "https://sepolia.scrollscan.com",
  "https://monadscan.com",
];

(async () => {
  for (const exp of EXPLORERS) {
    await testFetch(exp, TEST_WALLET);
  }
})();
