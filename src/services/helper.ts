import axios from "axios";
import NETWORKS from "./defaultNetwork";
import { ethers } from "ethers";
export type UnifiedNftType = "ERC721" | "ERC1155" | "ERC404";

export interface INFT {
  chainId: number;
  tokenId: string;
  name?: string;
  imageUrl?: string;
}
 export interface Transfer {
  hash: string;
  from: string;
  to: string;
  value: string;
  category: string;
  direction: "received" | "sent"; // strict union
  type: "NORMAL" | "TOKEN" | "ERC20/ERC721/ERC1155";
  blockNumber: number;
}
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT = 15000;

function normalizeAlchemyImage(nft: any): string | undefined {
  return (
    nft.image?.cachedUrl ||
    nft.image?.gateway ||
    nft.media?.[0]?.gateway ||
    nft.metadata?.image ||
    undefined
  );
}

export async function getAllWalletNfts(
  address: string,
  chainId: number
): Promise<INFT[]> {
  const network = NETWORKS.find(n => n.chainId === chainId);
  if (!network) throw new Error(`Network not found for chainId ${chainId}`);
console.log("network",network)
  try {
    if (chainId === 34|| chainId === 3434) {
      const res = await axios.get(
        `${network.nftRpcUrl}/addresses/${address}/nft`,
        {
          params: {
            type: ["ERC-721", "ERC-1155", "ERC-404"].join(","),
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      return (res.data?.items ?? []).map((nft: any): INFT => ({
        chainId,
        tokenId: nft.id,
        name: nft.metadata?.name,
        imageUrl: nft.image_url ?? undefined,
      }));
    }

    if (!network.nftRpcUrl) return [];

    let pageKey: string;
    const allNFTs: INFT[] = [];

    do {
      const { data } = await axios.get(network.nftRpcUrl, {
        params: {
          owner: address,
          withMetadata: true,
          pageSize: PAGE_SIZE,
          pageKey,
        },
        headers: { accept: "application/json" },
        timeout: REQUEST_TIMEOUT,
      });

      const ownedNfts = data?.ownedNfts ?? [];

      allNFTs.push(
        ...ownedNfts.map((nft: any): INFT => ({
          chainId,
          tokenId: nft.tokenId,
          name: nft.name ?? nft.metadata?.name,
          imageUrl: normalizeAlchemyImage(nft),
        }))
      );

      pageKey = data?.pageKey;
    } while (pageKey);

    return allNFTs; 
  } catch (err: any) {
    // Only log critical errors, suppress 404/network errors to avoid red boxes
    if (err.response?.status !== 404) {
      console.warn(`[getAllWalletNfts] Error for chain ${chainId}:`, err?.message || err);
    }
    return [];
  }
}
// ----------------- Fetch Transfers -----------------
export async function fetchTransfers(chainId: number, wallet: string, explorerUrl?: string): Promise<Transfer[]> {
  const network = NETWORKS.find(n => n.chainId === chainId);
  const effectiveExplorerUrl = explorerUrl || network?.explorerUrl;
  
  console.log("chainId", chainId, wallet, "explorer", effectiveExplorerUrl);
  
  const isSecureChain = chainId === 34 || chainId === 3434;
  const isAlchemy =
    !isSecureChain &&
    network?.rpcUrl.includes("alchemy.com");

  // ----------------- Alchemy-style -----------------
  if (isAlchemy && network) {
    try {
      const outgoing = await axios.post(network.rpcUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [{ 
          fromBlock: "0x0",
          toBlock: "latest",
          fromAddress: wallet,
          category: ["external","erc20","erc721","erc1155"],
          maxCount: "0x3e8"
        }]
      });

      const incoming = await axios.post(network.rpcUrl, {
        jsonrpc: "2.0",
        id: 2,
        method: "alchemy_getAssetTransfers",
        params: [{
          fromBlock: "0x0",
          toBlock: "latest",
          toAddress: wallet,
          category: ["external","erc20","erc721","erc1155"],
          maxCount: "0x3e8"
        }]
      });

      const allTransfers: Transfer[] = [
        ...(outgoing.data.result?.transfers || []),
        ...(incoming.data.result?.transfers || [])
      ].map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value ?? "N/A (ERC721/ERC1155)",
        category: tx.category,
        direction: (tx.from.toLowerCase() === wallet.toLowerCase() ? "sent" : "received") as "received" | "sent",
        type: "ERC20/ERC721/ERC1155",
        blockNumber: parseInt(tx.blockNum, 16)
      }));

      return allTransfers.sort((a, b) => b.blockNumber - a.blockNumber);

    } catch (err:any) {
      console.error(`[ChainId ${chainId}] Alchemy fetch error:`, err.message || err);
      return [];
    }
  }

  // ----------------- Explorer-style (Etherscan/Blockscout) -----------------
  if (effectiveExplorerUrl || isSecureChain) {
    let baseUrl = effectiveExplorerUrl ? 
      (effectiveExplorerUrl.endsWith("/") ? effectiveExplorerUrl.slice(0, -1) : effectiveExplorerUrl) : 
      "https://explorer.securechain.ai";
    
    // Most explorers expose the API at /api
    let apiEndpoint = `${baseUrl}/api`;

    // Intelligent check: if it's a known explorer that uses 'api.' subdomain (like Monadscan, Etherscan)
    if (baseUrl.includes("monadscan.com") && !baseUrl.includes("api.")) {
      apiEndpoint = "https://api.monadscan.com/api";
    } else if (baseUrl.includes("etherscan.io") && !baseUrl.includes("api-")) {
      // Note: etherscan uses subdomains like api.etherscan.io or api-sepolia.etherscan.io
      // But we usually use Alchemy for these, so this is just a fallback
    }

    try {
      // Helper to try a request and return results
      const tryFetch = async (endpoint: string) => {
        try {
          const [normal, token] = await Promise.all([
            axios.get(`${endpoint}?module=account&action=txlist&address=${wallet}&sort=desc`, { timeout: 8000 }),
            axios.get(`${endpoint}?module=account&action=tokentx&address=${wallet}&sort=desc`, { timeout: 8000 })
          ]);
          
          // Detect V1 deprecation (Monadscan etc)
          if (typeof normal.data.result === "string" && normal.data.result.includes("deprecated V1")) {
            return null;
          }

          return { normal: normal.data.result, token: token.data.result };
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

      const normalTxs = res?.normal || [];
      const tokenTxs = res?.token || [];

      const allTxs: Transfer[] = [
        ...(Array.isArray(normalTxs) ? normalTxs : []).map((tx: any): Transfer => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: ethers.formatEther(tx.value ?? "0"), 
          category: "NORMAL",
          direction:
            tx.from.toLowerCase() === wallet.toLowerCase()
              ? "sent"
              : "received", 
          type: "NORMAL",
          blockNumber: Number(tx.blockNumber),
        })),

        ...(Array.isArray(tokenTxs) ? tokenTxs : []).map((tx: any): Transfer => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: ethers.formatUnits(
            tx.value ?? "0",
            Number(tx.tokenDecimal ?? 18)
          ), 
          category: tx.tokenName || "TOKEN",
          direction:
            tx.from.toLowerCase() === wallet.toLowerCase()
              ? "sent"
              : "received",
          type: "ERC20/ERC721/ERC1155", 
          blockNumber: Number(tx.blockNumber),
        })),
      ];

      // If we got zero transactions from the API but explorerUrl is available, we try HTML scraping as a highly robust fallback
      if (allTxs.length === 0 && effectiveExplorerUrl) {
        try {
          console.log(`ℹ️ API returned no transactions. Attempting HTML scraping from explorer: ${effectiveExplorerUrl}/address/${wallet}`);
          const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
          };
          const response = await axios.get(`${effectiveExplorerUrl}/address/${wallet}`, { headers, timeout: 15000 });
          const html = response.data;
          const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) || [];
          
          for (const row of rows) {
            const txHashMatch = row.match(/href='\/tx\/(0x[a-fA-F0-9]{64})'/);
            if (!txHashMatch) continue;

            const hash = txHashMatch[1];
            
            // Block number
            const blockMatch = row.match(/href='\/block\/(\d+)'/);
            const blockNumber = blockMatch ? parseInt(blockMatch[1]) : 0;

            // Extract full addresses from clipboard attributes
            const addressMatches = [...row.matchAll(/data-clipboard-text='(0x[a-fA-F0-9]{40})'/ig)].map(m => m[1]);
            const from = addressMatches[0] || wallet;
            const to = addressMatches[1] || wallet;

            // Direction
            const direction = from.toLowerCase() === wallet.toLowerCase() ? "sent" : "received";

            // Value & Td Texts
            const tdMatches = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1].replace(/<[^>]*>/g, '').trim());
            
            // Find value by checking for currencies or numbers
            let value = "0";
            for (const tdText of tdMatches) {
              if (tdText.includes("BNB") || tdText.includes("ETH") || tdText.includes("SCAI") || tdText.includes("SCAIP")) {
                value = tdText.replace(/(BNB|ETH|SCAIP|SCAI)/g, "").trim();
                break;
              }
            }

            allTxs.push({
              hash,
              from,
              to,
              value,
              category: "NORMAL",
              direction: direction as "received" | "sent",
              type: "NORMAL",
              blockNumber
            });
          }
        } catch (scrapeErr: any) {
          console.warn(`[ChainId ${chainId}] HTML scraping fallback failed:`, scrapeErr?.message || scrapeErr);
        }
      }

      return allTxs.sort((a, b) => b.blockNumber - a.blockNumber);
    } catch (err: any) {
      console.warn(`[ChainId ${chainId}] Explorer fetch error at ${apiEndpoint}:`, err?.message || err);
      return [];
    }
  }

  console.warn(`[ChainId ${chainId}] No fetch method implemented.`);
  return [];
}

export default fetchTransfers;


 
// ----------------- Example Usage / Testing -----------------
// To test, uncomment the lines below and run with a TS-friendly node environment.
/*
(async () => {
  const wallet = "0x58BFd42F60b20BF1Ec934B0EfA9F0a6efeCe29F0";
  const chainId = 534351; // Scroll Sepolia
  const explorerUrl = "https://sepolia.scrollscan.com";

  console.log(`\n🔍 Testing data fetch for wallet ${wallet} on chain ${chainId}...`);
  try {
    const transfers = await fetchTransfers(chainId, wallet, explorerUrl);

    console.log(`\n📊 Transfers found: ${transfers.length}`);
    transfers.slice(0, 5).forEach((tx, idx) => {
      console.log(`${idx + 1}. Hash: ${tx.hash}`);
      console.log(`   From: ${tx.from}`);
      console.log(`   To:   ${tx.to}`);
      console.log(`   Value: ${tx.value}`);
      console.log(`   Direction: ${tx.direction}`);
      console.log(`   Type: ${tx.type}\n`);
    });
  } catch (err) {
    console.error("Test fetch failed:", err);
  }
})();
*/
