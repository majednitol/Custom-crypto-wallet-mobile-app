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
    console.error(" Failed to fetch wallet NFTs:", err?.message || err);
    return [];
  }
}
// ----------------- Fetch Transfers -----------------
async function fetchTransfers(chainId: number, wallet: string): Promise<Transfer[]> {
  const network = NETWORKS.find(n => n.chainId === chainId);
  if (!network) throw new Error(`Network not found for chainId ${chainId}`);
console.log("chainId", chainId,wallet);
  const isSecureChain = chainId === 34 || chainId === 3434;
  const isAlchemy =
  !isSecureChain &&
  network.rpcUrl.includes("alchemy.com");

  // ----------------- Alchemy-style -----------------
  if (isAlchemy) {
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



if (chainId === 34 || chainId === 3434) {
  const BLOCKSCOUT_API = "https://explorer.securechain.ai/api";

  try {
    const normalTxsRes = await axios.get(
      `${BLOCKSCOUT_API}?module=account&action=txlist&address=${wallet}&sort=desc`
    );
    const normalTxs = normalTxsRes.data.result || [];

    const tokenTxsRes = await axios.get(
      `${BLOCKSCOUT_API}?module=account&action=tokentx&address=${wallet}&sort=desc`
    );
    const tokenTxs = tokenTxsRes.data.result || [];

    const allTxs: Transfer[] = [
      ...normalTxs.map((tx: any): Transfer => ({
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

      ...tokenTxs.map((tx: any): Transfer => ({
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

    return allTxs.sort((a, b) => b.blockNumber - a.blockNumber);
  } catch (err: any) {
    console.error(`[ChainId ${chainId}] SecureChain fetch error:`, err?.message || err);
    return [];
  }
}


  console.warn(`[ChainId ${chainId}] No fetch method implemented.`);
  return [];
}

export default fetchTransfers;


 
// ----------------- Example Usage -----------------
// (async () => {
//   const wallet = "0x58BFd42F60b20BF1Ec934B0EfA9F0a6efeCe29F0";
//   const chainId = 34; 

//   const transfers = await fetchTransfers(chainId, wallet);

//   console.log(`\n📊 Transfers for wallet ${wallet} on chain ${chainId}:`);
//   transfers.forEach((tx, idx) => {
//     console.log(`${idx + 1}. Hash: ${tx.hash}`);
//     console.log(`   From: ${tx.from}`);
//     console.log(`   To:   ${tx.to}`);
//     console.log(`   Value: ${tx.value}`);
//     console.log(`   Category: ${tx.category}`);
//     console.log(`   Direction: ${tx.direction}`);
//     console.log(`   Type: ${tx.type}\n`);
//   });
// })();
