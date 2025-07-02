import { Context } from "telegraf";
import createDebug from "debug";

import { author, name, version } from "../../package.json";
import { getWalletInfo, isCircleWalletCreated, isEOAWalletLinked } from "../lib/util";
import { getBalances } from "../lib/cctp";

const debug = createDebug("bot:balances_command");

const balances = () => async (ctx: Context) => {
  const bot = ctx.telegram
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

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
        if (Array.isArray(assets)) {
          for (const assetBalance of assets) {
            messages += `${assetBalance.asset} : **${assetBalance.balance}**\n`
          }
        } else {
          messages += `No assets found.\n`
        }
      }
      console.log("Message ", messages)
      await bot.sendMessage(chatId, `*[Your Portfolio]*\n ${messages}`, { parse_mode: 'Markdown' })

    } catch (err) {
      console.log(err)
      bot.sendMessage(chatId, "❌ I am not able to check your balance. Please contact admin")
    }
  }
};

export { balances };
