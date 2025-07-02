import { supabase } from "./supabaseClient";

export async function registerWalletBalanceChecker({ username, chatId, eoa_wallet_address, threshold }) {

  const { data, error } = await supabase
    .from('check_balance')
    .upsert([
      {
        telegram_user_name: username,
        telegram_chat_id: chatId,
        wallet_address: eoa_wallet_address,
        minimum_balance: threshold
      },
    ])

  if (error) {
    console.error('Supabase upsert error:', error);
    return error
  }

  return "OK";
}

export async function isEOAWalletLinked(userId) {
  // Check if the user existed
  const { data, error } = await supabase
    .from('user_wallets')
    .select('*')
    .eq("telegram_user_id", userId);

  if (!data || data.length == 0) {
    return false
  }

  return data[0].status.toLowerCase() === "signed"
}

export async function isCircleWalletCreated(userId) {
  const { data, error } = await supabase
    .from('user_wallets')
    .select('*')
    .eq("telegram_user_id", userId);

  if (!data || data.length == 0) {
    return false
  }

  return true
}

const walletIDsByChain = {}
const walletsInfo = {}

export async function getWalletInfo(userId) {
  {
    const { data, error } = await supabase
      .from('user_wallets')
      .select('*')
      .eq("telegram_user_id", userId);

    if (error !== null) {
      throw new Error(error?.message)
    }

    if (!data || data.length == 0) {
      return null
    }

    walletsInfo[data[0].telegram_user_id] = {
      userId: data[0].telegram_user_id,
      userName: data[0].telegram_user_name,
      circleWallet: data[0].circle_wallet_address,
      eoaWallet: data[0].eoa_wallet_address,
    }
  }

  // Populate wallet-id
  {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq("telegram_user_id", userId);

    if (error !== null) {
      throw new Error(error?.message)
    }

    if (!data || data.length == 0) {
      return null
    }

    walletIDsByChain[userId] = {}

    data.map((row) => {
      walletIDsByChain[userId][Number(row.chain_id)] = row.wallet_id;
    })

    console.log(walletIDsByChain[userId])
    console.log(walletsInfo[userId])
  }

  return {
    walletInfo: walletsInfo[userId],
    walletId: walletIDsByChain[userId]
  }

}