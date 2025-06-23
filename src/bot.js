// bot.js

// Use dotenv to load environment variables from the .env file
// =======================================================
import 'dotenv/config';

import express from 'express';
import bodyParser from 'body-parser';
import TelegramBot from 'node-telegram-bot-api';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { getDeFiVaultData, getAIVaultRecommendation } from './defi-ai-agent.js'; // Import your AI functions
import { CHAIN_CIRCLE_TO_IDS } from './chain.js';

import { getBalances } from './cctp.js';
import { talkToAI } from './chat-ai-agent.js';
import { supabase } from './supabaseClient.js';
import { getWalletInfo, isCircleWalletCreated, isEOAWalletLinked } from './util.js';

// --- Configuration ---
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const circleApiKey = process.env.CIRCLE_API_KEY;
const circleEntitySecret = process.env.CIRCLE_ENTITY_SECRET;
const port = 3000; // The port your local server will listen on
const backendUrl = process.env.BACKEND_SERVER_URL

// This is the public URL that ngrok will provide.
// You need to start ngrok and update this URL when it changes.
const url = 'https://1954-85-145-227-235.ngrok-free.app'; // IMPORTANT: Fill this in after starting ngrok

if (!telegramToken || !circleApiKey || !circleEntitySecret) {
  console.error('ERROR: Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

// --- Initialize Services ---
// Create a bot instance but without polling. We will use a webhook.
const bot = new TelegramBot(telegramToken);
const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: circleApiKey,
  entitySecret: circleEntitySecret,
});

// Set the webhook.
// The URL should be your public ngrok URL followed by the bot token.
// Using the token in the path is a simple security measure.
bot.setWebHook(`${url}/bot${telegramToken}`);

const app = express();

// We need to parse the body of the POST request from Telegram
app.use(bodyParser.json());

// This is the endpoint that Telegram will call
app.post(`/bot${telegramToken}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200); // Send a 200 OK status back to Telegram
});

// Start the server
app.listen(port, () => {
  console.log(`Express server is listening on http://localhost:${port}`);
  console.log('Bot is now running with webhooks!');
  console.log(`IMPORTANT: Make sure your ngrok public URL is set to: ${url}`);
});

// --- In-Memory Storage (for demonstration) ---
const walletSets = {}; // { telegramUserId: circleWalletSetId }

// --- Bot Command Handlers (Your existing bot logic) ---

bot.setMyCommands([
  { command: "start", description: "Start interacting with the bot and get a welcome message" },
  { command: "help", description: "Show information about the bot and its capabilities" },
  { command: "balances", description: "View your portfolio balances across supported chains" },
])

// /start command: Welcome message
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isCircleWalletCreated(userId) || !isEOAWalletLinked(userId)) {
    bot.sendMessage(chatId, `👋 Welcome!\n
I'm here to help you manage your wallets, check balances, and interact with DeFi protocols easily.\n
To get started, please run the /onboard command to create your wallet and begin using the bot.`)
  } else {

    const { walletInfo, walletId } = await getWalletInfo(userId);
    try {
      const message = "Hi, could you explain to me what you are and your capabilities are?"
      const [response, reply_markup] = await talkToAI(walletInfo.userId, walletInfo.circleWallet, message, circleClient, walletId, walletInfo.eoaWallet, walletInfo.userName, chatId)
      bot.sendMessage(chatId, response, { parse_mode: 'Markdown', reply_markup });
    } catch (error) {
      bot.sendMessage(chatId, `❌. Something is wrong. Please try again. ${error.message}`)
    }
  }

});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = msg.from.username

  try {
    const { walletInfo, walletId } = await getWalletInfo(userId);
    const message = "Hi, Could you explain to me what you are and your capabilities are?"
    const [response, reply_markup] = await talkToAI(walletInfo.userId, walletInfo.circleWallet, message, circleClient, walletId, walletInfo.eoaWallet, walletInfo.userName, chatId)
    bot.sendMessage(chatId, response, { parse_mode: 'Markdown', reply_markup });
    if (!isCircleWalletCreated(userId) || !isEOAWalletLinked(userId)) {
      bot.sendMessage(chatId, `It looks like you have not setup your saving account.\n
To get started, please run the /onboard command to create your saving wallet and begin using the bot.`)
    }
  } catch (error) {
    bot.sendMessage(chatId, `❌. Something is wrong. Please try again. ${error.message}`)
  }
});

