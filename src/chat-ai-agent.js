import { GoogleGenerativeAI } from "@google/generative-ai";
import { handleFunctionCalls } from "./function-call-executor.js";

// --- Add your initializations for Telegram, Circle, etc. ---
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error('ERROR: Missing GEMINI_API_KEY. Please check your .env file.');
  process.exit(1);
}

// --- Initialize Gemini AI Client ---
const genAI = new GoogleGenerativeAI(geminiApiKey);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { maxOutputTokens: 5000000 } });

const chatHistories = {}
const WINDOWS_CONTEXT_LENGTH = 6;

export async function _askAI(userId, userWallet, userPrompt, eoaWallet) {

  const functions = [
    {
      name: "getBalance",
      description: "Get the token balance of a wallet address. This function call does not need confirmation from the user.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "The wallet address." },
          assetName: { type: "string", description: "Token name", },
          chain: { type: "string", description: "Chain name" },
        },
        required: ["address", "assetName", "chain"]
      }
    },
    {
      name: "getBalances",
      description: "Show all balances of a wallet. This function call does not need confirmation from the user.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "The wallet address." },
        },
        required: ["address"]
      }
    },
    {
      name: "getSavingsAndLoans",
      description: "Show all wallet balances on AAVE both deposits and loans. This function call does not need confirmation from the user.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "The wallet address." },
        },
        required: ["address"]
      }
    },
    {
      name: "transfer",
      description: "Transfer token from one address to another. This function call needs confirmation from the users.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient address" },
          token: { type: "string", description: "Token name" },
          amount: { type: "string", description: "Amount of USDC to transfer" },
          network: { type: "string", description: "Chain name" },
        },
        required: ["to", "token", "amount"]
      }
    },
    {
      name: "cctpTransfer",
      description: "Transfer USDC from one blockchain to another blockchain. This function call needs confirmation from the user.",
      parameters: {
        type: "object",
        properties: {
          walletAddress: { type: "string", description: "Source of fund address" },
          sourceNetwork: { type: "string", description: "Source network" },
          destinationNetwork: { type: "string", description: "Destination Network" },
          destinationAddress: { type: "string", description: "Recipient Address" },
          amount: { type: "string", description: "Amount of USDC to transfer" }
        },
        required: ["walletAddress", "sourceNetwork", "destinationAddress", "destinationNetwork", "amount"]
      }
    },
    {
      name: "lendAAVE",
      description: "Lend asset on AAVE platform. This function call requires confirmation from the user.",
      parameters: {
        type: "object",
        properties: {
          network: { type: "string", description: "network" },
          asset: { type: "string", description: "Token Asset" },
          amount: { type: "string", description: "Amount of asset to supply" }
        },
        required: ["network", "asset", "amount"]
      }
    },
    {
      name: "lendCompound",
      description: "Lend asset on Compound platform. This function call requires confirmation from the user.",
      parameters: {
        type: "object",
        properties: {
          network: { type: "string", description: "network" },
          asset: { type: "string", description: "Token Asset" },
          amount: { type: "string", description: "Amount of asset to supply" }
        },
        required: ["network", "asset", "amount"]
      }
    },
    {
      name: "withdrawAAVE",
      description: "Withdraw asset lent on AAVE platform. This function call requires confirmation from the user.",
      parameters: {
        type: "object",
        properties: {
          network: { type: "string", description: "network" },
          asset: { type: "string", description: "Token Asset" },
          amount: { type: "string", description: "Amount of token to withdraw" }
        },
        required: ["network", "asset", "amount"]
      }
    },
    {
      name: "checkBalanceAAVE",
      description: "Check asset balances lent and borrowed on AAVE.This does not require confirmation.",
      parameters: {
        type: "object",
        properties: {
          network: { type: "string", description: "network" },
        },
        required: ["network"]
      }
    },
    {
      name: "getYieldRecommendation",
      description: "Retrieve vaults yield using Defilama API.",
      parameters: {
        type: "object",
        properties: {
          asset: { type: "string", description: "Optional asset name" },
          chain: { type: "string", description: "Optional chain name" }
        },
      }
    },
    {
      name: "registerWalletBalanceChecker",
      description: "Register the wallet to the cron service which checks the wallet balance regularly and notifies wallet owner if the balance is below threshold. This does not require confirmation.",
      parameters: {
        type: "object",
        properties: {
          eoa_wallet_address: { type: "string", description: "Metamask-card linked EOA wallet" },
          threshold: { type: "string", description: "Minimum value of the wallet USDC balance" }
        },
        required: ["eoa_wallet_address", "threshold"]
      }
    }
  ];

  const systemPrompt = `
    You are an expert AI agent that helps users interact with blockchain DeFi on Telegram.
    Your main responsibility is to manage user's saving account wallet. It includes lending user's tokens to platforms like AAVE, compound, etc.
    The saving account wallet (which is a Circle wallet) is linked to a Metamask-card-linked EOA account wallet on Linea.
    Your responsibilities also include asssisting users with decentralized finance operations across multiple blockchains (e.g., Ethereum, Optimism, Arbitrum, and Base).
    You can understand user requests and determine the appropriate functions to fulfill them. 

    Capabilities:
    - Check token balances (e.g., ETH, USDC) of user's saving account wallet.
    - Check assets and loans on Defi protocols, such as AAVE, Compound, etc.
    - Provide information about DeFi protocols, vaults, and user positions.
    - Assist with token transfers, swaps, and DeFi interactions.
    - Moving or bridging assets across chains means moving assets between user saving wallets across different chains, unless specified explicitly.
    - Inform the users the execution results.

    Instructions:
    - Always clarify which blockchain and token the user is referring to if not specified.
    - Ask for the user's wallet address or other required details when necessary.    
    - When showing user's balances, always display 5 decimal places.
    - If a request is ambiguous, ask follow-up questions to clarify.
    - When appropriate, suggest the next logical action for the user.
    - Determine which available functions are needed to fulfill user's requests.
    - Determine whether the functions can be executed by checking the balances. If the user does not have sufficient token balances, you need to inform the user.
    - If a function call is required, do not execute it immediately. Instead, first confirm with the user, present the list of operations to be executed in a clear, Telegram-friendly Markdown list format (use '-' instead of '*') for user confirmation.
    - Only after the user confirms, respond with the list of function calls and their required parameters to be executed.
    - If the user cancels or does not confirm the operation, then starts over again. Re-confirm for the new requests.
    - Ensure all responses are clear, concise, and formatted for Telegram.
    - Upon receiving the result of function calls, inspect the result and inform the user with summary and the result.
    - Your output format should be a raw json object with the format shown below. reply_markup is filled in when you are asking for user's confirmation, otherwise empty {}.
  
    {
      text: <text>,
      reply_markup: {
        inline_keyboard: [
          [
            {text: 'Sign', callback_data: 'confirm'},
            {text: 'Cancel', callback_data: 'cancel'}
          ],
        ]
      }
    }

    - When providing a JSON output, do NOT wrap it in code fences or use \`\`\`json. Output only the raw JSON object.
    
    Notes: 
    - Note that to send an asset from one chain to another chain, you need to execute cctpTransfer.
    - User saving wallet address is ${userWallet}.
    - User Metamask-linked (EOA) wallet address is ${eoaWallet}. When the user wants to withdraw the funds to this wallet, it is always bridged to Linea Sepolia network.
    - Use '-' instead of '*' for list.
    - When the users want to know their balances, also show their Defi positions as well if they have ones. Show them separately from the wallet balances.
    - If the users do not have any position on a chain, don't show it.
    - If the balance of a token is 0, don't show it.
    - Always highlight chain name in BOLD (use '*' instead of '**')

    Example requests you can handle:
    - "What is my USDC balance on Optimism?"
    - "Show my ETH balance."
    - "Help me transfer 10 USDC to another address."
    - "I would like to save my USDC on AAVE on Base."
  `;

  try {
    if (!chatHistories[userId]) {
      chatHistories[userId] = [];
    }

    let contents = chatHistories[userId]
    console.log("User prompt", userPrompt)
    contents.push(userPrompt)

    const result = await geminiModel.generateContent({
      contents: [
        { role: 'model', parts: [{ text: systemPrompt }] },
        contents
      ],
      tools: [
        { functionDeclarations: functions }
      ]
    });
    const response = await result.response;
    return response;

  } catch (error) {
    console.error("Error talking to AI:", error.message);
    throw error;
  }
}

