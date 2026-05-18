import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
  TransactionConfirmationStrategy,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import uuid from "react-native-uuid";
import { validateMnemonic, mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { TransactionObject } from "../types";

class SolanaService {
  private connection: Connection;
  constructor(private rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  selectNetwork(network: "mainnet" | "devnet") {
    const rpcUrl = network === "mainnet"
      ? "https://mainnet.helius-rpc.com/?api-key=4ea6a1a7-e963-4e68-8b02-5e072f7e77a8"
      : "https://devnet.helius-rpc.com/?api-key=800c9b64-37ba-4cd3-a7e9-807406f383a9";
    this.rpcUrl = rpcUrl;
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  updateRpcUrl(newRpcUrl: string) {
    this.rpcUrl = newRpcUrl;
    this.connection = new Connection(newRpcUrl, "confirmed");
  }

  restoreWalletFromPhrase(mnemonicPhrase: string): Promise<Keypair> {
    return new Promise((resolve, reject) => {
      try {
        const seed = mnemonicToSeedSync(mnemonicPhrase, "");
        const path = `m/44'/501'/0'/0'`;
        const keypair = Keypair.fromSeed(
          derivePath(path, seed.toString("hex")).key
        );

        resolve(keypair);
      } catch (error:any) {
        reject(new Error("Failed to import solana wallet: " + error.message));
      }
    });
  }

  async createWalletByIndex(phrase: string, index: number = 0) {
    try {
      const seed = mnemonicToSeedSync(phrase, "");
      const path = `m/44'/501'/${index}'/0'`;
      const keypair = Keypair.fromSeed(
        derivePath(path, seed.toString("hex")).key
      );

      return {
        publicKey: keypair.publicKey.toBase58(),
        address: keypair.publicKey.toBase58(),
        derivationPath: path,
      };
    } catch (error) {
      throw new Error(
        "failed to create Solana wallet by index: " + (error as Error).message
      );
    }
  }

  async getBalance(publicKeyString: string) {
    try {
      const publicKey = new PublicKey(publicKeyString);
      const balance = await this.connection.getBalance(publicKey);
      const solBalance = balance / 1e9;
      return solBalance;
    } catch (error) {
      console.error("Error fetching Solana balance:", error);
      throw error;
    }
  }

  async #fetchTransactionsSequentially(signatures: any[]) {
    const transactions = [];

    for (const signature of signatures) {
      try {
        const transaction = await this.connection.getParsedTransaction(
          signature.signature,
          { maxSupportedTransactionVersion: 0 }
        );
        transactions.push(transaction);
      } catch (error:any) {
        if (error.message.includes("429")) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        } else {
          console.error("Failed to fetch transaction:", error);
        }
      }
    }

    return transactions;
  }

  #extractTransactionDetails(
    transactionObject: TransactionObject,
    addressOfInterest: string
  ) {
    const transferInstruction =
      transactionObject.transaction.message.instructions.find(
        (instruction) =>
          instruction.parsed && instruction.parsed.type === "transfer"
      );

    if (!transferInstruction) {
      return;
    }

    const info = transferInstruction.parsed.info;
    let direction = "other";
    if (info.source === addressOfInterest) {
      direction = "sent";
    } else if (info.destination === addressOfInterest) {
      direction = "received";
    }

    const hash = transactionObject.transaction.signatures[0];
    const uniqueId = uuid.v4();
    const from = info.source;
    const to = info.destination;
    const amountSentLamports = info.lamports;
    const value = amountSentLamports / 1000000000;
    const blockTime = transactionObject.blockTime;

    return {
      uniqueId,
      from,
      to,
      hash,
      value,
      direction,
      blockTime,
      asset: "SOL",
      chainId: 101,
    };
  }

  async getTransactionsByWallet(
    walletAddress: string,
    beforeSignature?: string,
    limit: number = 50
  ) {
    const publicKey = new PublicKey(walletAddress);
    let signatures: any;

    try {
      signatures = await this.connection.getSignaturesForAddress(publicKey, {
        before: beforeSignature,
        limit,
      });
    } catch (err) {
      console.error("Error fetching signatures:", err);
    }

    if (signatures) {
      try {
        const rawTransactions = await this.#fetchTransactionsSequentially(
          signatures
        );

        const transactions = rawTransactions
          .map((tx: any) => this.#extractTransactionDetails(tx, walletAddress))
          .sort((a, b) => b.blockTime - a.blockTime);
        return transactions;
      } catch (error) {
        console.error("Failed to process transactions:", error);
        return [];
      }
    }
  }

  async validateAddress(addr: string) {
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(addr);
      return await PublicKey.isOnCurve(publicKey.toBytes());
    } catch (err) {
      return false;
    }
  }

  async calculateTransactionFee(from: string, to: string, amount: number) {
    try {
      if (!from || !to || isNaN(amount) || amount <= 0) {
        return 5000;
      }
      const transaction = new Transaction();
      if (this.rpcUrl.includes("mainnet")) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 150000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500000 })
        );
      }
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(from),
          toPubkey: new PublicKey(to),
          lamports: Math.round(amount * LAMPORTS_PER_SOL),
        })
      );
      console.log("Estimating transaction fee for Solana:", transaction)
      let recentBlockhash = (
        await this.connection.getLatestBlockhash("finalized")
      ).blockhash;
      transaction.recentBlockhash = recentBlockhash;
      transaction.feePayer = new PublicKey(from);

      const response = await this.connection.getFeeForMessage(
        transaction.compileMessage(),
        "confirmed"
      );
      return response.value ?? 5000;
      
    } catch (err) {
      console.warn("Error fetching Solana transaction fee, using fallback 5000 lamports:", err);
      return 5000;
    }
  }

  async sendTransaction(secretKey: Uint8Array, to: string, amount: number) {
    try {
      const keyPair = Keypair.fromSecretKey(secretKey);
      const senderPubkey = keyPair.publicKey;
      const balance = await this.connection.getBalance(senderPubkey);
      const lamportsToSend = Math.round(amount * LAMPORTS_PER_SOL);

      if (balance < lamportsToSend) {
        throw new Error("Insufficient funds for the transaction");
      }

      // Check if sender is a data-bearing account (e.g. Nonce Account)
      const accountInfo = await this.connection.getAccountInfo(senderPubkey);
      const space = accountInfo ? accountInfo.data.length : 0;
      const rentExemptMin = (space + 128) * 6960;
      const isNonceAccount = space === 80
        && accountInfo?.owner.equals(SystemProgram.programId);

      // If it's a Nonce Account and balance <= rentExemptMin, regular transfer
      // will fail because fee deduction puts it below rent. Use NonceWithdraw.
      const useNonceWithdraw = isNonceAccount && balance <= rentExemptMin;

      const transaction = new Transaction();
      if (this.rpcUrl.includes("mainnet")) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 150000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500000 })
        );
      }

      if (useNonceWithdraw) {
        // NonceWithdraw closes the account atomically, bypassing the
        // rent-exemption check that blocks regular transfers.
        transaction.add(
          SystemProgram.nonceWithdraw({
            noncePubkey: senderPubkey,
            authorizedPubkey: senderPubkey,
            toPubkey: new PublicKey(to),
            lamports: lamportsToSend,
          })
        );
      } else {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: senderPubkey,
            toPubkey: new PublicKey(to),
            lamports: lamportsToSend,
          })
        );
      }

      const recentBlockhash = (
        await this.connection.getLatestBlockhash("finalized")
      ).blockhash;
      transaction.recentBlockhash = recentBlockhash;
      transaction.feePayer = senderPubkey;

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keyPair]
      );
      return signature;
    } catch (err) {
      console.error("Error sending Solana transaction:", err);
      throw err;
    }
  }

  async derivePrivateKeysFromPhrase(mnemonicPhrase: string, path: string) {
    if (!mnemonicPhrase) {
      throw new Error("Empty mnemonic phrase ");
    }
    if (!validateMnemonic(mnemonicPhrase)) {
      throw new Error("Invalid mnemonic phrase ");
    }

    try {
      const seed = mnemonicToSeedSync(mnemonicPhrase, "");
      const keypair = Keypair.fromSeed(
        derivePath(path, seed.toString("hex")).key
      );

      return keypair.secretKey;
    } catch (error) {
      throw new Error(
        "Failed to derive wallet from mnemonic: " + (error as Error).message
      );
    }
  }

  async findNextUnusedWalletIndex(
    mnemonicPhrase: string,
    indexOffset: number = 0
  ) {
    if (!mnemonicPhrase) {
      throw new Error("Empty mnemonic phrase ");
    }

    if (!validateMnemonic(mnemonicPhrase)) {
      throw new Error("Invalid mnemonic phrase ");
    }

    const seed = mnemonicToSeedSync(mnemonicPhrase, "");
    let currentIndex = indexOffset;
    while (true) {
      const path = `m/44'/501'/${currentIndex}'/0'`;
      const keypair = Keypair.fromSeed(
        derivePath(path, seed.toString("hex")).key
      );
      const publicKey = keypair.publicKey;
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        {
          limit: 1,
        }
      );

      if (signatures.length === 0) {
        break;
      }
      currentIndex += 1;
    }

    return currentIndex > 0 ? currentIndex + 1 : 0;
  }

  async collectedUsedAddresses(mnemonicPhrase: string, unusedIndex: number) {
    const startingIndex = unusedIndex > 0 ? unusedIndex - 1 : unusedIndex;
    const seed = mnemonicToSeedSync(mnemonicPhrase, "");
    const keyPairsUsed = [];

    for (let i = 0; i <= startingIndex; i++) {
      const path = `m/44'/501'/${i}'/0'`;
      const keypair = Keypair.fromSeed(
        derivePath(path, seed.toString("hex")).key
      );
      const normalizedKeyPair = {
        publicKey: keypair.publicKey.toBase58(),
      };
      const keypairWithDetails = {
        ...normalizedKeyPair,
        derivationPath: path,
      };
      keyPairsUsed.push(keypairWithDetails);
    }

    return keyPairsUsed;
  }

  async importAllActiveAddresses(mnemonicPhrase: string, offsetIndex?: number) {
    if (offsetIndex) {
      const usedAddresses = await this.collectedUsedAddresses(
        mnemonicPhrase,
        offsetIndex
      );
      return usedAddresses;
    } else {
      const unusedAddressIndex = await this.findNextUnusedWalletIndex(
        mnemonicPhrase
      );
      const usedAddresses = await this.collectedUsedAddresses(
        mnemonicPhrase,
        unusedAddressIndex
      );
      return usedAddresses;
    }
  }

  async confirmTransaction(signature: string): Promise<boolean> {
    try {
      // Poll for confirmation instead of using signatureSubscribe (not supported by Alchemy)
      const maxRetries = 30;
      const delayMs = 2000;

      for (let i = 0; i < maxRetries; i++) {
        const status = await this.connection.getSignatureStatus(signature);

        if (status?.value?.err) {
          console.error("Transaction failed:", status.value.err);
          return false;
        }

        if (
          status?.value?.confirmationStatus === "confirmed" ||
          status?.value?.confirmationStatus === "finalized"
        ) {
          return true;
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      console.warn("Transaction confirmation timed out");
      return false;
    } catch (error) {
      console.error("Error confirming Solana transaction:", error);
      return false;
    }
  }

  async getSolanaSendLimits(fromAddress: string, feeLamports: number, totalBalanceLamports: number) {
    try {
      const pubkey = new PublicKey(fromAddress);
      const info = await this.connection.getAccountInfo(pubkey);
      const space = info ? info.data.length : 0;
      const rentExemptMinimum = (space + 128) * 6960;

      // For data-bearing accounts (space > 0): the fee payer must remain
      // rent-exempt after fee deduction, OR be exactly 0.
      // If balance <= rentExemptMinimum, even the base fee (5000 lamports)
      // would put the account below rent but above 0 → "InsufficientFundsForFee".
      // This account is rent-locked: NO transaction can be sent from it.
      const isRentLocked = space > 0 && totalBalanceLamports <= rentExemptMinimum;

      let maxSendable = 0;
      if (isRentLocked) {
        maxSendable = 0;
      } else if (space > 0) {
        // Data account with balance above rent: can send down to rent minimum
        maxSendable = totalBalanceLamports - feeLamports - rentExemptMinimum;
      } else {
        // Normal account (no data): can empty to 0
        maxSendable = totalBalanceLamports - feeLamports;
      }

      return {
        rentExemptMinimum,
        maxSendable: Math.max(maxSendable, 0),
        isRentLocked,
        space,
      };
    } catch (err) {
      console.error("Error fetching Solana send limits:", err);
      return {
        rentExemptMinimum: 890880,
        maxSendable: Math.max(totalBalanceLamports - feeLamports, 0),
        isRentLocked: false,
        space: 0,
      };
    }
  }

}
// https://devnet.helius-rpc.com/?api-key=800c9b64-37ba-4cd3-a7e9-807406f383a9
// const  EXPO_PUBLIC_ALCHEMY_SOL_URL = "https://solana-devnet.g.alchemy.com/v2/"
const  EXPO_PUBLIC_ALCHEMY_SOL_URL = "https://devnet.helius-rpc.com/?api-key="
//  const  EXPO_PUBLIC_ALCHEMY_SOL_API_KEY = "iQ_8RwrWNQWD7MLe5YNZJ"
const  EXPO_PUBLIC_ALCHEMY_SOL_API_KEY = "800c9b64-37ba-4cd3-a7e9-807406f383a9"
const customRpcUrl =
  EXPO_PUBLIC_ALCHEMY_SOL_URL + EXPO_PUBLIC_ALCHEMY_SOL_API_KEY;

const solanaService = new SolanaService(customRpcUrl);
export default solanaService;
