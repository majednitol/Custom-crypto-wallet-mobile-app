
 import { JsonRpcProvider, Wallet, HDNodeWallet, AddressLike, parseEther, formatEther, isAddress, Mnemonic, ethers } from "ethers";
import { CustomNetwork, AddressState } from "../store/types";
import { validateMnemonic } from "bip39";
import uuid from "react-native-uuid";
import { Alchemy, Network } from "alchemy-sdk";
import fetchTransfers, { getAllWalletNfts, INFT, Transfer } from "./helper";
export interface ExtendedHDNodeWallet {
  wallet: HDNodeWallet;
  derivationPath: string;
}
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function transfer(address,uint256) returns (bool)",
  "event Transfer(address indexed from,address indexed to,uint256 value)",
];
export interface Transaction {
  uniqueId: string;
  hash: string;
  from: string;
  to: string;
  value: number;
  blockTime: number;
  asset: string;
  direction: string;
}
interface SendTransactionResponse {
  gasEstimate: string;
  totalCost: string;
  totalCostMinusGas: string;
  gasFee: bigint;
}
export class EVMService {
  private _provider: JsonRpcProvider | null = null;
  network: CustomNetwork;
  isUnreachable: boolean = false;

  constructor(network: CustomNetwork) {
    this.network = network;
  }

  get provider(): JsonRpcProvider {
    if (!this._provider) {
      this._provider = new JsonRpcProvider(this.network.rpcUrl, undefined, {
        staticNetwork: true,
      });
    }
    return this._provider;
  }

  async getBalance(address: AddressLike): Promise<bigint> {
    return this.provider.getBalance(address);
  }

  static validateAddress(address: string) {
    return isAddress(address);
  }
   async findNextUnusedWalletIndex(phrase: string, index: number = 0) {
  let currentIndex = index;
  const mnemonic = Mnemonic.fromPhrase(phrase);

  while (true) {
    const path = `m/44'/60'/0'/0/${currentIndex}`;
    const wallet = HDNodeWallet.fromMnemonic(mnemonic, path);

    // Use this.network.chainId or this.network.name
    const chainIdentifier = this.network.chainId.toString(); // or this.network.name if fetchTransactions expects a string
    const transactions = Alchemy
      ? await this.fetchTransactions(chainIdentifier, wallet.address)
      : { transferHistory: [] };

    if (transactions.transferHistory.length === 0) break;

    currentIndex += 1;
  }

  return currentIndex > 0 ? currentIndex + 1 : 0;
}
   async importAllActiveAddresses(mnemonicPhrase: string, index?: number) {
    const unusedIndex = index ?? (await this.findNextUnusedWalletIndex(mnemonicPhrase));
    return this.collectedUsedAddresses(mnemonicPhrase, unusedIndex);
   }
  
    async collectedUsedAddresses(phrase: string, unusedIndex: number) {
    const mnemonic = Mnemonic.fromPhrase(phrase);
    const startingIndex = unusedIndex > 0 ? unusedIndex - 1 : unusedIndex;
    const addressesUsed: any[] = [];
    for (let i = 0; i <= startingIndex; i++) {
      const path = `m/44'/60'/0'/0/${i}`;
      const wallet = HDNodeWallet.fromMnemonic(mnemonic, path);
      addressesUsed.push({ ...wallet, derivationPath: path });
    }
    return addressesUsed;
  }
  private erc20Contract(contractAddress: string, privateKey?: string) {
    let signer: ethers.Signer | undefined;
    console.log("this.provider",this.provider)
  if (privateKey) signer = new Wallet(privateKey, this.provider);
  return new ethers.Contract(contractAddress, ERC20_ABI, signer ?? this.provider);
}
  async sendTransaction(from : AddressLike, to: AddressLike, privateKey: string, value: number) {
    const wallet = new Wallet(privateKey, this.provider);
    return wallet.sendTransaction({from, to, value: parseEther(value.toString()) });
  }
  async createWalletByIndex(phrase: string, index: number = 0): Promise<any> {
    const path = `m/44'/60'/0'/0/${index}`;
    const wallet = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(phrase), path);
    return { ...wallet, derivationPath: path };
  }


