import { Context, Telegraf } from "telegraf";
// import { session } from "telegraf-session-mongodb";

// import { about, assets, status, swap, history } from "./commands";
import { callback_handler, text_handler } from "./text";
import { VercelRequest, VercelResponse } from "@vercel/node";
import { development, production } from "./core";
import { onboard, start, vaults } from "./commands";
import { help } from "./commands/help";
import { balances } from "./commands/balances";
// import { MongoClient } from "mongodb";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ENVIRONMENT = process.env.NODE_ENV || "";

export interface SessionContext extends Context {
  session: any;
}

const bot = new Telegraf<SessionContext>(TELEGRAM_BOT_TOKEN);

const initialize = async () => {

  bot.telegram.setMyCommands([
  { command: 'start', description: 'Start interacting with the bot' },
  { command: 'help', description: 'Show help information' },
  { command: 'balances', description: 'View your portfolio balances' },
  { command: 'onboard', description: 'Create your saving account wallet' },
  { command: 'vaults', description: 'Show DeFi vault recommendations' }
]);

  bot.command("start", start());
  bot.command("help", help());
  bot.command("balances", balances());
  bot.command("onboard", onboard());
  bot.command("vaults", vaults());

  bot.on("callback_query", callback_handler());
  bot.on("message", text_handler());

  return bot;
};

initialize();

//prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};

//dev mode
ENVIRONMENT !== "production" && development(bot);
