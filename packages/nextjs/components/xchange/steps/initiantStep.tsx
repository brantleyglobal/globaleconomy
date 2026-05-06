import React, { useState, useEffect, useRef } from "react";
import { AddressInput } from "~~/components/globalEco";
import { supportedTokens, Token, dividendTokens } from "~~/components/constants/tokens";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { Address } from "viem";
import { getAddress } from "viem";

type AddressType = Address;

type Props = {
  recipient?: string;
  setRecipient: (v: string) => void;
  selectedTokenSymbol: string;
  setSelectedTokenSymbol: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  userFirstName: string;
  setUserFirstName: (v: string) => void;
  userLastName: string;
  setUserLastName: (v: string) => void;
  userEmail: string;
  setUserEmail: (v: string) => void;
  onHelpToggle: () => void;
  onNext: () => void;
  onBack: () => void;
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

export default function InitiantStep({
  recipient,
  setRecipient,
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
  onNext,
  onBack,
}: Props) {

    const [emailError, setEmailError] = useState("");
    const [addressError, setAddressError] = useState("");
    const [localRecipient, setLocalRecipient] = useState(recipient ?? "");
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

    // Sync local input if external `recipient2` changes (except when user is typing)
    useEffect(() => {
        if (recipient !== localRecipient) {
        setLocalRecipient(recipient ?? "");
        setAddressError("");
        }
    }, [recipient]);

    // Validate and commit address after debounce or blur
    const validateAndSetRecipient = (val: string) => {
        try {
        const checksummed = getAddress(val);
        setRecipient(checksummed);
        setAddressError("");
        } catch {
        setRecipient("");
        setAddressError(val === "" ? "" : "Invalid Ethereum address");
        }
    };

    // On input change, update local state and debounce external update
    const handleRecipientChange = (val: string) => {
        // Always update the raw value
        setRecipient(val);

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
            setRecipient(checksummed);
            setAddressError("");
        } catch {
            setRecipient(val);
            setAddressError("Invalid Ethereum address");
        }
    };

    // On blur, immediately validate and commit
    const handleBlur = () => {
        if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
        }
        validateAndSetRecipient(localRecipient.trim());
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

    const isDisabled =
    recipient === "" || amount === "" || selectedTokenSymbol === "";

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-light text-primary">INITIANT DETAILS</h3>
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
                    placeholder="Initiant Address"
                    value={recipient ?? ""}
                    onBlur={handleBlur}
                    onChange={handleRecipientChange}
                />
                {addressError && <p className="text-red-500 text-xs mt-1">{addressError}</p>}
            </div>
            <div>
                <select
                    className="select rounded-md mt-2 bg-black w-full text-primary outline-none hover:bg-secondary/5 border-none focus:ring-0"
                    value={selectedTokenSymbol}
                    onChange={(e) => setSelectedTokenSymbol(e.target.value)}
                >
                    <option value="" disabled>
                    {mergedTokens.length === 0 ? "-- No Tokens Available --" : "Initiant Currency to Deposit"}
                    </option>
                    {mergedTokens
                    .filter(t => t.symbol !== "GBDx" && t.symbol !== "COPx")
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
                    className="input w-full mt-2 bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5 mt-2"
                    placeholder="Enter Amount Offered"
                    value={amount}
                    onChange={e => {
                        const formatted = formatMoneyFromDigits(e.target.value);
                        setAmount(formatted);
                    }}
                />
            </div>
            {/* Confirmation Details */}
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
                    className={`input w-full bg-black mt-2 mb-4 rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5 ${
                    emailError ? "border-red-500" : ""
                    }`}
                />
                {emailError && (
                    <p className="text-red-500 text-xs mt-1">{emailError}</p>
                )}
            </div>
            {/* Sticky Footer Navigation */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4 border-t bg-transparent w-full">
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