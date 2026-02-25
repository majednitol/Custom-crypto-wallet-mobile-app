import { ethers } from "ethers";

/**
 * Estimate ERC-20 transfer gas cost
 */
async function calculateGasAndAmountsForERC20Transfer({
  rpcUrl,
  privateKey,
  tokenAddress,
  toAddress,
  amount,
}) {
  try {
    // ---------- Provider & Signer ----------
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    // ---------- Validation ----------
    if (!ethers.isAddress(tokenAddress)) {
      throw new Error("Invalid ERC-20 contract address");
    }
    if (!ethers.isAddress(toAddress)) {
      throw new Error("Invalid recipient address");
    }

    // ---------- ERC-20 ABI ----------
    const erc20Abi = [
      "function transfer(address to, uint256 value) returns (bool)",
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
    ];

    const contract = new ethers.Contract(tokenAddress, erc20Abi, signer);

    // ---------- Token math ----------
    const decimals = await contract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    const tokenBalance = await contract.balanceOf(signer.address);
    if (tokenBalance < amountWei) {
      throw new Error("Insufficient token balance");
    }

    // ---------- Gas estimation ----------
    const gasEstimate = await contract.transfer.estimateGas(
      toAddress,
      amountWei
    );

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;
console.log(gasPrice)
    const gasCostWei = gasEstimate * gasPrice;
    const gasCostEth = ethers.formatEther(gasCostWei);

    return {
      from: signer.address,
      gasLimit: gasEstimate.toString(),
      gasPriceGwei: ethers.formatUnits(gasPrice, "gwei"),
      gasCostEth,
    };
  } catch (err) {
    console.error("❌ ERC-20 gas estimation failed:", err.message);
    return null;
  }
}

/**
 * -------- RUN TEST --------
 */
(async () => {
  const result = await calculateGasAndAmountsForERC20Transfer({
    rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/iQ_8RwrWNQWD7MLe5YNZJ",
    privateKey:
      "d56a8b6b3b47b74df2b4ae8a80faeafc4c56efd16ab106096be835ca86e30f6d",
    tokenAddress: "0xd3aC5710463ccBFA8B7cD8213808e1350530e3F7",
    toAddress: "0x79044a6f2fa623A675f7bE3457943C62eD60AA58",
    amount: "1.5",
  });

  if (result) {
    console.log("✅ ERC-20 Gas Estimation");
    console.log(result);
  }
})();