async sendToken(contractAddress: string, privateKey: string, to: string, amount: string) {
  const contract = this.erc20Contract(contractAddress, privateKey);
  const decimals = await contract.decimals();
  const tx = await contract.transfer(to, ethers.parseUnits(amount, decimals));
  await tx.wait();
  return tx.hash;
}async getTransfers(contractAddress: string, wallet: string, fromBlock = 0) {
  const provider = this.provider;
  const contract = this.erc20Contract(contractAddress);

  const logs = await provider.getLogs({
    address: contractAddress,
    fromBlock,
    toBlock: "latest",
    topics: [ethers.id("Transfer(address,address,uint256)")],
  });


  return logs.map((log) => {
    const parsed = contract.interface.parseLog(log);
    const { from, to, value } = parsed.args;

    return {
      uniqueId: uuid.v4().toString(), // for FlatList key
      hash: log.transactionHash,
      from,
      to,
      value: ethers.formatUnits(value, 18), // default 18 decimals
      direction: from.toLowerCase() === wallet.toLowerCase() ? "sent" : "received",
      asset: contractAddress,
      blockTime: Date.now(), // optional, placeholder
    };
  });
}
  async fetchAllNFTs(address: string, chainId: number): Promise<INFT[]> {
  if (!address) throw new Error("Wallet address is required");
  if (isNaN(chainId)) throw new Error("Invalid chainId");

  try {
    const nfts = await getAllWalletNfts(address, chainId);

    return nfts.length ? nfts : [];
  } catch (err: any) {
    console.error(
      `[EVMService] fetchAllNFTs error for ${address} on chain ${chainId}:`,
      err?.message || err
    );
    return [];
  }
}

  async getTokenBalance(chainId: number, token: string, wallet: string) {
    console.log("getTokenBalance called with:", { chainId, token, wallet });
  const metadata = await this.getErc20Metadata(token);
  const balance = await this.getErc20Balance(token, wallet, metadata.decimals);

  return {
    chainId,
    token,
    name: metadata.name,
    symbol: metadata.symbol,
    balance,
  };
}
async getErc20Transfers(contractAddress: string, wallet: string, fromBlock = 0) {
  const provider = this.provider;
  const c = this.erc20Contract(contractAddress);

  const logs = await provider.getLogs({
    address: contractAddress,
    fromBlock,
    toBlock: "latest",
    topics: [ethers.id("Transfer(address,address,uint256)")],
  });

  return logs.map((log) => {
    const parsed = c.interface.parseLog(log);
    const { from, to, value } = parsed.args;

    return {
      txHash: log.transactionHash,
      from,
      to,
      amount: value.toString(),
      direction: from.toLowerCase() === wallet.toLowerCase() ? "OUT" : "IN",
    };
  });
}

  async restoreWalletFromPhrase(mnemonicPhrase: string): Promise<HDNodeWallet> {
    if (!mnemonicPhrase) throw new Error("Mnemonic phrase cannot be empty");
    if (!validateMnemonic(mnemonicPhrase)) throw new Error("Invalid mnemonic phrase");
    return HDNodeWallet.fromPhrase(mnemonicPhrase);
  }
async calculateGasAndAmountsForERC20Transfer(privateKey: string, tokenAddress: string, toAddress: string, amount: string, tokenDecimals = 18) {
    try {
      
      const signer = new ethers.Wallet(privateKey, this.provider);

      const erc20Abi = [
        "function transfer(address to, uint256 value) public returns (bool)",
        "function balanceOf(address owner) view returns (uint256)"
      ];

      const contract = new ethers.Contract(tokenAddress, erc20Abi, signer);

      const amountWei = ethers.parseUnits(amount, tokenDecimals);
      const senderBalance = await contract.balanceOf(signer.address);

      if (senderBalance < amountWei) {
        console.log("❌ Insufficient token balance");
        return;
      }

      // Encode transfer data
      const txData = contract.interface.encodeFunctionData("transfer", [toAddress, amountWei]);

      // Estimate gas
      const gasEstimate = await this.provider.estimateGas({
        to: tokenAddress,
        from: signer.address,
        data: txData
      });

      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCostEth = ethers.formatEther(gasEstimate * gasPrice);

      return {
        gasEstimate: gasEstimate.toString(),
        gasCostEth: gasCostEth.toString()
      };
    } catch (err) {
      console.error("❌ Error during ERC-20 gas calculation:", err);
    }
  }

   
  async fetchNFTs(owner: string) {
  const alchemy = new Alchemy({
    apiKey: "YOUR_KEY",
    network: Network.ETH_MAINNET,
  });

  const res = await alchemy.nft.getNftsForOwner(owner);

  return {
    chainId: this.network.chainId,
    account: owner,
    nfts: res.ownedNfts.map((nft) => {
      const metadata = nft.raw?.metadata;

      return {
        chainId: this.network.chainId,
        contractAddress: nft.contract.address,
        tokenId: nft.tokenId,
        name:
          nft.name ||
          metadata?.name ||
          `#${parseInt(nft.tokenId, 16)}`,
        description:
          nft.description || metadata?.description || "",
        image:
          nft.image?.cachedUrl ||
          nft.image?.pngUrl ||
          nft.image?.originalUrl ||
          metadata?.image ||
          "",
        owner,
      };
    }),
  };
}

   async createWallet(): Promise<HDNodeWallet> {
    return HDNodeWallet.createRandom();
   }
  async getErc20Balance(
  contractAddress: string,
  owner: string,
  decimals: number
  ) {
    // 0xd3aC5710463ccBFA8B7cD8213808e1350530e3F7
  const abi = ["function balanceOf(address) view returns (uint256)"];
    const contract = new ethers.Contract(contractAddress, abi, this.provider);
    
  const balance = await contract.balanceOf(owner);
  return ethers.formatUnits(balance, decimals);
}
  async getErc20Metadata(address: string) {
  const abi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
  ];
  const contract = new ethers.Contract(address, abi, this.provider);
  return {
    chainId: this.network.chainId,
    contractAddress: address,
    name: await contract.name(),
    symbol: await contract.symbol(),
    decimals: await contract.decimals(),
    balance: "0",
  };
  }
  
  
  async fetchTransactions(chain: string, address: string): Promise<{ transferHistory: Transfer[]; pageKey?: string }> {
    try {

      const chainId = Number(chain);
      if (isNaN(chainId)) throw new Error("Invalid chainId");
      const transfers = await fetchTransfers(chainId, address);

      return {
        transferHistory: transfers,
        pageKey: undefined,
      };
    } catch (err: any) {
      console.error(`[EVMService] fetchTransactions error for ${address} on chain ${chain}:`, err.message || err);
      return { transferHistory: [], pageKey: undefined };
    }
  }
  
