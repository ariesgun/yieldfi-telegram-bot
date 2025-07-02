import { Context } from "telegraf";
import createDebug from "debug";

import { author, name, version } from "../../package.json";
import { getWalletInfo, isCircleWalletCreated, isEOAWalletLinked } from "../lib/util";
import { talkToAI } from "../lib/chat-ai-agent";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { getAIVaultRecommendation, getDeFiVaultData } from "../lib/defi-ai-agent";

const debug = createDebug("bot:vault_command");

const vaults = () => async (ctx: Context) => {

  const bot = ctx.telegram
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  // 1. Gather Data
  const vaultData = await getDeFiVaultData();

  if (vaultData.length === 0) {
    bot.sendMessage(chatId, `I couldn't find any suitable lending vaults at the moment.`);
    return;
  }

  // 2. Get AI Recommendation
  const result = await getAIVaultRecommendation(vaultData, 'USDC');
  const recommendation: string | any = result[0];
  const jsonData: { recommendations: any[] } | any = result[1];
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
  await bot.sendMessage(chatId, recommendation, {
    parse_mode: 'Markdown', reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  });

};

export { vaults };
