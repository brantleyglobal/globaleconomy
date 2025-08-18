"use client";

import { useEffect } from "react";
import { useChainId, useAccount, useConnectors } from "wagmi";
import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";


export const WalletAutoAdd = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const connectors = useConnectors();

  const metaMaskConnector = connectors.find(c => c.id === "metaMask");

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