bot.onText(/\/balances/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isCircleWalletCreated(userId) || !isEOAWalletLinked(userId)) {
    bot.sendMessage(chatId, `👋 Welcome!\n
I'm here to help you manage your wallets, check balances, and interact with DeFi protocols easily.\n
To get started, please run the /onboard command to create your wallet and begin using the bot.`)
  } else {

    const { walletInfo } = await getWalletInfo(userId);

    try {
      const balances = await getBalances({ address: walletInfo.circleWallet })

      let messages = ""
      for (const [chainName, assets] of Object.entries(balances)) {
        messages += `\n*${chainName}*\n`
        for (const assetBalance of assets) {
          messages += `${assetBalance.asset} : **${assetBalance.balance}**\n`
        }
      }
      console.log("Message ", messages)
      await bot.sendMessage(chatId, `*[Your Portfolio]*\n ${messages}`, { parse_mode: 'Markdown' })

    } catch (err) {
      console.log(err)
      bot.sendMessage(chatId, "❌ I am not able to check your balance. Please contact admin")
    }
  }
});

// Handle any text message that doesn't match a specific command
bot.on('message', async (msg) => {
  // Ignore messages that are commands (start with '/')
  if (msg.text && msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isCircleWalletCreated(userId) || !isEOAWalletLinked(userId)) {
    bot.sendMessage(chatId, `👋 Welcome!\n
I'm here to help you manage your wallets, check balances, and interact with DeFi protocols easily.\n
To get started, please run the /onboard command to create your wallet and begin using the bot.`)
  } else {
    try {
      // You can route this to your AI agent for general queries
      const { walletInfo, walletId } = await getWalletInfo(userId);
      console.log('...', walletId)
      const [response, reply_markup] = await talkToAI(walletInfo.userId, walletInfo.circleWallet, msg.text, circleClient, walletId, walletInfo.eoaWallet, walletInfo.userName, chatId)
      console.log("Response ", response)
      bot.sendMessage(chatId, response, { parse_mode: 'Markdown', reply_markup: reply_markup });
    } catch (error) {
      bot.sendMessage(chatId, `❌ Sorry, something went wrong. Please try again. ${error.message}`);
    }
  }
});

