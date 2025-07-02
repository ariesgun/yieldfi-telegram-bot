import { Context } from "telegraf";
import createDebug from "debug";

import { author, name, version } from "../../package.json";
import { getWalletInfo, isCircleWalletCreated, isEOAWalletLinked } from "../lib/util";
import { talkToAI } from "../lib/chat-ai-agent";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const debug = createDebug("bot:help_command");

const help = () => async (ctx: Context) => {
  const bot = ctx.telegram
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  try {
    const circleApiKey = process.env.CIRCLE_API_KEY;
    const circleEntitySecret = process.env.CIRCLE_ENTITY_SECRET;

    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: circleApiKey,
      entitySecret: circleEntitySecret,
    });

    const { walletInfo, walletId } = await getWalletInfo(userId);
    const message = "Hi, Could you tell me some examples of commands I can use?"
    const [response, reply_markup] = await talkToAI(walletInfo.userId, walletInfo.circleWallet, message, circleClient, walletId, walletInfo.eoaWallet, walletInfo.userName, chatId)

    await bot.sendMessage(chatId, response, { parse_mode: 'Markdown', reply_markup });

    if (!isCircleWalletCreated(userId) || !isEOAWalletLinked(userId)) {
      await bot.sendMessage(chatId, `It looks like you have not setup your saving account.\n
  To get started, please run the /onboard command to create your saving wallet and begin using the bot.`)
    }
  } catch (error) {
    await bot.sendMessage(chatId, `❌. Something is wrong. Please try again. ${error.message}`)
  }
};

export { help };
