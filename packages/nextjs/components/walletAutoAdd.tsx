"use client";

import { useEffect } from "react";
import { useChainId, useAccount, useConnectors } from "wagmi";
import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";

export const WalletAutoAdd = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const connectors = useConnectors();

  const metaMaskConnector = connectors.find(c => c.id === "metaMask");

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

    if (isConnected && isMetaMask && chainId !== GLOBALCHAIN.id) {
      switchToGLOBALCHAIN();
    }
  }, [isConnected, chainId]);

  return null;
};
