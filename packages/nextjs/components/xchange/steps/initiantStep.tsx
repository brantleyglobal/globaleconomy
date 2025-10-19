import React, { useState, useEffect, useRef } from "react";
import { AddressInput } from "~~/components/globalEco";
import { supportedTokens, Token } from "~~/components/constants/tokens";
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
  selectedTokenSymbolS: string;
  setSelectedTokenSymbolS: (v: string) => void;
  onHelpToggle: () => void;
  onNext: () => void;
  onBack: () => void;
};

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
  selectedTokenSymbolS,
  setSelectedTokenSymbolS,
  onHelpToggle,
  onNext,
  onBack,
}: Props) {

    const [emailError, setEmailError] = useState("");
    const [addressError, setAddressError] = useState("");
    const [localRecipient, setLocalRecipient] = useState(recipient ?? "");

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
        setLocalRecipient(val);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
        validateAndSetRecipient(val.trim());
        }, 500);
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
    recipient === "" || amount === "" || selectedTokenSymbol === "" || selectedTokenSymbolS === "";

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
                    {supportedTokens.length === 0 ? "-- No Tokens Available --" : "Initiant Token to Deposit"}
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
                    className="input w-full mt-2 bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5 mt-2"
                    placeholder="Enter Amount Offered"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                />
            </div>
            <div>
                <select
                    className="select rounded-md mt-2 bg-black w-full text-primary outline-none hover:bg-secondary/5 border-none focus:ring-0"
                    value={selectedTokenSymbolS}
                    onChange={(e) => setSelectedTokenSymbolS(e.target.value)}
                >
                    <option value="" disabled>
                    {supportedTokens.length === 0 ? "-- No Tokens Available --" : "Service Payment Method"}
                    </option>
                    {supportedTokens
                    .filter(t => t.symbol !== "GBDo" && t.symbol !== "GBDx" && t.symbol !== "GLB" && t.symbol !==  "BGFFS" && t.symbol !== "BGFRS" && t.symbol !== "TGMX" && t.symbol !== "TGUSA" && t.symbol !== "COPx")
                    .map((token) => (
                        <option key={token.symbol} value={token.symbol}>
                        {token.symbol} • {token.name}
                        </option>
                    ))}
                </select>
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
                    className={`input w-full bg-black mt-2 rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5 ${
                    emailError ? "border-red-500" : ""
                    }`}
                />
                {emailError && (
                    <p className="text-red-500 text-xs mt-1">{emailError}</p>
                )}
            </div>
            {/* Sticky Footer Navigation */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 py-4 border-t bg-transparent w-full">
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
    );
}
