import React, { useState, useEffect, useRef } from "react";
import { AddressInput, RainbowKitCustomConnectButton } from "~~/components/globalEco";
import { WalletIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { supportedTokens } from "~~/components/constants/tokens";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { Address } from "viem";
import { getAddress } from "viem";

type AddressType = Address;

type Props = {
  xchangeId: string | undefined;
  setXchangeId: (val: string) => void;
  selectedTokenSymbol: string;
  setSelectedTokenSymbol: (val: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  userFirstName: string;
  setUserFirstName: (val: string) => void;
  userLastName: string;
  setUserLastName: (val: string) => void;
  userEmail: string;
  setUserEmail: (val: string) => void;
  onBack: () => void;
  onNext: () => void;
  onHelpToggle: () => void;
  isConnected?: boolean;
  isDisabled?: boolean;
};

export default function DepositOrRefundStep({
  xchangeId,
  setXchangeId,
  selectedTokenSymbol,
  setSelectedTokenSymbol,
  amount,
  setAmount,
  userFirstName,
  setUserFirstName,
  userLastName,
  setUserLastName,
  userEmail,
  setUserEmail,
  onHelpToggle,
  onBack,
  onNext,
  isConnected = false,
  isDisabled = false,  
}: Props) {

  const isValid = xchangeId && selectedTokenSymbol;
  const [showWalletNotice, setShowWalletNotice] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [addressError, setAddressError] = useState("");

  // Local state for address input
  const [localXchangeId, setLocalXchangeId] = useState(xchangeId ?? "");

  // Ref to hold debounce timer
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync local input if external `xchangeId` changes (except when user is typing)
  useEffect(() => {
    if (xchangeId !== localXchangeId) {
      setLocalXchangeId(xchangeId ?? "");
      setAddressError("");
    }
    // Only trigger when external xchangeId changes
  }, [xchangeId]);

  // Validate and commit address after debounced input or on blur
  const validateAndSetAddress = (val: string) => {
    try {
      const checksummed = getAddress(val);
      setXchangeId(checksummed);
      setAddressError("");
    } catch {
      setXchangeId("");
      setAddressError(val === "" ? "" : "Invalid Ethereum address");
    }
  };

  // Handle input change with debounce
  const handleXchangeIdChange = (val: string) => {
    setLocalXchangeId(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      validateAndSetAddress(val.trim());
    }, 500); // 500ms debounce
  };

  // On blur also validate immediately
  const handleBlur = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    validateAndSetAddress(localXchangeId.trim());
  };

  // Basic email validation regex
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle input change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setUserEmail(email);

    if (email === "" || validateEmail(email)) {
      setEmailError(""); // Clear error if empty or valid
    } else {
      setEmailError("Please enter a valid email address");
    }
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-light text-primary">XCHANGE INTERACTION</h3>
          <button
            onClick={onHelpToggle}
            aria-label="Toggle help"
            className="text-primary hover:text-secondary flex items-center gap-1"
          >
            <HelpOutlineIcon />
            
          </button>
        </div>

        {/* XCHANGE ID */}
        <div className="space-y-1 mt-4">
            <span className="text-xs font-light">XCHANGE ID</span>
            <div className="relative inline-block ml-2">
                <span className="text-xs font-light cursor-pointer group">ⓘ
                    <div className="absolute right-0 mt-2 w-64 px-3 py-2 text-xs text-white bg-[#061708] shadow-lg rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                    The XCHANGE ID is provided in the confirmation email provided "after" the asset exchange has been initiated.
                    </div>
                </span>              
            </div>
            <AddressInput
              placeholder="Xchange ID"
              value={localXchangeId}
              onBlur={handleBlur}
              onChange={handleXchangeIdChange}
            />
            {addressError && <p className="text-red-500 text-xs mt-1">{addressError}</p>}
        </div>

        <div className="mb-8">
            <select
                className="select rounded-md mt-2 bg-black w-full text-primary outline-none hover:bg-secondary/5 border-none focus:ring-0"
                value={selectedTokenSymbol}
                onChange={(e) => setSelectedTokenSymbol(e.target.value)}
            >
                <option value="" disabled>
                {supportedTokens.length === 0 ? "-- No Tokens Available --" : "Select Token"}
                </option>
                {supportedTokens
                .filter(t => t.symbol !== "GBDo" && t.symbol !== "GBDx" && t.symbol !== "COPx")
                .map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                    {token.symbol} • {token.name}
                    </option>
                ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5 mt-2"
              placeholder="Enter Amount Offered"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
        </div>
        {/* Confirmation details for counterparty */}
        <div className="mt-6">
        <p className="text-white mb-2 uppercase tracking-wide text-xs font-light">CONFIRMATION DETAILS</p>
        <input
            type="text"
            value={userFirstName}
            onChange={(e) => setUserFirstName(e.target.value)}
            placeholder="First Name"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
        />
        <input
            type="text"
            value={userLastName}
            onChange={(e) => setUserLastName(e.target.value)}
            placeholder="Last Name"
            className="input w-full bg-black mt-2 rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
        />
        <input
            type="email"
            value={userEmail}
            onChange={handleEmailChange}
            placeholder="Email Address"
            className={`input w-full bg-black mt-2 rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5 ${
            emailError ? "border-red-500" : ""
            }`}
        />
        {emailError && (
            <p className="text-red-500 text-xs mt-1">{emailError}</p>
        )}
        </div>
        {/* Sticky-style footer matching modal layout */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 p-4 mt-4 border-t bg-transparent w-full">
            {/* Left side: wallet connect button */}
            <div className="bottom-0 w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
            <RainbowKitCustomConnectButton />
            {!isConnected && (
                <div className="relative inline-block">
                <button
                    onClick={() => setShowWalletNotice(true)}
                    className="w-6 h-6 rounded-full mt-2 bg-white/30 hover:bg-red-200 mb-2 gap-6 flex items-center justify-center"
                    title="Wallet Required"
                >
                    <ExclamationCircleIcon className="w-4 h-4 text-red-600" />
                </button>
                {showWalletNotice && (
                    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/70 border-t border-red-300 shadow-lg p-4 max-h-[40vh] overflow-y-auto animate-slide-up">
                    <div className="flex items-center mb-2">
                        <WalletIcon className="w-6 h-6 text-red-500" />
                        <h2 className="text-lg mt-2 font-semibold text-red-600">WALLET REQUIRED</h2>
                    </div>
                    <p className="text-sm text-black mb-2">
                        Connect your wallet to continue. This ensures secure and personalized access.
                    </p>
                    <div className="flex justify-end">
                        <button
                        onClick={() => setShowWalletNotice(false)}
                        className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                        >
                        Got it
                        </button>
                    </div>
                    </div>
                )}
                </div>
            )}
          </div>
          {/* Footer Buttons */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row justify-center sm:justify-end items-center gap-2">
            {/*currentStep > 1 && (*/}
            <button
                className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
                onClick={onBack}
            >
                Previous
            </button>
            <button
              className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
              onClick={onNext}
              disabled={isDisabled}
              >
              Next
            </button>
          </div>
        </div>
    </div>
  );
}
