import React, { useState, useRef, useEffect } from "react";
import { AddressInput } from "~~/components/globalEco";
import { WalletConnectButton } from "~~/utils/globalEco/walletConnectButton";
import { WalletIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { supportedTokens, Token, dividendTokens } from "~~/components/constants/tokens";
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

function formatMoneyFromDigits(raw: string) {
  // Remove all non‑digits
  const digits = raw.replace(/\D/g, "");

  if (digits === "") return "";

  // Convert to number of cents
  const cents = Number(digits);

  // Convert to dollars with 2 decimals
  const value = (cents / 100).toFixed(2);

  // Add commas
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

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
    const [showStablecoinInfo, setShowStablecoinInfo] = useState(false);
    const getNetwork = (symbol: string, address: string): string => {
        if (symbol === "BTC") return "Bitcoin";
        if (address.startsWith("0x")) {
        // Polygon tokens often share the same address format as Ethereum
        // If you want to manually tag Polygon tokens, you can add a symbol-based override here
        const polygonSymbols = ["ZARP", "BRL1", "JPYC"];
        return polygonSymbols.includes(symbol) ? "Polygon" : "Ethereum";
        }
        return "Unknown";
    };

    const mergedTokens = [
        ...supportedTokens,
        ...dividendTokens.filter(
            dividend => !supportedTokens.some(
            supported => supported.symbol === dividend.symbol
            )
        ),
    ];

    // Ref to hold debounce timer
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (recipient2 !== localRecipient2) {
        setLocalRecipient2(recipient2 ?? "");
        setAddressError("");
        }
    }, [recipient2]);

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

    // Validate and commit address after debounce or blur
    const validateAndSetRecipient = (val: string) => {
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
      // Always update the raw value
      setRecipient2(val);
  
      // If empty, clear error
      if (val === "") {
        setAddressError("");
        return;
      }
  
      // If not long enough yet, mark as incomplete
      if (val.length < 42) {
        setAddressError("Address incomplete");
        return;
      }
  
      // Once length is correct, try to checksum/validate
      try {
        const checksummed = getAddress(val);
        setRecipient2(checksummed);
        setAddressError("");
      } catch {
        setRecipient2(val);
        setAddressError("Invalid Ethereum address");
      }
    };

    // On blur, immediately validate and commit
    const handleFocus = () => {
        isEditingAddress.current = true;
    };

    // On blur, immediately validate and commit
    const handleBlur = () => {
        if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
        }
        validateAndSetRecipient(localRecipient2.trim());
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
        <div className="flex flex-full justify-between items-center mb-4">
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
                {mergedTokens.length === 0 ? "-- No Tokens Available --" : "CounterParty Token to Deposit"}
                </option>
                {mergedTokens
                .filter(t => t.symbol !== "GBDx" && t.symbol !== "COPx")
                .map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                    {token.symbol} • {token.name}
                    </option>
                ))}
            </select>
            {/*<button
                type="button"
                onClick={() => setShowStablecoinInfo(true)}
                className="bg-white/10 animate-pulse backdrop-blur-md w-full mt-2 px-6 py-2 rounded-md text-sm text-white hover:bg-white/20 transition flex items-center gap-2 shadow-md"
            >
                Supported Stablecoin
            </button>*/}
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5 mt-2"
              placeholder="Enter Amount Offered"
              value={amount2}
              onChange={e => {
                const formatted = formatMoneyFromDigits(e.target.value);
                setAmount2(formatted);
              }}
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 px-4 pt-4 mt-4 border-t bg-transparent w-full">
            {/* Left side: wallet connect button */}
            <div className="bottom-0 w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
            <WalletConnectButton />
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
        <SlidePanel
            isOpen={showStablecoinInfo}
            onClose={() => setShowStablecoinInfo(false)}
            title="SUPPORTED STABLECOIN"
            >
            <div className="overflow-hidden max-h-[40vh] rounded-t-xl">
                <div className="overflow-y-auto max-h-[calc(40vh-20px)] px-6 py-4 space-y-4 text-sm text-gray-300">
                {supportedTokens
                    .filter(({ symbol }) => !["BTC", "ETH", "GBDx", "COPx", "GLB", "TGUSA", "TGMX", "CREs", "CREh", "CGRi"].includes(symbol))
                    .map(({ name, symbol, address }) => (
                    <div key={symbol} className="bg-white/5 backdrop-blur-md p-4 rounded-md shadow-sm">
                        <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-300">{name}</span>
                        <span className="text-xs text-gray-400">{symbol}</span>
                        </div>
                        <div className="mt-1 text-xs break-all">
                        <strong>Address:</strong> {address}
                        </div>
                        <div className="text-xs text-gray-400">
                        <strong>Network:</strong> {getNetwork(symbol, address)}
                        </div>
                    </div>
                    ))}
                </div>
            </div>
        </SlidePanel>
    </div>
    );
}

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
      className={`fixed bottom-0 left-0 w-full z-50 bg-black/90 text-white px-6 py-8 transition-transform duration-500 ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-light">{title}</h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 backdrop-blur-md p-2 rounded-full hover:bg-white/20 transition duration-300"
            aria-label="Close panel"
          >
            <svg
              className="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        {/* Render children instead of description */}
        <div>{children}</div>
      </div>
    </div>
  );
}
