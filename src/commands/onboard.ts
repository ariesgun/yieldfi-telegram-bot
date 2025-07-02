import { Context } from "telegraf";
import createDebug from "debug";

import { author, name, version } from "../../package.json";
import { getWalletInfo, isCircleWalletCreated, isEOAWalletLinked } from "../lib/util";
import { talkToAI } from "../lib/chat-ai-agent";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { supabase } from "../lib/supabaseClient";
import { CHAIN_CIRCLE_TO_IDS } from "../lib/chain";

const debug = createDebug("bot:onboard_command");

const onboard = () => async (ctx: Context) => {
  const bot = ctx.telegram
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const userName = ctx.from.username;

  let { walletInfo } = await getWalletInfo(userId);
  if (walletInfo == null) {
    // Create the wallet
    const circleApiKey = process.env.CIRCLE_API_KEY;
    const circleEntitySecret = process.env.CIRCLE_ENTITY_SECRET;

    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: circleApiKey,
      entitySecret: circleEntitySecret,
    });

    try {
      const walletSetRes = await circleClient.createWalletSet({ name: `TelegramUser-${userId}` });
      const walletSetId = walletSetRes.data?.walletSet?.id;
      if (!walletSetId) throw new Error('Failed to create wallet set.');

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
            throw new Error(error?.message);
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
          throw new Error(error?.message);
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
  To link to your Metamask-card account and move your assets to your saving account, please proceed to ${process.env.BACKEND_URL}.
        `, { parse_mode: 'Markdown' });

    return;
  }

  await bot.sendMessage(chatId, `🎉 Your account is ready to be used! You can now check balances, interact with DeFi protocols, and manage your wallet.\n
  Your saving account wallet: \`${walletInfo.circleWallet}\`.\nBlockchains: Base(Sepolia), Optimism(Sepolia), and Arbitrum(Sepolia)\n`, { parse_mode: "Markdown" });
  return;

};

export { onboard };
