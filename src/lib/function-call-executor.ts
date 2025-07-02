import { getBalance, getBalances, getSavingsAndLoans, getYieldRecommendation, performCCTP, performCheckBalanceAAVE, performCheckBalanceCompound, performLendAAVE, performLendCompound, performTransfer, performWithdrawAAVE, performWithdrawCompound } from "./cctp";
import { registerWalletBalanceChecker } from "./util";

const FUNCTION_CALL_TO_FUNCTION_MAP = {
  "getBalance": getBalance,
  "getBalances": getBalances,
  "cctpTransfer": performCCTP,
  "transfer": performTransfer,
  "lendAAVE": performLendAAVE,
  "withdrawAAVE": performWithdrawAAVE,
  "checkBalanceAAVE": performCheckBalanceAAVE,
  "lendCompound": performLendCompound,
  "withdrawCompound": performWithdrawCompound,
  "checkBalanceCompound": performCheckBalanceCompound,
  "getSavingsAndLoans": getSavingsAndLoans,
  "getYieldRecommendation": getYieldRecommendation,
  "registerWalletBalanceChecker": registerWalletBalanceChecker,
}

export async function handleFunctionCalls(functionCalls, circleClient, walletId, walletAddress, username, chatId) {

  let results = []
  for (const functionCall of functionCalls) {
    const result = await FUNCTION_CALL_TO_FUNCTION_MAP[functionCall.name]({
      ...functionCall.args,
      circleClient,
      walletId,
      walletAddress,
      username,
      chatId
    }
    );

    results.push({
      name: functionCall.name,
      args: functionCall.args,
      result: result
    })
  }
  console.log(results);
  return results;
}
