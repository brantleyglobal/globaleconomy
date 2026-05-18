"use client";

import { useEffect, useRef } from "react";
import { useChainId, useAccount, useConnectors } from "wagmi";
import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";

export const WalletAutoAdd = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const connectors = useConnectors();

  const metaMaskConnector = connectors.find(c => c.id === "metaMask");

  const hasRun = useRef(false);

  const TOKENS = [
    {
      address: "0xdE8200d454DfD32Ae694705648Efa53750101aBc",
      symbol: "GBDo",
      decimals: 18,
      image: "https://brantley-global.com/globalw.png",
    },
    {
      address: "0x0Cac0b334967bef2017b1e47629f842648598636",
      symbol: "COPx",
      decimals: 18,
      image: "https://brantley-global.com/global.png",
    },
  ];

  const ALLOWED_CHAINS =[
    GLOBALCHAIN.id,
    137,
    1,
  ]

  const addTokenToWallet = async ({ address, symbol, decimals, image }: typeof TOKENS[number]) => {
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

  useEffect(() => {
    const switchToGLOBALCHAIN = async () => {
      if (!window?.ethereum) {
        console.warn("Ethereum provider not found");
        return;
      }

      const hexChainId = "0x" + GLOBALCHAIN.id.toString(16);
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexChainId }],
        });
      } catch (error: any) {
        if (error.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: hexChainId,
              chainName: GLOBALCHAIN.name,
              rpcUrls: GLOBALCHAIN.rpcUrls.default.http,
              nativeCurrency: GLOBALCHAIN.nativeCurrency,
              blockExplorerUrls: [GLOBALCHAIN.blockExplorers?.default?.url || ""],
            }],
          });

          // Wait until MetaMask emits chainChanged before continuing
          await new Promise<void>((resolve, reject) => {
            function handler(newChainId: string) {
              if (parseInt(newChainId, 16) === GLOBALCHAIN.id) {
                window.ethereum.removeListener("chainChanged", handler);
                resolve();
              }
            }
            window.ethereum.on("chainChanged", handler);

            // optional timeout
            setTimeout(() => {
              window.ethereum.removeListener("chainChanged", handler);
              reject(new Error("Timeout waiting for chainChanged"));
            }, 10000);
          });

          // Add tokens after chain is added
          for (const token of TOKENS) {
            await addTokenToWallet(token);
          }
        } else {
          console.error("Switch error:", error);
        }
      }
    };

    const isMetaMask = window?.ethereum?.isMetaMask;

    // Only run once per page load
    if (!hasRun.current && isConnected && isMetaMask) {
      hasRun.current = true;
    }
    if (!ALLOWED_CHAINS.includes(chainId)) {
      switchToGLOBALCHAIN();
    }
  }, [isConnected, chainId]);

  return null;
};
