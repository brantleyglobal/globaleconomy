import React, { useState, useRef } from "react";
import { AddressInput, RainbowKitCustomConnectButton } from "~~/components/globalEco";
import { WalletIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { supportedTokens, Token } from "~~/components/constants/tokens";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { Address } from "viem";
import { getAddress } from "viem";

type AddressType = Address;

type Props = {
  recipient2?: string;
  setRecipient2: (v: string) => void;
  selectedTokenSymbol2: string;
  setSelectedTokenSymbol2: (v: string) => void;
  amount2: string;
  setAmount2: (v: string) => void;
  userFirstName2: string;
  setUserFirstName2: (v: string) => void;
  userLastName2: string;
  setUserLastName2: (v: string) => void;
  userEmail2: string;
  setUserEmail2: (v: string) => void;
  onHelpToggle: () => void;
  onBack: () => void;
  onNext: () => void;
  isConnected?: boolean;
  isDisabled?: boolean;
};

export default function CounterPartyStep({
  recipient2,
  setRecipient2,
  selectedTokenSymbol2,
  setSelectedTokenSymbol2,
  amount2,
  setAmount2,
  userFirstName2,
  setUserFirstName2,
  userLastName2,
  setUserLastName2,
  userEmail2,
  setUserEmail2,
  onHelpToggle,
  onBack,
  onNext,
  isConnected = false,
  isDisabled = false, 
}: Props) {

    const [showWalletNotice, setShowWalletNotice] = React.useState(false);
    const [emailError, setEmailError] = useState("");
    const [addressError, setAddressError] = useState("");
    const [localRecipient2, setLocalRecipient2] = useState(recipient2 ?? "");
    const isEditingAddress = useRef(false);

    // Ref to hold debounce timer
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Validate and commit address after debounce or blur
    const validateAndSetRecipient2 = (val: string) => {
        try {
        const checksummed = getAddress(val);
        setRecipient2(checksummed);
        setAddressError("");
        } catch {
        setRecipient2("");
        setAddressError(val === "" ? "" : "Invalid Ethereum address");
        }
    };

    // On input change, update local state and debounce external update
    const handleRecipient2Change = (val: string) => {
        setLocalRecipient2(val);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
        validateAndSetRecipient2(val.trim());
        }, 500);
    };

    // On blur, immediately validate and commit
    const handleFocus = () => {
        isEditingAddress.current = true;
    };

    const handleBlur = () => {
        isEditingAddress.current = false;
        validateAndSetRecipient2(localRecipient2.trim());
    };
    
    // Basic email validation regex
    const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
    };

    // Handle input change with validation
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const email = e.target.value;
        setUserEmail2(email);

        if (email === "" || validateEmail(email)) {
            setEmailError(""); // Clear error if empty or valid
        } else {
            setEmailError("Please enter a valid email address");
        }
    };
        
    return (
    <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-light text-primary">COUNTERPARTY DETAILS</h3>
          <button
            onClick={onHelpToggle}
            aria-label="Toggle help"
            className="text-primary hover:text-secondary flex items-center gap-1"
          >
            <HelpOutlineIcon />
            
          </button>
        </div>
        <div>
            <AddressInput
                placeholder="ConterParty Address"
                value={localRecipient2}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onChange={handleRecipient2Change}
            />
            {addressError && <p className="text-red-500 text-xs mt-1">{addressError}</p>}
        </div>
        <div>
            <select
                className="select rounded-md mt-2 bg-black w-full text-primary outline-none hover:bg-secondary/5 border-none focus:ring-0"
                value={selectedTokenSymbol2}
                onChange={(e) => setSelectedTokenSymbol2(e.target.value)}
            >
                <option value="" disabled>
                {supportedTokens.length === 0 ? "-- No Tokens Available --" : "CounterParty Token to Deposit"}
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
              value={amount2}
              onChange={e => setAmount2(e.target.value)}
            />
        </div>
        {/* Confirmation details for counterparty */}
        <div className="mt-6">
            <p className="text-white mb-2 uppercase tracking-wide text-xs font-light">CONFIRMATION DETAILS</p>
            <input
                type="text"
                value={userFirstName2}
                onChange={(e) => setUserFirstName2(e.target.value)}
                placeholder="First Name"
                className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
            />
            <input
                type="text"
                value={userLastName2}
                onChange={(e) => setUserLastName2(e.target.value)}
                placeholder="Last Name"
                className="input w-full bg-black mt-2 rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
            />
            <input
                type="email"
                value={userEmail2}
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
            <div className="w-full sm:w-auto flex flex-col sm:flex-row justify-center sm:justify-end items-center gap-2">
                {/*currentStep > 1 && (*/}
                <button
                    className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
                    onClick={onBack}
                >
                    Previous
                </button>
                {/*})*/}
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