// async calculateGasAndAmounts(toAddress: string, amount: string): Promise<SendTransactionResponse> {
//     const amountInWei = parseEther(amount);
//     const transaction = { to: toAddress, value: amountInWei };
//     const gasEstimate = await this.provider.estimateGas(transaction);
//     const gasFee = (await this.provider.getFeeData()).maxFeePerGas;
//     const gasPrice = BigInt(gasEstimate) * BigInt(gasFee);
//     const totalCost = amountInWei + gasPrice;
//     const totalCostMinusGas = amountInWei - gasPrice;
//     return {
//       gasEstimate: formatEther(gasPrice),
//       totalCost: formatEther(totalCost),
//       totalCostMinusGas: formatEther(totalCostMinusGas),
//       gasFee,
//     };
  //   }
  
  async calculateGasAndAmounts(toAddress: string, amount: string) {
  // parseEther returns bigint in Ethers v6
  const amountInWei: bigint = parseEther(amount); 
  const transaction = { to: toAddress, value: amountInWei };

  // estimateGas returns bigint
  const gasEstimate: bigint = await this.provider.estimateGas(transaction); 

  // maxFeePerGas returns bigint | null, default to 0n if null
  const feeData = await this.provider.getFeeData();
  const maxFeePerGas: bigint = feeData.maxFeePerGas ?? 0n; 

  // simple bigint arithmetic
  const gasPrice: bigint = gasEstimate * maxFeePerGas;
  const totalCost: bigint = amountInWei + gasPrice;
  const totalCostMinusGas: bigint = amountInWei - gasPrice;

  return {
    gasEstimate: formatEther(gasPrice), // string
    totalCost: formatEther(totalCost), // string
    totalCostMinusGas: formatEther(totalCostMinusGas), // string
    gasFee: maxFeePerGas, // bigint
  };
}
  async confirmTransaction(txHash: string) {
    const receipt = await this.provider.waitForTransaction(txHash);
    return receipt?.status === 1;
  }

  static createWallet() {
    return HDNodeWallet.createRandom();
  }

  static restoreWalletFromMnemonic(mnemonicPhrase: string) {
    if (!validateMnemonic(mnemonicPhrase)) throw new Error("Invalid mnemonic");
    return HDNodeWallet.fromPhrase(mnemonicPhrase);
  }

static deriveWalletByIndex(
  mnemonicPhrase: string,
  index = 0
): ExtendedHDNodeWallet {
  const mnemonic = Mnemonic.fromPhrase(mnemonicPhrase); // wrap string
  const path = `m/44'/60'/0'/0/${index}`;
  const wallet = HDNodeWallet.fromMnemonic(mnemonic, path);
  return { wallet, derivationPath: path };
}

  destroy() {
    // Clean up resources if needed
  }
}

/* ---------------- GLOBAL REGISTRY ---------------- */
export const evmServices: Partial<Record<number, EVMService | null>> = {};

/**
 * Registers or initializes an EVMService for a network
 */
export const registerEvmService = (network: CustomNetwork) => {
  if (!evmServices[network.chainId]) {
    evmServices[network.chainId] = new EVMService(network);
    console.log(`[EVM] Service initialized for ${network.chainName}`);
  }
};



export const getEvmService = (chainId: number): EVMService | null => {
  const service = evmServices[chainId];
  if (!service) {
    console.warn(`EVM service not initialized for chain ${chainId}`);
    return null;
  }
  return service;
};
