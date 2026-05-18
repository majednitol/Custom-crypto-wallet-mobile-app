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
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";


/* ---------------- CONFIG ---------------- */

export let heliusRpc = "https://devnet.helius-rpc.com/?api-key=800c9b64-37ba-4cd3-a7e9-807406f383a9";

export let connection = new Connection(heliusRpc, "confirmed");

export function setSolTokenNetwork(network: "mainnet" | "devnet") {
  const newRpc = network === "mainnet"
    ? "https://mainnet.helius-rpc.com/?api-key=4ea6a1a7-e963-4e68-8b02-5e072f7e77a8"
    : "https://devnet.helius-rpc.com/?api-key=800c9b64-37ba-4cd3-a7e9-807406f383a9";
  
  if (heliusRpc !== newRpc) {
    heliusRpc = newRpc;
    connection = new Connection(newRpc, "confirmed");
  }
}

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

    // Try Token Program first
    let ata = await getAssociatedTokenAddress(
      mintPubkey,
      walletPubkey,
      false,
      TOKEN_PROGRAM_ID
    );

    try {
      const balance = await connection.getTokenAccountBalance(ata);
      return {
        mint,
        ata: ata.toBase58(),
        amount: balance.value.uiAmount ?? 0,
        decimals: balance.value.decimals,
      };
    } catch {
      // Try Token 2022 Program
      ata = await getAssociatedTokenAddress(
        mintPubkey,
        walletPubkey,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      const balance = await connection.getTokenAccountBalance(ata);
      return {
        mint,
        ata: ata.toBase58(),
        amount: balance.value.uiAmount ?? 0,
        decimals: balance.value.decimals,
      };
    }
  } catch {
    return null;
  }
}

/* ---------------- SPL TOKEN TRANSFER FEE ---------------- */

export async function calculateSplTokenTransactionFee(params: {
  mint: string;
  fromPubkey: PublicKey;
  toAddress: string;
  amount: number;
  decimals: number;
}): Promise<{
  lamports: number;
  sol: number;
}> {
  const { mint, fromPubkey, toAddress, amount, decimals } = params;

  const mintPubkey = new PublicKey(mint);
  const toPubkey = new PublicKey(toAddress);

  // Detect token program
  const mintAccountInfo = await connection.getAccountInfo(mintPubkey);
  const programId = mintAccountInfo?.owner || TOKEN_PROGRAM_ID;

  const senderAta = await getAssociatedTokenAddress(
    mintPubkey,
    fromPubkey,
    false,
    programId
  );

  const receiverAta = await getAssociatedTokenAddress(
    mintPubkey,
    toPubkey,
    false,
    programId
  );

  const instructions = [];

  const receiverInfo = await connection.getAccountInfo(receiverAta);
  if (!receiverInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        fromPubkey,
        receiverAta,
        toPubkey,
        mintPubkey,
        programId
      )
    );
  }

  const amountInBaseUnits = BigInt(
    Math.round(amount * Math.pow(10, decimals))
  );

  instructions.push(
    createTransferCheckedInstruction(
      senderAta,
      mintPubkey,
      receiverAta,
      fromPubkey,
      amountInBaseUnits,
      decimals,
      [],
      programId
    )
  );

  const tx = new Transaction().add(...instructions);
  tx.feePayer = fromPubkey;

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const fee = await connection.getFeeForMessage(
    tx.compileMessage()
  );

  const lamports = fee.value ?? 0;

  return {
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
  };
}

/* ---------------- SPL TOKENS (ALL) ---------------- */

export async function getAllSplTokens(
  wallet: string
): Promise<SplTokenAccount[]> {
  const walletPubkey = new PublicKey(wallet);

  const [tokenAccounts, token2022Accounts] = await Promise.all([
    connection.getParsedTokenAccountsByOwner(walletPubkey, {
      programId: TOKEN_PROGRAM_ID,
    }),
    connection.getParsedTokenAccountsByOwner(walletPubkey, {
      programId: TOKEN_2022_PROGRAM_ID,
    }),
  ]);

  const allAccounts = [...tokenAccounts.value, ...token2022Accounts.value];

  return allAccounts.map(acc => {
    const info = acc.account.data.parsed.info;
    return {
      mint: info.mint,
      amount: info.tokenAmount.uiAmount ?? 0,
      decimals: info.tokenAmount.decimals,
    };
  });
}

/* ---------------- NFTs (Helius DAS) ---------------- */

export async function getWalletNFTs(
  wallet: string
): Promise<WalletNFT[]> {
  const res = await fetch(heliusRpc, {
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

  // Detect token program
  const mintAccountInfo = await connection.getAccountInfo(mintPubkey);
  const programId = mintAccountInfo?.owner || TOKEN_PROGRAM_ID;

  const senderAta = await getAssociatedTokenAddress(
    mintPubkey,
    fromPubkey,
    false,
    programId
  );

  const receiverAta = await getAssociatedTokenAddress(
    mintPubkey,
    toPubkey,
    false,
    programId
  );

  const instructions = [];

  const receiverInfo = await connection.getAccountInfo(receiverAta);
  if (!receiverInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        fromPubkey,
        receiverAta,
        toPubkey,
        mintPubkey,
        programId
      )
    );
  }

  const amountInBaseUnits = BigInt(
    Math.round(amount * Math.pow(10, decimals))
  );

  instructions.push(
    createTransferCheckedInstruction(
      senderAta,
      mintPubkey,
      receiverAta,
      fromPubkey,
      amountInBaseUnits,
      decimals,
      [],
      programId
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
