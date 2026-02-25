import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  Commitment,
} from "@solana/web3.js";


import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

/* ---------------- CONFIG ---------------- */

// Switch easily between devnet / mainnet
const RPC_URL = "https://api.devnet.solana.com";
const COMMITMENT: Commitment = "confirmed";

// 🔑 Helius (works on mobile)
const HELIUS_API_KEY = "YOUR_HELIUS_API_KEY";
const HELIUS_RPC = "https://devnet.helius-rpc.com/?api-key=800c9b64-37ba-4cd3-a7e9-807406f383a9";

export const connection = new Connection(RPC_URL, COMMITMENT);

/* ---------------- TYPES ---------------- */

export interface SolBalance {
  lamports: number;
  sol: number;
}

export interface SplTokenInfo {
  mint: string;
  ata: string;
  amount: number;
  decimals: number;
}

export interface SplTokenAccount {
  mint: string;
  amount: number;
  decimals: number;
}

export interface WalletNFT {
  mint: string;
  name?: string;
  uri?: string;
}

/* ---------------- SOL ---------------- */

export async function getSolBalance(
  address: string
): Promise<SolBalance> {
  const pubkey = new PublicKey(address);
  const lamports = await connection.getBalance(pubkey);

  return {
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
  };
}

/* ---------------- SPL TOKEN (Single) ---------------- */

export async function getSplTokenBalance(
  wallet: string,
  mint: string
): Promise<SplTokenInfo | null> {
  try {
    const walletPubkey = new PublicKey(wallet);
    const mintPubkey = new PublicKey(mint);
console.log("walletPubkey, mintPubkey,ata,balance1",walletPubkey, mintPubkey)
    const ata = await getAssociatedTokenAddress(
      mintPubkey,
      walletPubkey
    );
console.log("walletPubkey, mintPubkey,ata,balance2",walletPubkey, mintPubkey,ata)
    const balance = await connection.getTokenAccountBalance(ata);
console.log("walletPubkey, mintPubkey,ata,balance23",walletPubkey, mintPubkey,ata,balance)

    return {
      mint,
      ata: ata.toBase58(),
      amount: balance.value.uiAmount ?? 0,
      decimals: balance.value.decimals,
    };
  } catch {
    return null;
  }
}



export async function getAllSplTokens(
  wallet: string
): Promise<SplTokenAccount[]> {
  const walletPubkey = new PublicKey(wallet);

  const tokenAccounts =
    await connection.getParsedTokenAccountsByOwner(walletPubkey, {
      programId: TOKEN_PROGRAM_ID,
    });

  return tokenAccounts.value.map(acc => {
    const info = acc.account.data.parsed.info;
    return {
      mint: info.mint,
      amount: info.tokenAmount.uiAmount ?? 0,
      decimals: info.tokenAmount.decimals,
    };
  });
}



export async function getWalletNFTs(
  wallet: string
): Promise<WalletNFT[]> {
  const res = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "nfts",
      method: "getAssetsByOwner",
      params: {
        ownerAddress: wallet,
        page: 1,
        limit: 100,
      },
    }),
  });

  const json = await res.json();

  if (!json?.result?.items) return [];

  return json.result.items.map((nft: any) => ({
    mint: nft.id,
    name: nft.content?.metadata?.name,
    uri: nft.content?.json_uri,
  }));
}

/* ---------------- SEND SPL TOKEN ---------------- */

export async function sendSplToken(
  params: {
    mint: string;
    fromKeypair: Keypair;
    toAddress: string;
    amount: number;
    decimals: number;
  }
): Promise<{ signature: string }> {
  const { mint, fromKeypair, toAddress, amount, decimals } = params;

  const fromPubkey = fromKeypair.publicKey;
  const toPubkey = new PublicKey(toAddress);
  const mintPubkey = new PublicKey(mint);

  const senderAta = await getAssociatedTokenAddress(
    mintPubkey,
    fromPubkey
  );

  const receiverAta = await getAssociatedTokenAddress(
    mintPubkey,
    toPubkey
  );

  const instructions = [];

  const receiverInfo = await connection.getAccountInfo(receiverAta);
  if (!receiverInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        fromPubkey,
        receiverAta,
        toPubkey,
        mintPubkey
      )
    );
  }

 
  const amountInBaseUnits = BigInt(
    Math.round(amount * Math.pow(10, decimals))
  );

  instructions.push(
    createTransferInstruction(
      senderAta,
      receiverAta,
      fromPubkey,
      amountInBaseUnits
    )
  );

  const tx = new Transaction().add(...instructions);

  const signature = await sendAndConfirmTransaction(
    connection,
    tx,
    [fromKeypair]
  );

  return { signature };
}
