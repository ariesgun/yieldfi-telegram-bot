// --- bot.js ---
// ... after all your require statements ...
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const axios = require('axios');

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

// --- Add your initializations for Telegram, Circle, etc. ---
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error('ERROR: Missing GEMINI_API_KEY. Please check your .env file.');
  process.exit(1);
}

// --- Initialize Gemini AI Client ---
const genAI = new GoogleGenerativeAI(geminiApiKey);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { maxOutputTokens: 1000000 } });

// =======================================================
// MODULE 1: Data Gathering from DeFiLlama
// =======================================================

/**
 * Fetches and filters DeFi vault data from DeFiLlama's public API.
 * @param {string} assetSymbol - The asset to search for (e.g., 'USDC').
 * @param {string} chainName - The blockchain to filter by (e.g., 'Base').
 * @returns {Promise<Array>} A promise that resolves to an array of filtered pool data.
 */
export async function getDeFiVaultData() {
  const supportedChains = ["optimism", "base", "arbitrum"];
  const supportedAssets = ["usdc", "eth"];
  const supportedProjects = ["aave-v3", "compound-v3", "harvest-finance"];

  try {
    const response = await axios.get('https://yields.llama.fi/pools');
    const allPools = response.data.data;

    const filteredPools = allPools.filter(pool =>
      supportedChains.includes(pool.chain.toLowerCase()) &&
      supportedAssets.includes(pool.symbol.toLowerCase()) &&
      supportedProjects.includes(pool.project.toLowerCase()) &&
      pool.apy > 0.1 && // Filter out very low or erroneous APY pools
      pool.tvlUsd > 100000 && // Filter out pools with very low TVL
      pool.ilRisk === "no"
    );

    // Sort by TVL (Total Value Locked) to prioritize larger, more established pools
    filteredPools.sort((a, b) => b.tvlUsd - a.tvlUsd);

    // Return the top 10 most relevant pools to keep the data for the AI concise
    for (const pool of filteredPools) {
      console.log(`Project: ${pool.project}, Pool: ${pool.chain}, APY: ${pool.apy.toFixed(2)}%, TVL: $${pool.tvlUsd.toLocaleString()}`);
    }
    console.log(`Found ${filteredPools.length} relevant pools. Taking top 10.`);
    // return filteredPools.slice(0, 10);
    return filteredPools.slice(0, filteredPools.length);;

  } catch (error) {
    console.error('Error fetching data from DeFiLlama:', error.message);
    return [];
  }
}

// =======================================================
// MODULE 2: AI Decision Making with Gemini
// =======================================================

/**
 * Asks Gemini Pro to analyze vault data and provide a recommendation.
 * @param {Array} vaultData - The array of vault data from getDeFiVaultData.
 * @param {string} assetSymbol - The asset the user is interested in.
 * @param {string} chainName - The chain the user is interested in.
 * @returns {Promise<string>} A promise that resolves to the AI's formatted recommendation.
 */
export async function getAIVaultRecommendation(vaultData, assetSymbol) {
  const prompt = `
    You are a helpful and cautious DeFi Analyst Assistant for a Telegram bot.Your task is to analyze a list of DeFi lending vaults and recommend the best option for a user.

    ** User Request:** The user wants to find the best vault to lend their ${assetSymbol}.

    ** Analysis Data:** Here is a JSON array of available vaults, sorted by Total Value Locked(TVL).Analyze this data based on APY(Annual Percentage Yield) and TVL.
    - ** APY:** Higher is better for returns.Prefer pools with higher base APY than rewards APY.
    - ** TVL:** Higher is generally an indicator of stability and trust.A good recommendation often balances high APY with substantial TVL.Do not recommend pools with very low TVL unless their APY is exceptional and you highlight the risk.

    ** Data:**
        ${JSON.stringify(vaultData)}

    ** Your Response Format:**
        Please provide your answer in two parts:
    1. A Telegram - friendly Markdown formatted message: 
        Provide your response in Telegram - friendly Markdown. Use '-' instead of '*' for list.
        1. * Top Recommendation:* Start with "🏆 *Top Recommendation*". State the pool name, and chain clearly.
        2. * Key Metrics:* List the APY, TVL, and any other relevant metric from the data.
        3. * Reasoning:* In a section called "🤔 **Why this choice?**", explain in 2 - 3 sentences why you chose this vault, referencing the balance between APY and TVL.
        4. * Alternatives:* List 5 other strong choices under "✅ **Other Strong Options**".Just state the pool and chain name, their APY and TVL, without detailed explanations.
        5. * Disclaimer:* * ALWAYS * end with the following mandatory disclaimer: "⚠️ *Disclaimer:* This is not financial advice. APYs are variable and subject to change. Always do your own research (DYOR) before investing in any DeFi protocol."
    2. A JSON object with the structure below. Sort the results based on recommendations.
    \`\`\`json
        {
            "recommendations": [
                {
                    "project": "Project Name",
                    "chain": "Chain Name",
                    "apy": "APY Value",
                    "tvl": "TVL Value",
                },
                // ... up to 6 other options
            ]
        }
        \`\`\`

    Begin your response now.
  `;

  try {
    console.log('Sending data to Gemini for analysis...');
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    console.log('Received response from Gemini AI.');
    console.log('AI Response:', response.text());

    const match = response.text().match(/```json\s*([\s\S]*?)```/);
    let jsonResponse = {};
    if (match) {
      const jsonString = match[1];
      jsonResponse = JSON.parse(jsonString);
      console.log(jsonResponse); // { key: 'value', foo: 42 }
    } else {
      console.log('No JSON found.');
    }
    return [response.text().replace(/```json[\s\S]*?```/, '').trim(), jsonResponse];

  } catch (error) {
    console.error('Error communicating with Gemini API:', error);
    throw error;
  }
}