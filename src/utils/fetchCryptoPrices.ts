

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
        console.warn("Error fetching CoinGecko prices:", err.message);
      }
      for (const chainId of chainIds) {
        if (!result[chainId]) result[chainId] = { usd: 0 };
      }
    }
  }

  return result;
};



// ═══════════════════════════════════════════════════════════
// NEW: Full Market Data + Chart Data (for Token Detail Screen)
// ═══════════════════════════════════════════════════════════

export interface CoinGeckoMarketData {
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  priceChangePercentage7d: number;
  priceChangePercentage30d: number;
  priceChangePercentage1y: number;
  marketCap: number;
  totalVolume: number;
  circulatingSupply: number;
  totalSupply: number;
  ath: number;
  athChangePercentage: number;
  atl: number;
  atlChangePercentage: number;
  lastUpdated: string;
}

export interface ChartDataPoint {
  timestamp: number;
  price: number;
}

export interface CoinGeckoChartData {
  prices: ChartDataPoint[];
}

/**
 * Fetch full market data from CoinGecko for a single coin
 * Uses /coins/{id} endpoint (not /simple/price)
 */
export const fetchCoinGeckoMarketData = async (
  chainId: number
): Promise<CoinGeckoMarketData | null> => {
  // Handle SecureChain separately
  if (chainId === 34 || chainId === 3434) {
    try {
      const res = await axios.get("https://price-api.securechain.ai/");
      const price = res.data?.prices?.scai?.usd ?? 0;
      return {
        price,
        priceChange24h: 0,
        priceChangePercentage24h: 0,
        priceChangePercentage7d: 0,
        priceChangePercentage30d: 0,
        priceChangePercentage1y: 0,
        marketCap: 0,
        totalVolume: 0,
        circulatingSupply: 0,
        totalSupply: 0,
        ath: price,
        athChangePercentage: 0,
        atl: price,
        atlChangePercentage: 0,
        lastUpdated: new Date().toISOString(),
      };
    } catch (err) {
      console.warn("SecureChain market data fetch failed:", err);
      return null;
    }
  }

  // Handle testnets
  if (TESTNET_CHAIN_IDS.has(chainId)) {
    return null;
  }

  const coingeckoId = CHAINID_TO_COINGECKO_ID[chainId];
  if (!coingeckoId) {
    return null;
  }

  try {
    const res = await axios.get(`https://api.coingecko.com/api/v3/coins/${coingeckoId}`, {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false,
      },
    });

    const md = res.data.market_data;
    if (!md) return null;

    return {
      price: md.current_price?.usd ?? 0,
      priceChange24h: md.price_change_24h ?? 0,
      priceChangePercentage24h: md.price_change_percentage_24h ?? 0,
      priceChangePercentage7d: md.price_change_percentage_7d ?? 0,
      priceChangePercentage30d: md.price_change_percentage_30d ?? 0,
      priceChangePercentage1y: md.price_change_percentage_1y ?? 0,
      marketCap: md.market_cap?.usd ?? 0,
      totalVolume: md.total_volume?.usd ?? 0,
      circulatingSupply: md.circulating_supply ?? 0,
      totalSupply: md.total_supply ?? 0,
      ath: md.ath?.usd ?? 0,
      athChangePercentage: md.ath_change_percentage?.usd ?? 0,
      atl: md.atl?.usd ?? 0,
      atlChangePercentage: md.atl_change_percentage?.usd ?? 0,
      lastUpdated: md.last_updated ?? new Date().toISOString(),
    };
  } catch (err: any) {
    if (err.response?.status === 429) {
      console.warn("CoinGecko rate limit hit for market data!");
    } else {
      console.warn("Error fetching CoinGecko market data:", err.message);
    }
    return null;
  }
};

/**
 * Fetch chart data (price history) from CoinGecko
 * Uses /coins/{id}/market_chart endpoint
 */
export const fetchCoinGeckoChartData = async (
  chainId: number,
  days: string = "1"
): Promise<CoinGeckoChartData | null> => {
  // Handle SecureChain — no chart data available
  if (chainId === 34 || chainId === 3434) {
    return null;
  }

  // Handle testnets
  if (TESTNET_CHAIN_IDS.has(chainId)) {
    return null;
  }

  const coingeckoId = CHAINID_TO_COINGECKO_ID[chainId];
  if (!coingeckoId) {
    return null;
  }

  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart`,
      {
        params: {
          vs_currency: "usd",
          days,
        },
      }
    );

    const prices = res.data.prices;
    if (!Array.isArray(prices)) return null;

    return {
      prices: prices.map(([timestamp, price]: [number, number]) => ({
        timestamp,
        price,
      })),
    };
  } catch (err: any) {
    if (err.response?.status === 429) {
      console.warn("CoinGecko rate limit hit for chart data!");
    } else {
      console.warn("Error fetching CoinGecko chart data:", err.message);
    }
    return null;
  }
};

// 🔹 Usage Example
(async () => {
  const testChainIds = [11155111];
  const prices = await fetchPricesByChainIds(testChainIds);

  for (const chainId of testChainIds) {
    console.log(prices);
  }
})();
