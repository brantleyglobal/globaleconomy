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
  const trustConnector = connectors.find(c => c.name === "Trust Wallet");
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
    } catch (err: any) {
      console.error("Wallet connect error:", err, JSON.stringify(err, Object.getOwnPropertyNames(err)));
    }

  };

  const isMobile = typeof window !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-[#111] text-white rounded-xl shadow-2xl w-full max-w-xl mx-4 p-8">
        <h2 className="text-2xl font-light text-center mb-6 tracking-wide">CONNECT YOUR WALLET</h2>

        <div className="flex flex-col md:flex-row gap-6">
          {isMobile && (
            <p className="text-sm text-yellow-400 text-center mt-2">
              Please use the MetaMask mobile app’s built-in browser for blockchain transactions.
            </p>
          )}
          {/* Wallet Buttons */}
          <div className="flex flex-col gap-4 w-full md:w-1/2">
            {[
              { connector: trustConnector, label: "Trust Wallet" },
              { connector: metamaskConnector, label: "MetaMask" },
              { connector: injectedConnector, label: "Injected Wallet" },
            ].map(({ connector, label }) => {
              const isAvailable = !!connector;
              return (
                <button
                  key={label}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 border ${
                    isAvailable
                      ? "bg-[#1f1f1f] hover:bg-secondary/30 text-white border-none"
                      : "bg-[#1a1a1a] text-gray-500 border-none cursor-not-allowed"
                  }`}
                  disabled={!isAvailable || isConnecting}
                  onClick={() => isAvailable && handleConnectWallet(connector!)}
                >
                  {isConnecting && isAvailable
                    ? "Connecting..."
                    : isAvailable
                    ? label
                    : `${label} (Not detected)`}
                </button>
              );
            })}

            <button
              className="w-full py-2 px-4 rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] text-sm font-medium transition-all duration-200 border border-[#444]"
              onClick={onClose}
            >
              Cancel
            </button>

            {(connectError || errorMessage) && (
              <p className="text-sm text-red-500 text-center mt-2">
                {connectError || errorMessage}
              </p>
            )}
          </div>
          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center w-full md:w-1/2 bg-[#1a1a1a] rounded-lg p-4 border border-[#333] shadow-inner">
            <QRCodeSVG
              value="https://trustwallet.com/download"
              size={180}
              bgColor="#1a1a1a"
              fgColor="#ffffff"
            />
            <span className="mt-4 text-xs text-gray-400 text-center">
              Scan to install Trust Wallet Mobile
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
