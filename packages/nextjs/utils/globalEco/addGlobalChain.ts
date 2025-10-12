import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";

type Token = {
  address: string;
  symbol: string;
  decimals: number;
  image: string;
};

const TOKENS = [
  {
    address: "0xdE8200d454DfD32Ae694705648Efa53750101aBc",
    symbol: "GBDO",
    decimals: 18,
    image: "https://brantley-global.com/globalw.png",
  },
  {
    address: "0x0Cac0b334967bef2017b1e47629f842648598636",
    symbol: "COPX",
    decimals: 18,
    image: "https://brantley-global.com/global.png",
  },
];

const addTokenToWallet = async ({ address, symbol, decimals, image }: Token) => {
  try {
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: { address, symbol, decimals, image },
      },
    });
  } catch (err) {
    console.error(`Failed to add token ${symbol}:`, err);
  }
};

export const addGLOBALCHAINToWallet = async () => {
  if (typeof window === "undefined" || !window.ethereum?.request) return;

  try {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: `0x${GLOBALCHAIN.id.toString(16)}`,
        chainName: GLOBALCHAIN.name,
        nativeCurrency: GLOBALCHAIN.nativeCurrency,
        rpcUrls: GLOBALCHAIN.rpcUrls.default.http,
        blockExplorerUrls: [GLOBALCHAIN.blockExplorers?.default.url],
      }],
    });

    // Add tokens after chain is added
    for (const token of TOKENS) {
      await addTokenToWallet(token);
    }

  } catch (err) {
    console.error("Failed to add GLOBALCHAIN or tokens to wallet:", err);
  }
};
