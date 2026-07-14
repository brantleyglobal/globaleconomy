"use client";

import React, { useState } from "react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
// Added BanknotesIcon cleanly back into the destructured @heroicons layout package below:
import { BanknotesIcon, WalletIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { WalletConnectButton } from "~~/utils/globalEco/walletConnectButton";
import { supportedTokens } from "~~/components/constants/tokens";
import { useRpcStatus } from "~~/hooks/globalEco/statusRpc";
import { useAccount } from "wagmi";

interface RefundStepProps {
  receipt: string;
  validateHash: (value: string) => void;
  data: string;
  setData: (value: string) => void;
  userFirstName: string;
  setUserFirstName: (value: string) => void;
  userLastName: string;
  setUserLastName: (value: string) => void;
  userEmail: string;
  setUserEmail: (value: string) => void;
  emailError: string;
  handleEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHelpToggle: () => void;
  onNext: () => void;
  isProcessing: boolean;
  isValidHash: boolean;
  address?: string; // Connected user wallet address from parent useAccount()
}

export const RefundStep: React.FC<RefundStepProps> = ({
  receipt,
  validateHash,
  data,
  setData,
  userFirstName,
  setUserFirstName,
  userLastName,
  setUserLastName,
  userEmail,
  setUserEmail,
  emailError,
  handleEmailChange,
  onHelpToggle,
  onNext,
  isProcessing,
  isValidHash,
  address: propAddress,
}) => {

  const { address: wagmiAddress } = useAccount();
  const activeAddress = propAddress || wagmiAddress;

  // Localized state vectors restored
  const [showStablecoinInfo, setShowStablecoinInfo] = useState(false);
  const [showWalletNotice, setShowWalletNotice] = useState(false);
  const rpcUp = useRpcStatus();

  console.log("RPC status:", rpcUp);

  // Network resolution logic matrix
  const getNetwork = (symbol: string, tokenAddress?: string): string => {
    if (symbol === "BTC") return "Bitcoin";

    if (tokenAddress && tokenAddress.startsWith("0x")) {
      const polygonSymbols = ["ZARP", "BRL1", "JPYC"];
      if (polygonSymbols.includes(symbol)) {
        return "Polygon";
      }
      return "Ethereum";
    }

    return "Unknown";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-light text-primary uppercase">Refund Request</h2>
        <button
          onClick={onHelpToggle}
          aria-label="Toggle help documentation"
          className="text-primary hover:text-secondary flex items-center gap-1"
        >
          <HelpOutlineIcon />
        </button>
      </div>

      {/* Ledger Target Selector */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-gray-400 tracking-wider">TARGET LEDGER CONTEXT</label>
        <select
          className="select rounded-md bg-black w-full text-primary outline-none p-3 text-sm border-none focus:ring-0 focus:outline-none"
          value={data}
          onChange={(e) => setData(e.target.value)}
        >
          <option value="AssetPurchase">Product Purchase Ledger</option>
        </select>
      </div>

      {/* Hash Input */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-gray-400 tracking-wider">PROOF OF DEPOSIT RECEIPT HASH</label>
        <input
          type="text"
          value={receipt}
          onChange={(e) => validateHash(e.target.value)}
          placeholder="Input Receipt Hash '0x...'"
          className="input w-full bg-black rounded-md p-3 text-sm border-none text-white placeholder:text-white/30 outline-none focus:outline-none"
        />
      </div>

      {/* Confirmation Details Profile Fields */}
      <div className="pt-2 border-t border-white/5">
        <p className="text-white mb-2 uppercase tracking-wide text-xs font-light">Confirmation Details</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={userFirstName}
            onChange={(e) => setUserFirstName(e.target.value)}
            placeholder="First Name"
            className="input w-full bg-black rounded-md p-3 text-sm border-none text-white placeholder:text-white/30 outline-none focus:outline-none"
          />
          <input
            type="text"
            value={userLastName}
            onChange={(e) => setUserLastName(e.target.value)}
            placeholder="Last Name"
            className="input w-full bg-black rounded-md p-3 text-sm border-none text-white placeholder:text-white/30 outline-none focus:outline-none"
          />
        </div>
        <input
          type="email"
          value={userEmail}
          onChange={handleEmailChange}
          placeholder="Email Address"
          className={`input w-full bg-black mt-2 rounded-md p-3 text-sm border-none text-white placeholder:text-white/30 outline-none focus:outline-none ${
            emailError ? "border-red-500" : ""
          }`}
        />
        {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
      </div>

      {/* Floating Stablecoin Spec Trigger Label */}
      <div className="text-left pt-1">
        <button
          onClick={() => setShowStablecoinInfo(true)}
          className="text-[11px] text-secondary hover:underline tracking-wide uppercase"
        >
          [ View Supported Stablecoin Specifications ]
        </button>
      </div>

      {/* Wallet Connect & Core Footer Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 py-4 border-t border-white/5 bg-transparent w-full">
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2">
          <WalletConnectButton />
          
          {!activeAddress && (
            <div className="relative inline-block">
              <button
                onClick={() => setShowWalletNotice(true)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                title="Wallet Authentication Required"
              >
                <ExclamationCircleIcon className="w-4 h-4 text-red-500" />
              </button>
              
              {showWalletNotice && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 border-t border-white/10 shadow-2xl p-6 max-h-[40vh] overflow-y-auto animate-slide-up">
                  <div className="flex items-center gap-2 mb-3">
                    <WalletIcon className="w-5 h-5 text-secondary" />
                    <h2 className="text-lg font-medium text-white uppercase tracking-wider">Wallet Required</h2>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    Connect your wallet to continue. This ensures secure and personalized access.
                  </p>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowWalletNotice(false)}
                      className="px-4 py-1.5 text-xs bg-secondary text-white rounded-md uppercase tracking-wider"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className="btn bg-secondary/80 hover:bg-secondary btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-40 px-6 w-full sm:w-auto uppercase tracking-wider"
          onClick={onNext}
          disabled={!receipt || !isValidHash || !activeAddress || isProcessing || !!emailError}
        >
          {isProcessing ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <BanknotesIcon className="h-4 w-4 shrink-0" />
              <span>Confirm Entry</span>
            </>
          )}
        </button>
      </div>

      {/* Restored Supported Stablecoin Specifications sliding panel modal component */}
      <SlidePanel isOpen={showStablecoinInfo} onClose={() => setShowStablecoinInfo(false)} title="SUPPORTED STABLECOINS">
        <div className="overflow-hidden max-h-[40vh] rounded-t-xl">
          <div className="overflow-y-auto max-h-[calc(40vh-20px)] px-2 py-4 space-y-4 text-sm text-gray-300 scrollbar-hide">
            {supportedTokens
              .filter(
                ({ symbol }) =>
                  !["GBDo", "BTC", "ETH", "GBDx", "COPx", "GLB", "TGUSA", "TGMX", "CREs", "CREh", "CGRi"].includes(symbol)
              )
              .map(({ name, symbol, address: tokenAddress }) => (
                <div key={symbol} className="bg-white/5 border border-white/5 p-4 rounded-md shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-secondary">{name}</span>
                    <span className="text-xs text-gray-500">{symbol}</span>
                  </div>
                  <div className="mt-1 text-xs break-all text-gray-400">
                    <strong>Address:</strong> {tokenAddress}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    <strong>Network:</strong> {getNetwork(symbol, tokenAddress)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </SlidePanel>
    </div>
  );
};

// Internal Side Slide-Panel Layout Wrapper Component
function SlidePanel({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`fixed bottom-0 left-0 w-full z-50 bg-neutral-950 border-t border-white/10 text-white px-6 py-8 transition-transform duration-500 rounded-t-2xl shadow-2xl ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="max-w-3xl mx-auto relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-light uppercase tracking-widest text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="absolute top-0 right-0 bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close stablecoin listing panel"
          >
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}