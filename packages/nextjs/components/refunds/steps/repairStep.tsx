"use client";

import React, { useState } from "react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { WalletIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { WalletConnectButton } from "~~/utils/globalEco/walletConnectButton";
import { useAccount } from "wagmi";

interface RepairStepProps {
  receipt: string;
  setReceipt: (value: string) => void;
  userFirstName: string;
  setUserFirstName: (value: string) => void;
  userLastName: string;
  setUserLastName: (value: string) => void;
  userEmail: string;
  setUserEmail: (value: string) => void;
  emailError: string;
  handleEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHelpToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  isProcessing: boolean;
  isValidHash: boolean;
  address?: string; // Restored user wallet address source of truth
}

export const RepairStep: React.FC<RepairStepProps> = ({
  receipt,
  setReceipt,
  address: propAddress,
  userFirstName,
  setUserFirstName,
  userLastName,
  setUserLastName,
  userEmail,
  setUserEmail,
  emailError,
  handleEmailChange,
  onHelpToggle,
  onPrevious,
  onNext,
  isProcessing,
  isValidHash
}) => {

  const { address: wagmiAddress } = useAccount();
  const activeAddress = propAddress || wagmiAddress;

  const [systemSerialNumber, setSystemSerialNumber] = useState("");
  const [repairDescription, setRepairDescription] = useState("");
  const [showWalletNotice, setShowWalletNotice] = useState(false);

  return (
    <div className="space-y-4 flex flex-col h-full">
      {/* Header Context View */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-light text-primary uppercase">
          SYSTEM REPAIR REQUEST
        </h2>
        <button
          onClick={onHelpToggle}
          aria-label="Toggle help documentation"
          className="text-primary hover:text-secondary flex items-center gap-1"
        >
          <HelpOutlineIcon />
        </button>
      </div>

      {/* Proof of Original Purchase Ledger Hash */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-gray-400 tracking-wider">
          PURCHASE TRANSACTION HASH
        </label>
        <input
          type="text"
          value={receipt}
          onChange={(e) => setReceipt(e.target.value)}
          placeholder="Input Purchase Reference Hash '0x...'"
          className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/30"
        />
      </div>

      {/* Hardware Diagnostic Logs Metadata Input */}

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-gray-400 tracking-wider">
          SERIAL NUMBER (S/N)
        </label>
        <input
          type="text"
          value={systemSerialNumber}
          onChange={(e) => setSystemSerialNumber(e.target.value)}
          placeholder="Ex: BLD-1207XXX-XXXXX..."
          className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/30"
        />
      </div>

      {/* Shared Logistics Shipping Contact Profile */}
      <div className="pt-2 border-t border-white/5">
        <p className="text-white mb-2 uppercase tracking-wide text-xs font-light">
          CONFIRMATION | INSTRUCTION CONTACT
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={userFirstName}
            onChange={(e) => setUserFirstName(e.target.value)}
            placeholder="First Name"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/30"
          />
          <input
            type="text"
            value={userLastName}
            onChange={(e) => setUserLastName(e.target.value)}
            placeholder="Last Name"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/30"
          />
        </div>
        <input
          type="email"
          value={userEmail}
          onChange={handleEmailChange}
          placeholder="Email Address"
          className="input w-full bg-black mt-2 rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/30"
        />
        {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
      </div>

      {/* Wallet Connection Verification Row */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-auto pt-4 border-t border-white/5 bg-transparent w-full">
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

        {/* Action Controls */}
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md px-6 w-full sm:w-auto"
            onClick={onPrevious}
          >
            Previous
          </button>
          <button
            className="btn bg-secondary/80 hover:bg-secondary btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-40 px-6 w-full sm:w-auto uppercase tracking-wider"
            onClick={onNext}
            disabled={
              isProcessing ||
              !isValidHash ||
              !activeAddress || // Added target criteria
              !systemSerialNumber ||
              !repairDescription ||
              !userFirstName ||
              !userLastName ||
              !userEmail ||
              !!emailError
            }
          >
            {isProcessing ? "Processing..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
};