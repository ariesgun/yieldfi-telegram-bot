import { Context } from "telegraf";
import moment = require("moment");
import { getWalletInfo } from "../lib/util";
import { talkToAI } from "../lib/chat-ai-agent";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const callback_handler = () => async (ctx: Context) => {

  console.log("Callback query", ctx);

  const callback_query = ctx.update["callback_query"];
  console.log(callback_query);

  const data = callback_query.data;
  const bot = ctx.telegram

  // Handle button press
  const msg = `You pressed: ${data}`

  const chatId = callback_query.message.chat.id;
  const userId = callback_query.from.id;

  try {
    // Create the wallet
    const circleApiKey = process.env.CIRCLE_API_KEY;
    const circleEntitySecret = process.env.CIRCLE_ENTITY_SECRET;

    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: circleApiKey,
      entitySecret: circleEntitySecret,
    });

    // You can route this to your AI agent for general queries
    const { walletInfo, walletId } = await getWalletInfo(userId);
    const [response, reply_markup] = await talkToAI(walletInfo.userId, walletInfo.circleWallet, msg, circleClient, walletId, walletInfo.eoaWallet, walletInfo.userName, chatId)

    await bot.sendMessage(chatId, response, { parse_mode: 'Markdown', reply_markup });
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Sorry, something went wrong. Please try again. ${error.message}`);
  }
};

export { callback_handler };
