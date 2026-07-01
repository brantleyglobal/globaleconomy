import React, { useState } from "react";
import { Token } from "~~/components/constants/tokens";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useRpcStatus } from "~~/hooks/globalEco/statusRpc";

export type Props = {
  supportedTokens: Token[];
  selectedTokenSymbol: string;
  setSelectedTokenSymbol: (symbol: string) => void;
  selectedQuarter: number;
  setSelectedQuarter: (q: number) => void;
  depositAmount: string;
  setDepositAmount: (amount: string) => void;
  userFirstName: string;
  setUserFirstName: (val: string) => void;
  userLastName: string;
  setUserLastName: (val: string) => void;
  userEmail: string;
  setUserEmail: (val: string) => void;
  userPromo: string;
  setUserPromo: (val: string) => void;
  onHelpToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
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

export const TermStep: React.FC<Props> = ({
  supportedTokens,
  selectedTokenSymbol,
  setSelectedTokenSymbol,
  selectedQuarter,
  setSelectedQuarter,
  depositAmount,
  setDepositAmount,
  onHelpToggle,
  onNext,
  onPrevious,
}) => {

  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPromo, setUserPromo] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showStablecoinInfo, setShowStablecoinInfo] = useState(false);
  const rpcUp = useRpcStatus();
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
    selectedQuarter === 0 || depositAmount === "" || selectedTokenSymbol === "";

  return (
    <div className="flex flex-col flex-full h-full">
    {/* Header - separate from background */}
    <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-light text-primary">INVESTMENT DETAILS</h2>
        <button
          onClick={onHelpToggle}
          aria-label="Toggle help"
          className="text-primary hover:text-secondary flex items-center gap-1"
        >
          <HelpOutlineIcon />
          
        </button>
    </div>
    <div className="flex flex-col justify-between h-full rounded-xl">     
      <div className="space-y-4">
        <div>
          <select
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
            value={selectedTokenSymbol}
            onChange={e => setSelectedTokenSymbol(e.target.value)}
          >
            <option value="" disabled>Select Deposit Method</option>
            {supportedTokens
              .filter(t => rpcUp || t.chain !== "global")   // Chain Status to Remove Native Transfers
              .filter(t => !["WBTC", "cbBTC", "ETH", "LINK", "UNI", "MATIC", "BRZ", "MMXN", "AUDD", "AUDT", "NGNT", "COPx", "GLB", "TGUSA", "TGMX", "CREs", "CREh", "CGRi"].includes(t.symbol))
              .map(t => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol} • {t.name}
                </option>
              ))}
          </select>
          <p className="text-xs text-justify text-white mt-">
            Includes routing fee of 0.25%.
          </p>
          <button
              type="button"
              onClick={() => setShowStablecoinInfo(true)}
              className="bg-white/10 animate-pulse backdrop-blur-md px-6 py-2 rounded-md w-full text-sm text-white hover:bg-white/20 transition flex items-center gap-2 shadow-md"
          >
              Supported Stablecoin
          </button>
        </div>

        <div>
          <select
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
            value={selectedQuarter || ""}
            onChange={e => setSelectedQuarter(Number(e.target.value))}
          >
            <option value="">Select Investment Duration | Number of Quarters</option>
            {[2, 3, 4, 5, 6, 7, 8].map(q => (
              <option key={q} value={q}>
                {q} Quarter{q > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
            placeholder="Enter Amount"
            value={depositAmount}
            onChange={e => {
              const formatted = formatMoneyFromDigits(e.target.value);
              setDepositAmount(formatted);
            }}
          />
        </div>
        {/* Email inputs */}
        <div className="mt-12">
          <p className="text-white/50 uppercase tracking-wide text-xs font-semibold">
            EMAIL FOR CONFIRMATION
          </p>
        </div>
        <div className="space-y-4">
          <input
            type="name"
            placeholder="First Name"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
            onChange={e => setUserFirstName(e.target.value)}
          />
          <input
            type="name"
            placeholder="Last Name"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
            onChange={e => setUserLastName(e.target.value)}
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
          {/*<input
            type="promo"
            value={userPromo}
            onChange={e => setUserPromo(e.target.value)}
            placeholder="Promo Code"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
          />*/}
        </div>
      </div>
    </div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4 border-t bg-transparent w-full">
        <button
          className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
          onClick={onPrevious}
        >
          Previous
        </button>
        <button
          className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
          disabled={isDisabled}
          onClick={onNext}
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
                .filter(({ symbol }) => !["GBDo", "BNB", "MATIC", "UNI", "LINK", "ETH", "GBDx", "COPx", "GLB", "TGUSA", "TGMX", "CREs", "CREh", "CGRi"].includes(symbol))
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
};

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