bot.on('callback_query', async (query) => {
  const data = query.data;
  // Handle button press
  const msg = `You pressed: ${data}`
  bot.answerCallbackQuery(query.id, { text: msg });

  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const userName = query.from.username

  try {
    // You can route this to your AI agent for general queries
    const { walletInfo, walletId } = await getWalletInfo(userId);
    const [response, reply_markup] = await talkToAI(walletInfo.userId, walletInfo.circleWallet, msg, circleClient, walletId, walletInfo.eoaWallet, walletInfo.userName, chatId)

    bot.sendMessage(chatId, response, { parse_mode: 'Markdown', reply_markup });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Sorry, something went wrong. Please try again. ${error.message}`);
  }
});

// /createwallet command
bot.onText(/\/onboard/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = msg.from.username

  let { walletInfo } = await getWalletInfo(userId);
  if (walletInfo == null) {
    // Create the wallet
    try {
      const walletSetRes = await circleClient.createWalletSet({ name: `TelegramUser-${userId}` });
      const walletSetId = walletSetRes.data?.walletSet?.id;
      if (!walletSetId) throw new Error('Failed to create wallet set.');
      walletSets[userId] = walletSetId;

      const walletsRes = await circleClient.createWallets(
        {
          walletSetId: walletSetId,
          blockchains: ['BASE-SEPOLIA', 'OP-SEPOLIA', 'ARB-SEPOLIA'],
          count: 1,
          accountType: "SCA",
        });

      await Promise.all(
        walletsRes.data?.wallets?.map(async (wallet) => {
          console.log(wallet)
          const { data, error } = await supabase
            .from('wallets')
            .insert([
              {
                telegram_user_id: userId,
                wallet_id: wallet.id,
                wallet_address: wallet.address,
                chain_id: CHAIN_CIRCLE_TO_IDS[wallet.blockchain],
              },
            ])

          if (error !== null) {
            console.error(error)
            throw new Error(error);
          }
        })
      )

      const newWallet = walletsRes.data?.wallets?.[0];
      if (!newWallet) throw new Error('Failed to create wallet.');

      // Save to DB
      {
        const { data, error } = await supabase
          .from('user_wallets')
          .insert([
            {
              telegram_user_id: userId,
              telegram_user_name: userName,
              chat_id: chatId,
              circle_wallet_address: newWallet.address,
              eoa_wallet_address: '',
              status: 'CREATED',
            },
          ])

        if (error !== null) {
          throw new Error(error);
        }
      }

      getWalletInfo(userId).then((el) => {
        walletInfo = el.walletInfo
      });
    } catch (error) {
      console.error('Wallet creation failed:', error);
      bot.sendMessage(chatId, '❌ Sorry, something went wrong during wallet creation.');
    }
  }

  if (!isEOAWalletLinked(userId)) {
    // Ask the user to link the saving account to the metamask account
    bot.sendMessage(chatId, `✅ Your saving account successfully created!\n\nYour saving account wallet: \`${walletInfo.circleWallet}\`.\nBlockchains: Base(Sepolia), Optimism(Sepolia), and Arbitrum(Sepolia)\n
To link to your Metamask-card account and move your assets to your saving account, please proceed to ${backendUrl}.
      `, { parse_mode: 'Markdown' });

    return;
  }

  await bot.sendMessage(chatId, `🎉 Your account is ready to be used! You can now check balances, interact with DeFi protocols, and manage your wallet.\n
Your saving account wallet: \`${walletInfo.circleWallet}\`.\nBlockchains: Base(Sepolia), Optimism(Sepolia), and Arbitrum(Sepolia)\n`, { parse_mode: "Markdown" });
  return;

});

// --- Add this new command handler at the end of bot.js ---
bot.onText(/\/vaults/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userInput = match[1]; // The text after the command

  // const asset = parts[0].trim().toUpperCase();
  // const chain = parts[1].trim();
  // const supportedAssets = ['USDC'];
  // const supportedChains = ['Optimism', 'Base', 'Arbitrum'];

  // 1. Gather Data
  const vaultData = await getDeFiVaultData();

  if (vaultData.length === 0) {
    bot.sendMessage(chatId, `I couldn't find any suitable lending vaults for ${asset} on ${chain} at the moment. Please try again later or check another chain.`);
    return;
  }

  // 2. Get AI Recommendation
  const [recommendation, jsonData] = await getAIVaultRecommendation(vaultData, 'USDC');
  let inlineKeyboard = [];
  for (const vault of jsonData.recommendations) {
    const vaultResponse = [
      {
        text: `${vault.project} - ${vault.chain} (${vault.apy} APY)`,
        callback_data: `vault_${vault.id}`,
      }
    ];
    inlineKeyboard.push(vaultResponse);
  }
  console.log("Inline Keyboard Data:", inlineKeyboard);

  // 3. Present to User
  bot.sendMessage(chatId, recommendation, {
    parse_mode: 'Markdown', reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  });
});


const SupportedPlatforms = {
  'aave-v3': {
    networks: ['Arbitrum', 'Optimism'],
    pools: ['ETH', 'USDC'],
  },
  'compount-v3': {
    networks: [],
    pools: ['ETH', 'USDC'],
  },
  'harvest-finance': {
    networks: [],
    pools: ['ETH', 'USDC'],
  }
}
