import { useEffect } from "react";
import { useAccount } from "wagmi";
import { supportedTokens } from "~~/components/constants/tokens";
import type { Token } from "~~/components/constants/tokens";

const stablecoinSymbols = [
  "USDC", "DAI", "USDT", "TUSD", "FDUSD", "EURC", "AUDD", "AUDT", "QCAD", "JPYC",
  "MMXN", "PYUSD", "XSGD", "USDP", "ZARP", "BRL1", "GBPT", "EURe", "TRYX", "BTC",
  "ETH", "WBNB", "WETH", "WBTC", "FRAX", "GBDx", "COPx", "GBDo", "GLB"
];

const symbolImageGroups: { [pattern: string]: string } = {
  "^GBD\\d+$": "https://brantley-global.com/tokens/dividend-generic.png",
  "^TG": "https://brantley-global.com/tokens/Infra.png",
  "^BG": "https://brantley-global.com/tokens/RE.png",
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

const addTokenToMetaMask = async (token: Token & { image: string }) => {
  if (
    !window.ethereum ||
    !token.address ||
    token.isNative ||
    stablecoinSymbols.includes(token.symbol)
  ) {
    return;
  }

  const alreadyAdded = localStorage.getItem(`token-added-${token.symbol}`);
  if (alreadyAdded) return;

  //const imagePath = getImagePath(token.symbol);

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
      await delay(1500); // Wait for wallet to settle
      const nonStableTokens = supportedTokens
      .filter(token => !stablecoinSymbols.includes(token.symbol))
      .map(token => ({
        ...token,
        image: getImagePath(token.symbol),
      }));

      for (const token of nonStableTokens) {
        await addTokenToMetaMask(token);
        await delay(1000);
      }

    };

    run();
  }, [isConnected]);
};
