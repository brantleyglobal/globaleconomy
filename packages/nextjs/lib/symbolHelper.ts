import { useEffect } from "react";
import { useAccount } from "wagmi";
import { supportedTokens, dividendTokens } from "~~/components/constants/tokens";
import type { Token } from "~~/components/constants/tokens";

const stablecoinSymbols = [
  "USDC", "DAI", "USDT", "TUSD", "FDUSD", "EURC", "AUDD", "AUDT", "QCAD", "JPYC",
  "MMXN", "PYUSD", "XSGD", "USDP", "ZARP", "BRL1", "GBPT", "EURe", "TRYX", "BTC",
  "ETH", "WBNB", "WETH", "WBTC", "FRAX", "GBDx", "COPx"
];

const symbolImageGroups: { [pattern: string]: string } = {
  "^GBD\\d+$": "https://brantley-global.com/tokens/Div.png",
  "^TG": "https://brantley-global.com/tokens/Fuel.png",
  "^CRE": "https://brantley-global.com/tokens/RE.png",
  "^CGRi": "https://brantley-global.com/tokens/CE.png",
  "^GLB": "https://brantley-global.com/tokens/globe.png",
  "^GBDo": "https://brantley-global.com/tokens/GBDx.png",
  "^GBDx": "https://brantley-global.com/tokens/GBDx.png",
  "^Copx": "https://brantley-global.com/tokens/GBDx.png",
};

const getImagePath = (symbol: string): string => {
  for (const pattern in symbolImageGroups) {
    const regex = new RegExp(pattern);
    if (regex.test(symbol)) {
      return symbolImageGroups[pattern];
    }
  }
  return `https://brantley-global.com/tokens/${symbol.toLowerCase()}.png`;
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const addTokenToMetaMask = async (token: Token & { image?: string }) => {
  if (!window.ethereum || !token.address || token.isNative) return;

  const alreadyAdded = localStorage.getItem(`token-added-${token.symbol}`);
  if (alreadyAdded) return;

  try {
    const wasAdded = await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
          image: token.image,
        },
      },
    });

    if (wasAdded) {
      localStorage.setItem(`token-added-${token.symbol}`, "true");
      console.log(`${token.symbol} added to MetaMask`);
    }
  } catch (err) {
    console.error(`Failed to add ${token.symbol}:`, err);
  }
};

export const useAutoAddTokens = () => {
  const { isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected) return;

    const run = async () => {
      await delay(1500); // wait for wallet to settle

      // Combine dividend + supported tokens, attach images
      const allTokens: (Token & { image: string })[] = [
        //...dividendTokens,
        ...supportedTokens.filter(t => 
          !dividendTokens.find(d => d.symbol === t.symbol) &&
          !stablecoinSymbols.includes(t.symbol)),
      ].map(token => ({
        ...token,
        image: getImagePath(token.symbol),
      }));

      // Dividend tokens first (sequential for UX)
      for (const token of allTokens.filter(t => dividendTokens.find(d => d.symbol === t.symbol))) {
        await addTokenToMetaMask(token);
        await delay(1000);
      }

      // Add the rest in parallel (excluding stablecoins + already added dividend tokens)
      /*const otherTokens = allTokens.filter(
        t =>
          !stablecoinSymbols.includes(t.symbol) &&
          !dividendTokens.find(d => d.symbol === t.symbol)
      );*/

      //await Promise.all(otherTokens.map(token => addTokenToMetaMask(token)));
    };

    run();
  }, [isConnected]);
};