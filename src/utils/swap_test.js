
const { ethers } = require("ethers");


const RPC_URL = "https://eth-mainnet.g.alchemy.com/v2/iQ_8RwrWNQWD7MLe5YNZJ";


const PRIVATE_KEY = "0x51df6cdea5527c694ddd87b0e4cc473ab8ab4528491c91a0f27f91ba9b21ab7a";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Uniswap contracts
const QUOTER_V2 = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e";
const SWAP_ROUTER = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";

// ================= ABIs =================
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const QUOTER_ABI = [
  "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) view returns (uint256 amountOut,uint160,uint32,uint256)"
];

const SWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)"
];


async function approveToken(token, amount) {
  const contract = new ethers.Contract(token, ERC20_ABI, wallet);
  const tx = await contract.approve(SWAP_ROUTER, amount);
  await tx.wait();
}


async function fetchPrice(tokenIn, tokenOut, humanAmount, fee = 3000) {
  const inContract = new ethers.Contract(tokenIn, ERC20_ABI, provider);
  const outContract = new ethers.Contract(tokenOut, ERC20_ABI, provider);

  const [inDecimals, inSymbol, outDecimals, outSymbol] =
    await Promise.all([
      inContract.decimals(),
      inContract.symbol(),
      outContract.decimals(),
      outContract.symbol(),
    ]);

  const amountIn = ethers.parseUnits(humanAmount, Number(inDecimals));

  const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, provider);

  const quote = await quoter.quoteExactInputSingle({
    tokenIn,
    tokenOut,
    amountIn,
    fee,
    sqrtPriceLimitX96: 0,
  });

  const amountOut = quote.amountOut;

  console.log(`Input : ${humanAmount} ${inSymbol}`);
  console.log(
    `Output: ${ethers.formatUnits(amountOut, Number(outDecimals))} ${outSymbol}`
  );

  return amountOut;
}


async function swapExactInput({
  tokenIn,
  tokenOut,
  humanAmount,
  fee = 3000,
  slippage = 0.5,
}) {
  const inContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
  const outContract = new ethers.Contract(tokenOut, ERC20_ABI, wallet);

  const [inDecimals, outDecimals] = await Promise.all([
    inContract.decimals(),
    outContract.decimals(),
  ]);

  const amountIn = ethers.parseUnits(humanAmount, Number(inDecimals));

  // ---- Quote first ----
  const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, provider);
  const quote = await quoter.quoteExactInputSingle({
    tokenIn,
    tokenOut,
    amountIn,
    fee,
    sqrtPriceLimitX96: 0,
  });

  const quotedOut = quote.amountOut;

  // Slippage protection
  const minOut =
    quotedOut -
    (quotedOut * BigInt(Math.floor(slippage * 100))) / 10000n;

  //Approve tokenIn
  await approveToken(tokenIn, amountIn);

  // Execute swap
  const router = new ethers.Contract(SWAP_ROUTER, SWAP_ROUTER_ABI, wallet);

  const tx = await router.exactInputSingle(
    {
      tokenIn,
      tokenOut,
      fee,
      recipient: await wallet.getAddress(),
      amountIn,
      amountOutMinimum: minOut,
      sqrtPriceLimitX96: 0,
    }
  );

  console.log("Swap sent:", tx.hash);
  await tx.wait();

  console.log(
    "Received:",
    ethers.formatUnits(quotedOut, Number(outDecimals))
  );
}


(async () => {
  // Tokens
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const SCAI  = "0xdAC17F958D2ee523a2206206994597C13D831ec7";


  await fetchPrice(USDC, SCAI, "1");


  
//   await swapExactInput({
//     tokenIn: USDC,
//     tokenOut: SCAI,
//     humanAmount: "0.01",
//     fee: 3000,
//     slippage: 0.5,
//   });
  
})();
