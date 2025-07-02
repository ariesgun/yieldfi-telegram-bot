

// Define supported lending projects

import { createPublicClient, createWalletClient, encodeFunctionData, erc20Abi, formatEther, formatUnits, Hex, http } from "viem";
import {
  AAVE_ETH_BALANCES_ADDRESS,
  AAVE_POOL_ADDRESS, AAVE_POOL_ETH_ADDRESS,
  AAVE_USDC_BALANCES_ADDRESS,
  CHAIN_IDS_TO_CIRCLE_WALLET_BLOCKCHAIN,
  CHAIN_IDS_TO_MESSAGE_TRANSMITTER,
  CHAIN_IDS_TO_TOKEN_MESSENGER,
  CHAIN_IDS_TO_USDC_ADDRESSES,
  CHAIN_IDS_TO_WETH_ADDRESSES,
  COMPOUND_ETH_POOL_ADDRESS,
  COMPOUND_USDC_POOL_ADDRESS,
  DESTINATION_DOMAINS,
  SUPPORTED_CHAINS,
  SupportedChainId
} from "./chain";
import { arbitrumSepolia, baseSepolia, lineaSepolia, optimismSepolia, sepolia } from "viem/chains";
import { getAIVaultRecommendation, getDeFiVaultData } from "./defi-ai-agent";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import axios from "axios";

// Define supported tokens

export const CHAIN_IDS_TO_CHAINS = {
  "base": baseSepolia,
  "base sepolia": baseSepolia,
  "optimism": optimismSepolia,
  "optimism sepolia": optimismSepolia,
  // "ethereum": sepolia,
  "arbitrum": arbitrumSepolia,
  "arbitrum sepolia": arbitrumSepolia,
  "linea": lineaSepolia,
  "linea sepolia": lineaSepolia
}

export const SUPPORTED_ASSETS = [
  "ETH",
  "USDC"
]

/**
 * Helper function to perform a contract execution transaction
 * and wait until the transaction is confirmed.
 * 
 */
