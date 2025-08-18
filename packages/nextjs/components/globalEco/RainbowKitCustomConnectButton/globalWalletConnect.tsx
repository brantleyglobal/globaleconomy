"use client";

import { createPortal } from "react-dom";
import { useConnect, useWalletClient, Connector } from "wagmi";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";

interface GlobalWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage?: string;
}

export const GlobalWalletModal = ({
  isOpen,
  onClose,
  errorMessage,
}: GlobalWalletModalProps) => {
  const { connect, connectors, status } = useConnect();
  const { data: walletClient } = useWalletClient();

  const [connectError, setConnectError] = useState<string | null>(null);
  const isConnecting = status === "pending";

  const metamaskConnector = connectors.find(c => c.name === "MetaMask");
  const injectedConnector = connectors.find(c => c.id === "injected");

  const switchToGlobalChain = async () => {
    const targetChainId = `0x${GLOBALCHAIN.id.toString(16)}`;
    const currentChainId = await window.ethereum.request({ method: "eth_chainId" });

    if (currentChainId !== targetChainId) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: targetChainId,
          chainName: GLOBALCHAIN.name,
          nativeCurrency: {
            name: "GBDO",
            symbol: "GBDO",
            decimals: 18,
          },
          rpcUrls: [GLOBALCHAIN.rpcUrls.default.http[0]],
          blockExplorerUrls: [GLOBALCHAIN.blockExplorers.default.url],
        }],
      });
    }
  };

  const handleConnectWallet = async (connector: Connector) => {
    try {
      setConnectError(null);
      await connect({ connector });
      await switchToGlobalChain();

      // Safe SDK initialization now handled by provider
    } catch (err: any) {
      setConnectError(err?.message || "Connection failed.");
      console.error("Wallet connect error:", err);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="relative z-50 bg-base-100 text-base-content border border-base-300 rounded-box shadow-xl w-full max-w-[760px] mx-4 md:mx-0 p-8 pointer-events-auto">
        <h2 className="text-lg font-light mb-8 text-center">CONNECT YOUR WALLET</h2>

        <div className="grid md:grid-cols-[280px_auto] gap-x-20 gap-y-6 items-start">
          <div className="flex flex-col gap-4 w-full max-w-[280px]">
            {metamaskConnector ? (
              <button
                className="btn btn-sm font-light rounded-md w-full"
                style={{ backgroundColor: "#132e17", color: "#b5b7ba" }}
                disabled={isConnecting}
                onClick={() => handleConnectWallet(metamaskConnector)}
              >
                {isConnecting ? "Connecting..." : "MetaMask"}
              </button>
            ) : (
              <span className="text-sm text-warning text-center">MetaMask not detected</span>
            )}

            {injectedConnector && (
              <button
                className="btn btn-primary rounded-md btn-sm font-light w-full"
                disabled={isConnecting}
                onClick={() => handleConnectWallet(injectedConnector)}
              >
                {isConnecting ? "Connecting..." : "Injected Wallet"}
              </button>
            )}

            <button
              className="btn btn-white/20 rounded-md btn-sm font-light w-full"
              onClick={onClose}
            >
              CANCEL
            </button>

            {(connectError || errorMessage) && (
              <p className="text-sm text-red-500 text-center mt-4">
                {connectError || errorMessage}
              </p>
            )}
          </div>

          <div className="bg-[#0a0909] rounded-box px-8 py-6 flex flex-col items-center justify-center w-full max-w-[320px] mx-auto">
            <QRCodeSVG
              value="https://metamask.io/download"
              size={220}
              bgColor="#0a0909"
              fgColor="#ffffff"
            />
            <span className="mt-4 text-sm text-info text-center">
              Scan to install MetaMask Mobile
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
