# Introduction

YieldFi AI is an AI-powered financial assistant designed to help users manage and optimize their MetaMask Card-linked account balance. It optimizes idle assets for the best possible yield while ensuring the user's MetaMask Card has funds ready for spending. By simplifying the complexities of DeFi into a conversational AI on Telegram, YieldFi AI empowers users to take control of their assets with ease, making sophisticated financial strategies accessible to everyone.

# Problem Statement

The Metamask Card is a revolutionary bridge between Web3 and the real world. Yet it still inherits the main challenges of Web3 world: complex and fragmented DeFi ecosystems. This leads to:

- Idle Funds/ Capital inefficiency. To use the card, users must keep funds (like USDC) in their wallet, where it sits idle, earning zero yield.

- DeFi is hard. Actively managing these funds across different lending protocols on different blockcahins is complex, time-consuming, and requires constant monitoring. For non-expert users, this is a nightmare, causing them to miss out on passive income.

- Manual Topping-up. Users must manually bridge and transfer their funds to their Metamask Card wallet to avoid declined transactions if their balance runs lows unexpectedly.

The result is a choice between liquidity for spending and yield from DeFi. Users shouldn't have to choose.

# Solution

**YieldFi: An AI-Powered Financial Assistant.**

YieldFi abstracts away the complexity of DeFi world, providing a hands-off Defi experience for the users to achieve optimized yields while maintaining the balances of their Metamark card wallet. 

It fundamentally enhances the value proposition of the MetaMask Card. It moves beyond being just a "crypto debit card" and becomes the hub for a user's entire financial life. It provides automated yield optimization and personalized financial management, attracting both DeFi power users and passive income seekers, ultimately driving wider adoption and daily use of the MetaMask Card.

# ✨ Key Features

- 🏦 Secure, Abstracted Saving Vault: We leverage the Circle Wallet API to create a secure, dev-controlled saving wallet (EIP-4432-compatible wallet) for each user. It allows our AI agent to execute complex DeFi strategies without requiring the user to sign dozens of transactions. Users can easily transfer USDC between their primary Metamask Card wallet (EOA) and their new saving vault.

- 🚀 One-Click Bridging & Deposits: Our web interface allows users to link their MetaMask Card account and perform an initial deposit. It conveniently handles the bridge from Linea (where the card operates) to Base, where we can access excellent yield opportunities.

- 🤖 Conversational AI Management: Interact with your personal DeFi agent on Telegram. Use commands like:

"Lend my 500 USDC on AAVE." The agent automatically deposits the funds into the highest-yield AAVE pool on Base.

"What's the best rate between AAVE and Compound right now?" The agent queries the protocols and provides real-time data.

"Move 100 USDC back to my MetaMask Card." The agent seamlessly transfers funds from the savings vault back to the user's EOA, ready for spending.

- 🔔 Proactive Balance Alerts: A dedicated backend service constantly monitors the user's MetaMask Card wallet balance. If the balance drops below a user-defined threshold (e.g., $50), it sends a proactive notification via Telegram, suggesting a top-up from their savings vault.

- 📈 Automated Yield Optimization: The AI agent can find and deploy funds to the best available lending rates, maximizing your passive income.

# Technical Architecture

- User Wallet: The user's standard MetaMask Card EOA on the Linea network.

- Savings Vault: Circle Wallet API for creating and managing secure, programmable wallets.

- Web Frontend: A simple webpage for account linking and initial deposits.

- Interaction Layer: The Telegram Bot API serves as the conversational interface for the AI agent.

- Backend & Automation: A robust backend service (e.g., Node.js/Python) that:

* Listens for and processes commands from the Telegram bot.

* Integrates with AAVE and Compound smart contracts on the Base network to manage lending positions.

* Executes cross-chain transfers between the savings vault and the user's MetaMask Card.

* Runs a recurring job (cron) to check user balances on Linea and trigger notifications.

* Chains: Linea (for the MetaMask Card) and Base/Optimism/Arbitrum (for DeFi yield farming).

# 🔮 Future Work

- **EIP-7702, EIP-7715, Metamask Delegation Toolkit (DTK) support**. Once widely adopted, these protocols would allow the AI agent to manager user's tokens without having to move the tokens between wallets.

- **Multi-Asset Support via LiFi SDK**: Expand beyond USDC to support other stablecoins and assets like WETH. 

- **Credit Line Management**: Allow users to use non-stablecoins (e.g., ETH) as collateral for loans.

- **Automated Rebalancing**: Implement a fully automated mode where the AI agent periodically rebalances funds between AAVE and Compound without user intervention to always capture the best yield.
