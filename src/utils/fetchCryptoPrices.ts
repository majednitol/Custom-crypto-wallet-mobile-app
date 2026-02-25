

import axios from "axios";

export const CHAINID_TO_COINGECKO_ID: Record<number, string | null> = {
  // ───────────── Ethereum ─────────────
  1: "ethereum",
  11155111: "ethereum", // Sepolia

  // ───────────── Polygon ─────────────
  137: "polygon-ecosystem-token",
  80002: "polygon-ecosystem-token", // Amoy

  // ───────────── Arbitrum ─────────────
  42161: "ethereum",
  421614: "ethereum", // Sepolia
  42170: "ethereum",  // Nova

  // ───────────── Optimism ─────────────
  10: "ethereum",
  11155420: "ethereum", // Sepolia

  // ───────────── Base ─────────────
  8453: "ethereum",
  84532: "ethereum",

  // ───────────── zkSync ─────────────
  324: "ethereum",
  300: "ethereum",

  // ───────────── Polygon zkEVM ─────────────
  1101: "ethereum",
  2442: "ethereum",

  // ───────────── Scroll ─────────────
  534352: "ethereum",
  534351: "ethereum",

  // ───────────── Blast ─────────────
  81457: "ethereum",
  168587773: "ethereum",

  // ───────────── Linea ─────────────
  59144: "ethereum",
  59141: "ethereum",

  // ───────────── Avalanche ─────────────
  43114: "avalanche-2",
  43113: "avalanche-2",

  // ───────────── Mantle ─────────────
  5000: "mantle",
  5003: "mantle",

  // ───────────── Celo ─────────────
  42220: "celo",
  44787: "celo",

  // ───────────── Gnosis ─────────────
  100: "gnosis",

  // ───────────── Astar ─────────────
  592: "astar",

  // ───────────── Zora ─────────────
  7777777: "ethereum",
  56: "binancecoin",
  97: "binancecoin" ,

  // ───────────── SecureChain (custom) ─────────────
  34: null,
  3434: null,
  101:"solana"
};

export const TESTNET_CHAIN_IDS = new Set<number>([
  11155111, // Ethereum Sepolia
  421614,   // Arbitrum Sepolia
  11155420, // Optimism Sepolia
  84532,    // Base Sepolia
  300,      // zkSync Sepolia
  2442,     // Polygon zkEVM Cardona
  534351,   // Scroll Sepolia
  168587773,// Blast Sepolia
  59141,    // Linea Sepolia
  80002,    // Polygon Amoy
  43113,    // Avalanche Fuji
  5003,     // Mantle Sepolia
  44787,    // Celo Sepolia
  3434,     // SecureChain Testnet
  97
]);

export type PriceResult = { usd: number };

// 🔹 Batch fetch for multiple chainIds
export const fetchPricesByChainIds = async (
  chainIds: number[]
): Promise<Record<number, PriceResult>> => {
  const result: Record<number, PriceResult> = {};
  const coingeckoIds = new Set<string>();

  // Prepare: handle testnets and special chains
  for (const chainId of chainIds) {
    if (TESTNET_CHAIN_IDS.has(chainId)) {
      result[chainId] = { usd: 0 };
      continue;
    }

    if (chainId === 34) { // SecureChain
      try {
        const secureRes = await axios.get("https://price-api.securechain.ai/");
        result[chainId] = { usd: secureRes.data?.prices?.scai?.usd ?? 0 };
      } catch (err) {
        console.warn(`SecureChain fetch failed for chainId ${chainId}`, err);
        result[chainId] = { usd: 0 };
      }
      continue;
    }

    const coingeckoId = CHAINID_TO_COINGECKO_ID[chainId];
    if (!coingeckoId) {
      result[chainId] = { usd: 0 };
      continue;
    }

    coingeckoIds.add(coingeckoId);
  }

  // 🔹 Fetch CoinGecko prices in **one request** to prevent 429
  if (coingeckoIds.size > 0) {
    try {
      const idsParam = Array.from(coingeckoIds).join(",");
      const res = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
        params: { ids: idsParam, vs_currencies: "usd" },
      });

      for (const chainId of chainIds) {
        const id = CHAINID_TO_COINGECKO_ID[chainId];
        if (id && res.data[id]?.usd !== undefined) {
          result[chainId] = { usd: res.data[id].usd };
        } else if (!result[chainId]) {
          result[chainId] = { usd: 0 };
        }
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        console.warn("CoinGecko rate limit hit! Returning $0 for all affected chains.");
      } else {
        console.error("Error fetching CoinGecko prices:", err.message);
      }
      for (const chainId of chainIds) {
        if (!result[chainId]) result[chainId] = { usd: 0 };
      }
    }
  }

  return result;
};

// 🔹 Usage Example
(async () => {
  const testChainIds = [11155111];
  const prices = await fetchPricesByChainIds(testChainIds);

  for (const chainId of testChainIds) {
    console.log(prices);
  }
})();
