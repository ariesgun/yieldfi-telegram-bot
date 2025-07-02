export const SupportedChainId = {
  ETH_SEPOLIA: 11155111,
  AVAX_FUJI: 43113,
  BASE_SEPOLIA: 84532,
  SONIC_BLAZE: 57054,
  LINEA_SEPOLIA: 59141,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM_SEPOLIA: 11155420,
  AMOY_SEPOLIA: 80002,
}

export const DEFAULT_MAX_FEE = 1000n;
export const DEFAULT_FINALITY_THRESHOLD = 2000;

export const CHAIN_IDS_TO_CIRCLE_WALLET_BLOCKCHAIN = {
  [SupportedChainId.ETH_SEPOLIA]: "ETH-SEPOLIA",
  [SupportedChainId.AVAX_FUJI]: "AVAX-FUJI",
  [SupportedChainId.BASE_SEPOLIA]: "BASE-SEPOLIA",
  [SupportedChainId.ARBITRUM_SEPOLIA]: "ARB-SEPOLIA",
  [SupportedChainId.OPTIMISM_SEPOLIA]: "OP-SEPOLIA",
}

export const CHAIN_CIRCLE_TO_IDS = {
  "ETH-SEPOLIA" : SupportedChainId.ETH_SEPOLIA,
  "AVAX-FUJI" : SupportedChainId.AVAX_FUJI,
  "BASE-SEPOLIA" : SupportedChainId.BASE_SEPOLIA,
  "ARB-SEPOLIA" : SupportedChainId.ARBITRUM_SEPOLIA,
  "OP-SEPOLIA" : SupportedChainId.OPTIMISM_SEPOLIA
}

export const CHAIN_LOGO = {
  [SupportedChainId.ETH_SEPOLIA]: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  [SupportedChainId.AVAX_FUJI]: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanche/info/logo.png",
  [SupportedChainId.BASE_SEPOLIA]: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png",
  [SupportedChainId.SONIC_BLAZE]: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sonic/info/logo.png",
  [SupportedChainId.LINEA_SEPOLIA]: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/linea/info/logo.png",
  [SupportedChainId.ARBITRUM_SEPOLIA]: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
  [SupportedChainId.OPTIMISM_SEPOLIA]: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png",
}

export const CHAIN_TO_CHAIN_NAME = {
  [SupportedChainId.ETH_SEPOLIA]: "Ethereum Sepolia",
  [SupportedChainId.AVAX_FUJI]: "Avalanche Fuji",
  [SupportedChainId.BASE_SEPOLIA]: "Base Sepolia",
  [SupportedChainId.SONIC_BLAZE]: "Sonic Blaze",
  [SupportedChainId.LINEA_SEPOLIA]: "Linea Sepolia",
  [SupportedChainId.ARBITRUM_SEPOLIA]: "Arbitrum Sepolia",
  [SupportedChainId.OPTIMISM_SEPOLIA]: "Optimism Sepolia",
};