export async function performContractExecutionTransaction(
  circleClient,
  walletId,
  callData,
  contractAddress,
  amount = "0"
) {
  const txRes = await circleClient.createContractExecutionTransaction({
    walletId: walletId,
    fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    callData: callData,
    contractAddress: contractAddress,
    amount: amount,
  })

  const txId = txRes.data?.id;
  if (!txId) {
    throw new Error("Transaction ID not found in response");
  }

  let txStatus = txRes.data?.state;
  let tx;
  do {
    const statusResponse = await circleClient.getTransaction({ id: txId });
    tx = statusResponse.data?.transaction;
    txStatus = statusResponse.data?.transaction?.state;
    if (txStatus === "FAILED") {
      throw new Error(`Transaction failed with state: ${txStatus}`);
    }
    if (txStatus !== "CONFIRMED") {
      console.log(`Transaction status: ${txStatus}. Waiting for confirmation...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 5 seconds before checking again
    }
  } while (txStatus !== "CONFIRMED" && txStatus !== "FAILED");

  return {
    txId: txId,
    txHash: tx?.txHash || null,
    txStatus,
  }
}

export async function performTransaction(
  circleClient,
  walletId,
  destination,
  chainNetwork,
  amount
) {
  const txRes = await circleClient.createTransaction({
    amount: [amount],
    destinationAddress: destination,
    walletId: walletId[chainNetwork],
    tokenAddress: "",
    blockchain: CHAIN_IDS_TO_CIRCLE_WALLET_BLOCKCHAIN[chainNetwork],
    fee: {
      type: 'level',
      config: {
        feeLevel: 'MEDIUM',
      },
    },
  })

  console.log("HH", txRes.data)

  const txId = txRes.data?.id;
  if (!txId) {
    throw new Error("Transaction ID not found in response");
  }

  let txStatus = txRes.data?.state;
  let tx;
  do {
    const statusResponse = await circleClient.getTransaction({ id: txId });
    tx = statusResponse.data?.transaction;

    console.log("HH", tx)

    txStatus = statusResponse.data?.transaction?.state;
    if (txStatus === "FAILED") {
      throw new Error(`Transaction failed with state: ${txStatus}`);
    }
    if (txStatus !== "CONFIRMED") {
      console.log(`Transaction status: ${txStatus}. Waiting for confirmation...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 5 seconds before checking again
    }
  } while (txStatus !== "CONFIRMED" && txStatus !== "FAILED");

  return {
    txId: txId,
    txHash: tx?.txHash || null,
    txStatus,
  }
}

/**
 * Helper function to perform a CCTP transfer.
 */
export async function performCCTP({
  circleClient,
  walletId,
  walletAddress,
  sourceNetwork,
  destinationAddress,
  destinationNetwork,
  amount
}) {
  const sourceId = CHAIN_IDS_TO_CHAINS[sourceNetwork.toLowerCase()].id;
  const destinationId = CHAIN_IDS_TO_CHAINS[destinationNetwork.toLowerCase()].id;
  const usdcAmount = BigInt(Number(amount) * 10 ** 6);

  try {
    // 0. Approve && DepositForBurn
    const approvedCallData = encodeApproveERC20(CHAIN_IDS_TO_USDC_ADDRESSES[sourceId], CHAIN_IDS_TO_TOKEN_MESSENGER[sourceId], usdcAmount);
    const burnCallData = encodeCCTPDepositForBurn(destinationAddress, destinationId, CHAIN_IDS_TO_USDC_ADDRESSES[sourceId], usdcAmount);

    const abiParameters = [
      [
        CHAIN_IDS_TO_USDC_ADDRESSES[sourceId],
        "0",
        approvedCallData,
      ],
      [
        CHAIN_IDS_TO_TOKEN_MESSENGER[sourceId],
        "0",
        burnCallData
      ]
    ]

    const tx = await performBatchExecutions(circleClient, walletId[sourceId], walletAddress, abiParameters);

    if (tx.txStatus !== "CONFIRMED") {
      throw new Error(`❌ Transaction failed with state: ${tx.txStatus}`);
    }

    // 2. Wait for attestation
    const attestation = await retrieveAttestation(sourceId, tx?.txHash);
    console.log("Attestation:", attestation);

    {
      if (destinationId === lineaSepolia.id) {

        const retrieverAccount = privateKeyToAccount(process.env.MAIN_WALLET_KEY as Hex);

        const walletClient = createWalletClient({
          chain: lineaSepolia,
          transport: http(),
        });

        const mintCallData = encodeCCTPMint(destinationId, attestation);

        const hash = await walletClient.sendTransaction({
          account: retrieverAccount,
          to: CHAIN_IDS_TO_MESSAGE_TRANSMITTER[destinationId],
          data: mintCallData,
          value: 0n,
          kzg: undefined,
          chain: undefined,
        });

        console.log("Hash", hash);


      } else {
        // 3. Mint
        const mintCallData = encodeCCTPMint(destinationId, attestation);
        const tx = await performContractExecutionTransaction(circleClient, walletId[destinationId], mintCallData, CHAIN_IDS_TO_MESSAGE_TRANSMITTER[destinationId]);

        if (tx.txStatus !== "CONFIRMED") {
          throw new Error(`❌ Transaction failed with state: ${tx.txStatus}`);
        }
      }
    }

    return "Successful"

  } catch (error) {
    console.error('Transaction failed:', error);
    return `Failed: ${error.message}`
  }
}

export async function performTransfer({ circleClient, walletId, to, token, amount, network }) {

  const chainNetwork = CHAIN_IDS_TO_CHAINS[network.toLowerCase()].id
  try {
    if (token == "ETH") {
      const tx = await performTransaction(circleClient, walletId, to, chainNetwork, amount);

      if (tx.txStatus !== "CONFIRMED") {
        throw new Error(`❌ Transaction failed with state: ${tx.txStatus}`);
      }

      return "Successful"

    } else {
      // ERC-20
      const bigIntAmount = BigInt(Number(amount) * 10 ** 6);
      const callData = encodeTransferERC20(CHAIN_IDS_TO_USDC_ADDRESSES[chainNetwork], to, bigIntAmount);
      const tx = await performContractExecutionTransaction(circleClient, walletId[chainNetwork], callData, CHAIN_IDS_TO_USDC_ADDRESSES[chainNetwork]);

      if (tx.txStatus !== "CONFIRMED") {
        throw new Error(`❌ Transaction failed with state: ${tx.txStatus}`);
      }

      return "Successful"
    }
  } catch (error) {
    console.error('Transaction failed:', error);
    return `Failed: ${error.message}`
  }
}

export async function performLendAAVE({ circleClient, walletId, walletAddress, network, asset, amount }) {
  try {
    const destinationNetwork = CHAIN_IDS_TO_CHAINS[network.toLowerCase()].id

    if (asset === 'ETH') {
      const ethAmount = BigInt(Number(amount) * 10 ** 18);
      const lendCallData = encodeAAVEDepositETH(destinationNetwork, walletAddress);
      const tx = await performContractExecutionTransaction(circleClient, walletId[destinationNetwork], lendCallData, AAVE_POOL_ETH_ADDRESS[destinationNetwork], amount);

      if (tx.txStatus !== "CONFIRMED") {
        throw new Error(`❌ Transaction failed with state: ${tx.txStatus}`);
      }
    } else {
      const usdcAmount = BigInt(Math.round(Number(amount) * 10 ** 6));
      const approvedCallData = encodeApproveERC20(CHAIN_IDS_TO_USDC_ADDRESSES[destinationNetwork], AAVE_POOL_ADDRESS[destinationNetwork], usdcAmount);
      const lendCallData = encodeAAVELend(destinationNetwork, CHAIN_IDS_TO_USDC_ADDRESSES[destinationNetwork], usdcAmount, walletAddress);

      const abiParameters = [
        [
          CHAIN_IDS_TO_USDC_ADDRESSES[destinationNetwork],
          "0",
          approvedCallData,
        ],
        [
          AAVE_POOL_ADDRESS[destinationNetwork],
          "0",
          lendCallData
        ]
      ]

      const tx = await performBatchExecutions(circleClient, walletId[destinationNetwork], walletAddress, abiParameters);

      if (tx.txStatus !== "CONFIRMED") {
        throw new Error(`❌ Transaction failed with state: ${tx.txStatus}`);
      }
    }

    return "Successful"
  } catch (error) {
    console.error('Transaction failed:', error);
    return `Failed: ${error.message}`
  }
}

export async function performWithdrawAAVE({ circleClient, walletId, walletAddress, network, asset, amount }) {

  try {
    const destinationNetwork = CHAIN_IDS_TO_CHAINS[network.toLowerCase()].id

    if (asset === "ETH") {
      const ethAmount = BigInt(Number(amount) * 10 ** 18);
      const approvedCallData = encodeApproveERC20(AAVE_ETH_BALANCES_ADDRESS[destinationNetwork], AAVE_POOL_ETH_ADDRESS[destinationNetwork], ethAmount);
      const withdrawCallData = encodeAAVEWithdrawETH(destinationNetwork, walletAddress, ethAmount);

      const abiParameters = [
        [
          AAVE_ETH_BALANCES_ADDRESS[destinationNetwork],
          "0",
          approvedCallData,
        ],
        [
          AAVE_POOL_ETH_ADDRESS[destinationNetwork],
          "0",
          withdrawCallData
        ]
      ]

      const tx = await performBatchExecutions(circleClient, walletId[destinationNetwork], walletAddress, abiParameters);

      if (tx.txStatus !== "CONFIRMED") {
        throw new Error(`❌ Transaction failed with state: ${tx.txStatus}`);
      }
    } else {
      // const usdcAmount = (1n << 256n) - 1n;
      const usdcAmount = BigInt(Number(amount) * 10 ** 6);
      const approvedCallData = encodeApproveERC20(CHAIN_IDS_TO_USDC_ADDRESSES[destinationNetwork], AAVE_POOL_ADDRESS[destinationNetwork], usdcAmount);
      const withdrawCallData = encodeAAVEWithdraw(destinationNetwork, CHAIN_IDS_TO_USDC_ADDRESSES[destinationNetwork], usdcAmount, walletAddress);

      const abiParameters = [
        [
          CHAIN_IDS_TO_USDC_ADDRESSES[destinationNetwork],
          "0",
          approvedCallData,
        ],
        [
          AAVE_POOL_ADDRESS[destinationNetwork],
          "0",
          withdrawCallData
        ]
      ]

      const tx = await performBatchExecutions(circleClient, walletId[destinationNetwork], walletAddress, abiParameters);

      if (tx.txStatus !== "CONFIRMED") {
        throw new Error(`❌ Transaction failed with state: ${tx.txStatus}`);
      }
    }

    return "Successful"

  } catch (error) {
    console.error('Transaction failed:', error);
    return `Failed: ${error.message}`
  }
}

export async function performCheckBalanceAAVE({ walletAddress }) {

  const ASSETS = {
    'ETH': AAVE_ETH_BALANCES_ADDRESS,
    'USDC': AAVE_USDC_BALANCES_ADDRESS,
  }

  let balances = {}

  try {
    for (const [name, chain] of Object.entries(CHAIN_IDS_TO_CHAINS)) {
      balances[chain.name] = []

      for (const [assetName, assetPool] of Object.entries(ASSETS)) {
        if (chain.id in assetPool) {
          const balance = await getERC20Balance(chain, walletAddress, assetPool[chain.id]);
          balances[chain.name].push({
            chainName: chain.name,
            protocolName: "AAVE",
            type: 'Savings',
            asset: assetName,
            balance: balance
          });
        }
      }
    }
    return balances

  } catch (error) {
    console.error('Transaction failed:', error);
    return `Failed: ${error.message}`
  }
}

export async function performCheckBalanceCompound({ walletAddress }) {

  const ASSETS = {
    'ETH': COMPOUND_ETH_POOL_ADDRESS,
    'USDC': COMPOUND_USDC_POOL_ADDRESS,
  }

  let balances = {}

  try {
    for (const [name, chain] of Object.entries(CHAIN_IDS_TO_CHAINS)) {
      balances[chain.name] = []

      for (const [assetName, assetPool] of Object.entries(ASSETS)) {
        if (chain.id in assetPool) {
          const balance = await getERC20Balance(chain, walletAddress, assetPool[chain.id]);
          balances[chain.name].push({
            chainName: chain.name,
            protocolName: "AAVE",
            type: 'Savings',
            asset: assetName,
            balance: balance
          });
        }
      }
    }

    return balances

  } catch (error) {
    console.error('Transaction failed:', error);
    return `Failed: ${error.message}`
  }
}

export async function performLendCompound({ circleClient, walletId, walletAddress, network, asset, amount }) {
  try {
    const destinationNetwork = CHAIN_IDS_TO_CHAINS[network.toLowerCase()].id

    if (asset === 'ETH') {
      const ethAmount = BigInt(Number(amount) * 10 ** 18);
      const depositWethCallData = encodeDepositWETH(destinationNetwork);
      const approvedCallData = encodeApproveERC20(CHAIN_IDS_TO_WETH_ADDRESSES[destinationNetwork], COMPOUND_ETH_POOL_ADDRESS[destinationNetwork], ethAmount);
      const supplyWethCallData = encodeCompoundDepositETH(destinationNetwork, ethAmount);

      // const txd = await performContractExecutionTransaction(circleClient, walletId[destinationNetwork], supplyWethCallData, COMPOUND_ETH_POOL_ADDRESS[destinationNetwork]);

      const abiParameters = [
        [
          CHAIN_IDS_TO_WETH_ADDRESSES[destinationNetwork],
          ethAmount.toString(),
          depositWethCallData,
        ],
        [
          CHAIN_IDS_TO_WETH_ADDRESSES[destinationNetwork],
          "0",
          approvedCallData,
        ],
        [
          COMPOUND_ETH_POOL_ADDRESS[destinationNetwork],
          "0",
          supplyWethCallData
        ]
      ]

      const tx = await performBatchExecutions(circleClient, walletId[destinationNetwork], walletAddress, abiParameters);

      if (tx.txStatus !== "CONFIRMED") {
        throw new Error(`❌ Transaction failed with state: ${tx.txStatus}`);
      }

    } else {
      const usdcAmount = BigInt(Number(amount) * 10 ** 6);
      const approvedCallData = encodeApproveERC20(CHAIN_IDS_TO_USDC_ADDRESSES[destinationNetwork], COMPOUND_USDC_POOL_ADDRESS[destinationNetwork], usdcAmount);
      const lendCallData = encodeCompoundLend(destinationNetwork, CHAIN_IDS_TO_USDC_ADDRESSES[destinationNetwork], usdcAmount);

      const abiParameters = [
        [
          CHAIN_IDS_TO_USDC_ADDRESSES[destinationNetwork],
          "0",
          approvedCallData,
        ],
        [
          COMPOUND_USDC_POOL_ADDRESS[destinationNetwork],
          "0",
          lendCallData
        ]
      ]

      const tx = await performBatchExecutions(circleClient, walletId[destinationNetwork], walletAddress, abiParameters);

      if (tx.txStatus !== "CONFIRMED") {
        throw new Error(`❌ Transaction failed with state: ${tx.txStatus}`);
      }
    }

    return "Successful"
  } catch (error) {
    console.error('Transaction failed:', error);
    return `Failed: ${error.message}`
  }
}


export async function performWithdrawCompound({ circleClient, walletId, walletAddress, network, asset, amount }) {

  try {
    const destinationNetwork = CHAIN_IDS_TO_CHAINS[network.toLowerCase()].id

    if (asset === 'ETH') {
      const ethAmount = BigInt(Number(amount) * 10 ** 18);

      const withdrawCompoundCallData = encodeCompoundWithdrawETH(destinationNetwork, ethAmount);
      const withdrawWETHCallData = encodeWithdrawWETH(destinationNetwork, ethAmount);

      const abiParameters = [
        [
          COMPOUND_ETH_POOL_ADDRESS[destinationNetwork],
          "0",
          withdrawCompoundCallData,
        ],
        [
          CHAIN_IDS_TO_WETH_ADDRESSES[destinationNetwork],
          "0",
          withdrawWETHCallData,
        ],
      ]

      const tx = await performBatchExecutions(circleClient, walletId[destinationNetwork], walletAddress, abiParameters);

      if (tx.txStatus !== "CONFIRMED") {
        throw new Error(`❌ Transaction failed with state: ${tx.txStatus}`);
      }

    } else {
      const usdcAmount = BigInt(Number(amount) * 10 ** 6);
      const withdrawCallData = encodeCompoundWithdraw(destinationNetwork, CHAIN_IDS_TO_USDC_ADDRESSES[destinationNetwork], usdcAmount);

      const abiParameters = [
        [
          COMPOUND_USDC_POOL_ADDRESS[destinationNetwork],
          "0",
          withdrawCallData
        ]
      ]

      const tx = await performBatchExecutions(circleClient, walletId[destinationNetwork], walletAddress, abiParameters);

      if (tx.txStatus !== "CONFIRMED") {
        throw new Error(`❌ Transaction failed with state: ${tx.txStatus}`);
      }
    }

    return "Successful"
  } catch (error) {
    console.error('Transaction failed:', error);
    return `Failed: ${error.message}`
  }
}

export async function performBatchExecutions(
  circleClient,
  walletId,
  walletAddress,
  abiParameters,
) {
  const txRes = await circleClient.createContractExecutionTransaction({
    walletId: walletId,
    fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    refId: "Batch execution",
    abiFunctionSignature: "executeBatch((address,uint256,bytes)[])",
    abiParameters: [abiParameters],
    contractAddress: walletAddress,
  })

  const txId = txRes.data?.id;
  if (!txId) {
    throw new Error("Transaction ID not found in response");
  }

  let txStatus = txRes.data?.state;
  let tx;
  do {
    const statusResponse = await circleClient.getTransaction({ id: txId });
    tx = statusResponse.data?.transaction;
    txStatus = statusResponse.data?.transaction?.state;
    if (txStatus === "FAILED") {
      throw new Error(`Transaction failed with state: ${txStatus}`);
    }
    if (txStatus !== "CONFIRMED") {
      console.log(`Transaction status: ${txStatus}. Waiting for confirmation...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 5 seconds before checking again
    }
  } while (txStatus !== "CONFIRMED" && txStatus !== "FAILED");

  return {
    txId: txId,
    txHash: tx?.txHash || null,
    txStatus,
  }
}

/**
 * Helper function to encode a function call for a contract.
 */
export function encodeApproveERC20(assetAddress, spenderAddress, amount) {
  const approveContractConfig = {
    address: assetAddress, // Assuming sourceChainId is 0 for Sepolia
    abi: [
      {
        type: "function",
        name: "approve",
        stateMutability: "nonpayable",
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" }
        ],
        outputs: [],
      },
    ],
  };

  const encodedData = encodeFunctionData({
    ...approveContractConfig,
    functionName: "approve",
    args: [spenderAddress, amount],
  });
  console.log(`Approve Tx: ${encodedData}`);

  return encodedData;
}

export function encodeTransferERC20(assetAddress, destinationAddress, amount) {
  const supplyContractConfig = {
    address: assetAddress,
    abi: [
      {
        type: "function",
        name: "transfer",
        stateMutability: "nonpayable",
        inputs: [
          { name: "destination", type: "address" },
          { name: "amount", type: "uint256" }
        ],
        outputs: [],
      },
    ],
  };

  const encodedData = encodeFunctionData({
    ...supplyContractConfig,
    functionName: "transfer",
    args: [destinationAddress, amount],
  });

  return encodedData;
}

export function encodeCCTPDepositForBurn(destinationAddress, destinationChainId, assetAddress, amount) {
  let supplyHookData = "0x0000000000000000000000000000000000000000000000000000000000000000";

  try {
    const finalityThreshold = 1000;
    const maxFee = amount - 1n;
    //destinationAddress
    const mintRecipient = `0x${destinationAddress
      .replace(/^0x/, "")
      .padStart(64, "0")}`;

    const encodedData = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "depositForBurnWithHook",
          stateMutability: "nonpayable",
          inputs: [
            { name: "amount", type: "uint256" },
            { name: "destinationDomain", type: "uint32" },
            { name: "mintRecipient", type: "bytes32" },
            { name: "burnToken", type: "address" },
            { name: "destinationCaller", type: "bytes32" },
            { name: "maxFee", type: "uint256" },
            { name: "finalityThreshold", type: "uint32" },
            { name: "hookData", type: "bytes" },
          ],
          outputs: [],
        },
      ],
      functionName: "depositForBurnWithHook",
      args: [
        amount,
        DESTINATION_DOMAINS[destinationChainId],
        mintRecipient as Hex,
        assetAddress,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        maxFee,
        finalityThreshold,
        supplyHookData as Hex,
      ],
    });

    console.log(`Burn Tx: ${encodedData}`);
    return encodedData;
  } catch (err) {
    console.error("Burn failed");
    throw err;
  }

}

export function encodeCCTPMint(destinationChainId, attestation) {
  const MAX_RETRIES = 3;
  let retries = 0;
  console.log("Minting USDC...");

  try {
    const contractConfig = {
      address: CHAIN_IDS_TO_MESSAGE_TRANSMITTER[
        destinationChainId
      ],
      abi: [
        {
          type: "function",
          name: "receiveMessage",
          stateMutability: "nonpayable",
          inputs: [
            { name: "message", type: "bytes" },
            { name: "attestation", type: "bytes" },
          ],
          outputs: [],
        },
      ],
    };

    const encodedData = encodeFunctionData({
      ...contractConfig,
      functionName: "receiveMessage",
      args: [attestation.message, attestation.attestation],
    });

    console.log(`Mint Tx: ${encodedData}`);
    return encodedData;

  } catch (err) {
    console.log("Error building mint call data:", err);
  }
}

export function encodeAAVELend(chainId, assetAddress, amount, walletAddress) {

  const supplyContractConfig = {
    address: AAVE_POOL_ADDRESS[
      chainId
    ],
    abi: [
      {
        type: "function",
        name: "supply",
        stateMutability: "nonpayable",
        inputs: [
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "onBehalfOf", type: "address" },
          { name: "referralCode", type: "uint16" },
        ],
        outputs: [],
      },
    ]
  };
  const encodedData = encodeFunctionData({
    ...supplyContractConfig,
    functionName: "supply",
    args: [assetAddress, amount, walletAddress, 0],
  });

  return encodedData;
}

export function encodeCompoundLend(chainId, assetAddress, amount) {

  const supplyContractConfig = {
    address: COMPOUND_USDC_POOL_ADDRESS[
      chainId
    ],
    abi: [
      {
        type: "function",
        name: "supply",
        stateMutability: "nonpayable",
        inputs: [
          { name: "tokenAddress", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [],
      },
    ]
  };
  const encodedData = encodeFunctionData({
    ...supplyContractConfig,
    functionName: "supply",
    args: [assetAddress, amount],
  });

  return encodedData;
}

export function encodeDepositWETH(chainId) {

  const supplyContractConfig = {
    address: CHAIN_IDS_TO_WETH_ADDRESSES[
      chainId
    ],
    abi: [
      {
        type: "function",
        name: "deposit",
        stateMutability: "payable",
        inputs: [],
        outputs: [],
      },
    ]
  };
  const encodedData = encodeFunctionData({
    ...supplyContractConfig,
    functionName: "deposit",
    args: [],
  });

  return encodedData;
}


export function encodeWithdrawWETH(chainId, amount) {

  const supplyContractConfig = {
    address: CHAIN_IDS_TO_WETH_ADDRESSES[
      chainId
    ],
    abi: [
      {
        type: "function",
        name: "withdraw",
        stateMutability: "payable",
        inputs: [
          { name: "wad", type: "uint256" },
        ],
        outputs: [],
      },
    ]
  };
  const encodedData = encodeFunctionData({
    ...supplyContractConfig,
    functionName: "withdraw",
    args: [amount],
  });

  return encodedData;
}

export function encodeCompoundDepositETH(chainId, amount) {

  const supplyContractConfig = {
    address: COMPOUND_ETH_POOL_ADDRESS[
      chainId
    ],
    abi: [
      {
        type: "function",
        name: "supply",
        stateMutability: "nonpayable",
        inputs: [
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [],
      },
    ]
  };
  const encodedData = encodeFunctionData({
    ...supplyContractConfig,
    functionName: "supply",
    args: [CHAIN_IDS_TO_WETH_ADDRESSES[chainId], amount],
  });

  return encodedData;
}
export function encodeCompoundWithdrawETH(chainId, amount) {

  const supplyContractConfig = {
    address: COMPOUND_ETH_POOL_ADDRESS[
      chainId
    ],
    abi: [
      {
        type: "function",
        name: "withdraw",
        stateMutability: "nonpayable",
        inputs: [
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [],
      },
    ]
  };
  const encodedData = encodeFunctionData({
    ...supplyContractConfig,
    functionName: "withdraw",
    args: [CHAIN_IDS_TO_WETH_ADDRESSES[chainId], amount],
  });

  return encodedData;
}

export function encodeAAVEDepositETH(chainId, walletAddress) {

  const supplyContractConfig = {
    address: AAVE_POOL_ETH_ADDRESS[
      chainId
    ],
    abi: [
      {
        type: "function",
        name: "depositETH",
        stateMutability: "nonpayable",
        inputs: [
          { name: "", type: "address" },
          { name: "onBehalfOf", type: "address" },
          { name: "referralCode", type: "uint16" },
        ],
        outputs: [],
      },
    ]
  };
  const encodedData = encodeFunctionData({
    ...supplyContractConfig,
    functionName: "depositETH",
    args: [AAVE_POOL_ADDRESS[chainId], walletAddress, 0],
  });

  return encodedData;
}

export function encodeAAVEWithdraw(chainId, assetAddress, amount, walletAddress) {
  const withdrawContractConfig = {
    address: AAVE_POOL_ADDRESS[
      chainId
    ],
    abi: [
      {
        type: "function",
        name: "withdraw",
        stateMutability: "nonpayable",
        constant: false,
        inputs: [
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "to", type: "address" },
        ],
        outputs: [
          { name: "", type: "uint256" },
        ],
      },
    ]
  };

  const encodedData = encodeFunctionData({
    ...withdrawContractConfig,
    functionName: "withdraw",
    args: [assetAddress, amount, walletAddress],
  });

  return encodedData;
}

export function encodeAAVEWithdrawETH(chainId, walletAddress, amount) {

  const supplyContractConfig = {
    address: AAVE_POOL_ETH_ADDRESS[
      chainId
    ],
    abi: [
      {
        type: "function",
        name: "withdrawETH",
        stateMutability: "nonpayable",
        inputs: [
          { name: "", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "to", type: "address" },
        ],
        outputs: [],
      },
    ]
  };
  const encodedData = encodeFunctionData({
    ...supplyContractConfig,
    functionName: "withdrawETH",
    args: [AAVE_POOL_ADDRESS[chainId], amount, walletAddress],
  });

  return encodedData;
}


export function encodeCompoundWithdraw(chainId, assetAddress, amount) {
  const withdrawContractConfig = {
    address: COMPOUND_USDC_POOL_ADDRESS[
      chainId
    ],
    abi: [
      {
        type: "function",
        name: "withdraw",
        stateMutability: "nonpayable",
        constant: false,
        inputs: [
          { name: "beneficiary", type: "address" },
          { name: "certificateId", type: "uint256" },
        ],
        outputs: [],
      },
    ]
  };

  const encodedData = encodeFunctionData({
    ...withdrawContractConfig,
    functionName: "withdraw",
    args: [assetAddress, amount],
  });

  return encodedData;
}

export function encodeAAVEBorrow() { }

export function encodeSave() {
  // Per specific contract (AAVE, Compound, etc.)
}

/** 
 * Function Tools
 */
export async function getEtherBalance(chainId, address) {
  const publicClient = createPublicClient({
    chain: chainId,
    transport: http(),
  })

  const balance = await publicClient.getBalance({
    address: address
  });

  const formattedBalance = formatEther(balance);
  return Number(formattedBalance);
}

export async function getERC20Balance(chainId, address, assetAddress) {
  const publicClient = createPublicClient({
    chain: chainId,
    transport: http(),
  })
  console.log("Address ", assetAddress)
  const decimals = await publicClient.readContract({
    address: assetAddress,
    abi: erc20Abi,
    functionName: "decimals",
    args: [],
  });

  const balance = await publicClient.readContract({
    address: assetAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });


  const formattedBalance = formatUnits(balance, decimals);
  return Number(formattedBalance)
}

export async function getBalance({ address, chain, assetName }) {
  try {
    const chainId = CHAIN_IDS_TO_CHAINS[chain.toLowerCase()]
    if (assetName === "ETH") {
      return await getEtherBalance(chainId, address)
    } else {
      const assetAddress = CHAIN_IDS_TO_USDC_ADDRESSES[chainId.id]; // TODO
      return await getERC20Balance(chainId, address, assetAddress)
    }
  } catch (error) {
    console.error(error);
  }
}

export async function getBalances({ address }) {
  let balances = {}

  for (const [name, chain] of Object.entries(CHAIN_IDS_TO_CHAINS)) {
    balances[chain.name] = []
    for (const assetName of SUPPORTED_ASSETS) {
      if (assetName === "ETH") {
        const balance = await getEtherBalance(chain, address);
        balances[chain.name].push({
          chainName: chain.name,
          asset: assetName,
          balance: balance
        });
      } else {
        // ERC20
        const balance = await getERC20Balance(chain, address, CHAIN_IDS_TO_USDC_ADDRESSES[chain.id]);
        balances[chain.name].push({
          chainName: chain.name,
          asset: assetName,
          balance: balance
        });
      }
    }
  }

  return balances;
}

export async function getSavingsAndLoans({ address }) {
  let balances = {}

  const ASSETS = {
    'ETH': AAVE_ETH_BALANCES_ADDRESS,
    'USDC': AAVE_USDC_BALANCES_ADDRESS,
  }

  for (const [name, chain] of Object.entries(CHAIN_IDS_TO_CHAINS)) {
    balances[chain.name] = []
    for (const [assetName, assetPool] of Object.entries(ASSETS)) {
      if (chain.id in assetPool) {
        const balance = await getERC20Balance(chain, address, assetPool[chain.id]);
        balances[chain.name].push({
          chainName: chain.name,
          protocolName: "AAVE",
          type: 'Savings',
          asset: assetName,
          balance: balance
        });
      }
    }
  }

  return balances;
}

export async function getSupportedChains() { }

export async function retrieveAttestation(sourceChainId, transactionHash) {
  console.log("Retrieving attestation...", transactionHash);

  const url = `https://iris-api-sandbox.circle.com/v2/messages/${DESTINATION_DOMAINS[sourceChainId]}?transactionHash=${transactionHash}`;

  while (true) {
    try {
      const response = await axios.get(url);
      if (response.data?.messages?.[0]?.status === "complete") {
        console.log("Attestation retrieved!");
        return response.data.messages[0];
      }
      console.log("Waiting for attestation...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error("Error retrieving attestation:", error.message);
      throw error;
    }
  }
};

export async function getYieldRecommendation({ asset, chain }) {

  const vaultData = await getDeFiVaultData();
  const result = await getAIVaultRecommendation(vaultData, asset);

  return [result, typeof result === 'object' && result !== null && 'jsonData' in result ? (result as any).jsonData : undefined]
}
