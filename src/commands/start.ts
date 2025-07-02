import { Context } from "telegraf";
import createDebug from "debug";

import { author, name, version } from "../../package.json";
import { getWalletInfo, isCircleWalletCreated, isEOAWalletLinked } from "../lib/util";
import { talkToAI } from "../lib/chat-ai-agent";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const debug = createDebug("bot:start_command");

const start = () => async (ctx: Context) => {

  const bot = ctx.telegram
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  if (!isCircleWalletCreated(userId) || !isEOAWalletLinked(userId)) {
    bot.sendMessage(chatId, `👋 Welcome!\n
  I'm here to help you manage your wallets, check balances, and interact with DeFi protocols easily.\n
  To get started, please run the /onboard command to create your wallet and begin using the bot.`)
  } else {
    const circleApiKey = process.env.CIRCLE_API_KEY;
    const circleEntitySecret = process.env.CIRCLE_ENTITY_SECRET;

    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: circleApiKey,
      entitySecret: circleEntitySecret,
    });

    const { walletInfo, walletId } = await getWalletInfo(userId);
    try {
      const message = "Hi, could you explain to me what you are and your capabilities are?"
      const [response, reply_markup] = await talkToAI(walletInfo.userId, walletInfo.circleWallet, message, circleClient, walletId, walletInfo.eoaWallet, walletInfo.userName, chatId)
      await bot.sendMessage(chatId, response, { parse_mode: 'Markdown', reply_markup });
    } catch (error) {
      await bot.sendMessage(chatId, `❌. Something is wrong. Please try again. ${error.message}`)
    }
  }

};

export { start };
