import { Context } from "telegraf";
import { getWalletInfo, isCircleWalletCreated, isEOAWalletLinked } from "../lib/util";
import { talkToAI } from "../lib/chat-ai-agent";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const text_handler = () => async (ctx: Context) => {
  console.log("text_handler", ctx.message);

  const bot = ctx.telegram
  const chatId = ctx.chat.id
  const userId = ctx.from.id
  const msg = ('text' in ctx.message) ? ctx.message.text : '';

  if (msg && msg.startsWith('/')) return;

  if (!isCircleWalletCreated(userId) || !isEOAWalletLinked(userId)) {
    bot.sendMessage(chatId, `👋 Welcome!\n
I'm here to help you manage your wallets, check balances, and interact with DeFi protocols easily.\n
To get started, please run the /onboard command to create your wallet and begin using the bot.`)
  } else {
    try {
      const circleApiKey = process.env.CIRCLE_API_KEY;
      const circleEntitySecret = process.env.CIRCLE_ENTITY_SECRET;

      const circleClient = initiateDeveloperControlledWalletsClient({
        apiKey: circleApiKey,
        entitySecret: circleEntitySecret,
      });

      // You can route this to your AI agent for general queries
      const { walletInfo, walletId } = await getWalletInfo(userId);
      console.log('...', walletId)
      const [response, reply_markup] = await talkToAI(walletInfo.userId, walletInfo.circleWallet, msg, circleClient, walletId, walletInfo.eoaWallet, walletInfo.userName, chatId)
      console.log("Response ", response)
      bot.sendMessage(chatId, response, { parse_mode: 'Markdown', reply_markup: reply_markup });
    } catch (error) {
      bot.sendMessage(chatId, `❌ Sorry, something went wrong. Please try again. ${error.message}`);
    }
  }

};

export { text_handler };