export async function talkToAI(userId, userWallet, userPrompt, circleClient, walletId, eoaWallet, username, chatId) {

  let prompt = { role: 'user', parts: [{ text: userPrompt }] }
  let response;
  do {
    console.log("askAI")
    response = await _askAI(userId, userWallet, prompt, eoaWallet);

    console.log(response.usageMetadata)

    if (!response.text() && !response.functionCalls()) {
      console.log("Empty response. Try again");
      continue;
    }

    if (response.text()) {
      chatHistories[userId].push({
        role: 'model', parts: [{ text: response.text() }]
      });

      if (chatHistories[userId].length > WINDOWS_CONTEXT_LENGTH) {
        chatHistories[userId].splice(0, chatHistories.length - WINDOWS_CONTEXT_LENGTH);
      }
    }

    if (response.functionCalls() && response.functionCalls().length > 0) {
      console.log(response.functionCalls());
      const result = await handleFunctionCalls(response.functionCalls(), circleClient, walletId, userWallet, username, chatId)

      prompt = { role: 'user', parts: [{ text: `The function call result: ${JSON.stringify(result)}` }] }
      console.log("Result", prompt)
    }

  } while (!response.text() || (response.functionCalls() && response.functionCalls().length > 0));

  try {
    const cleaned = response.text().replace(/```[\w]*\n?|```/g, '');
    console.log("JSON", cleaned);
    const json_obj = JSON.parse(cleaned)
    const text = json_obj.text;
    const reply_markup = json_obj.reply_markup

    return [text, reply_markup];
  } catch (error) {
    return [response.text(), {}]
  }
}