export const CHAIN_IDS_TO_USDC_ADDRESSES = {
  [SupportedChainId.ETH_SEPOLIA]: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
  [SupportedChainId.AVAX_FUJI]: "0x5425890298aed601595a70AB815c96711a31Bc65",
  [SupportedChainId.BASE_SEPOLIA]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  [SupportedChainId.SONIC_BLAZE]: "0xA4879Fed32Ecbef99399e5cbC247E533421C4eC6",
  [SupportedChainId.OPTIMISM_SEPOLIA]: "0x5fd84259d66cd46123540766be93dfe6d43130d7",
  [SupportedChainId.LINEA_SEPOLIA]:
    "0xFEce4462D57bD51A6A552365A011b95f0E16d9B7",
  [SupportedChainId.ARBITRUM_SEPOLIA]:
    "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

export const CHAIN_IDS_TO_TOKEN_MESSENGER = {
  [SupportedChainId.ETH_SEPOLIA]: "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa",
  [SupportedChainId.AVAX_FUJI]: "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa",
  [SupportedChainId.BASE_SEPOLIA]: "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa",
  [SupportedChainId.SONIC_BLAZE]: "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa",
  [SupportedChainId.OPTIMISM_SEPOLIA]: "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa",
  [SupportedChainId.LINEA_SEPOLIA]:
    "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa",
  [SupportedChainId.ARBITRUM_SEPOLIA]:
    "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa",
};

export const CHAIN_IDS_TO_MESSAGE_TRANSMITTER = {
  [SupportedChainId.ETH_SEPOLIA]: "0xe737e5cebeeba77efe34d4aa090756590b1ce275",
  [SupportedChainId.AVAX_FUJI]: "0xe737e5cebeeba77efe34d4aa090756590b1ce275",
  [SupportedChainId.BASE_SEPOLIA]: "0xe737e5cebeeba77efe34d4aa090756590b1ce275",
  [SupportedChainId.SONIC_BLAZE]: "0xe737e5cebeeba77efe34d4aa090756590b1ce275",
  [SupportedChainId.OPTIMISM_SEPOLIA]: "0xe737e5cebeeba77efe34d4aa090756590b1ce275",
  [SupportedChainId.LINEA_SEPOLIA]:
    "0xe737e5cebeeba77efe34d4aa090756590b1ce275",
  [SupportedChainId.ARBITRUM_SEPOLIA]:
    "0xe737e5cebeeba77efe34d4aa090756590b1ce275",
};

export const AAVE_POOL_ADDRESS = {
  [SupportedChainId.ETH_SEPOLIA]: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  [SupportedChainId.ARBITRUM_SEPOLIA]: "0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff",
  [SupportedChainId.OPTIMISM_SEPOLIA]: "0xb50201558B00496A145fE76f7424749556E326D8",
};

export const AAVE_POOL_ETH_ADDRESS = {
  [SupportedChainId.ETH_SEPOLIA]: "",
  [SupportedChainId.ARBITRUM_SEPOLIA]: "0x20040a64612555042335926d72B4E5F667a67fA1",
  [SupportedChainId.OPTIMISM_SEPOLIA]: "0x589750BA8aF186cE5B55391B0b7148cAD43a1619",
};

export const AAVE_ETH_BALANCES_ADDRESS = {
  [SupportedChainId.ARBITRUM_SEPOLIA]: "0xf5f17ebe81e516dc7cb38d61908ec252f150ce60",
  [SupportedChainId.OPTIMISM_SEPOLIA]: "0x23e4E76D01B2002BE436CE8d6044b0aA2f68B68a",
}

export const AAVE_USDC_BALANCES_ADDRESS = {
  [SupportedChainId.ARBITRUM_SEPOLIA]: "0x460b97bd498e1157530aeb3086301d5225b91216",
  [SupportedChainId.OPTIMISM_SEPOLIA]: "0xa818f1b57c201e092c4a2017a91815034326efd1",
}

export const COMPOUND_ETH_POOL_ADDRESS = {
  [SupportedChainId.BASE_SEPOLIA]: "0x61490650AbaA31393464C3f34E8B29cd1C44118E",
}

export const COMPOUND_USDC_POOL_ADDRESS = {
  [SupportedChainId.BASE_SEPOLIA]: "0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017",
}

export const CHAIN_IDS_TO_WETH_ADDRESSES = {
  [SupportedChainId.BASE_SEPOLIA]: "0x4200000000000000000000000000000000000006",
}

export const DESTINATION_DOMAINS = {
  [SupportedChainId.ETH_SEPOLIA]: 0,
  [SupportedChainId.AVAX_FUJI]: 1,
  [SupportedChainId.BASE_SEPOLIA]: 6,
  [SupportedChainId.SONIC_BLAZE]: 13,
  [SupportedChainId.OPTIMISM_SEPOLIA]: 2,
  [SupportedChainId.LINEA_SEPOLIA]: 11,
  [SupportedChainId.ARBITRUM_SEPOLIA]: 3,
};

export const SUPPORTED_CHAINS = [
  SupportedChainId.ETH_SEPOLIA,
  SupportedChainId.AVAX_FUJI,
  SupportedChainId.BASE_SEPOLIA,
  SupportedChainId.SONIC_BLAZE,
  SupportedChainId.LINEA_SEPOLIA,
  SupportedChainId.ARBITRUM_SEPOLIA,
  SupportedChainId.OPTIMISM_SEPOLIA,
];
