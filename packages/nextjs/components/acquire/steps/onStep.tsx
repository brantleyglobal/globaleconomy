import React, { useState, useEffect } from "react";
import { Token } from "~~/components/constants/tokens";
import { WalletConnectButton } from "~~/utils/globalEco/walletConnectButton";
import { WalletIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { getExchangeRates } from "~~/lib/exchangeRates";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

export type Props = {
  supportedTokens: Token[];
  selectedTokenSymbol: string;
  setSelectedTokenSymbol: (symbol: string) => void;
  depositAmount: string;
  setDepositAmount: (amount: string) => void;
  userFirstName: string;
  setUserFirstName: (val: string) => void;
  userLastName: string;
  setUserLastName: (val: string) => void;
  userEmail: string;
  setUserEmail: (val: string) => void;
  connectedWallet: string | undefined;
  onHelpToggle: () => void;
  onNext: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  disabled: boolean;
};

enum ModalStep {
  OnStep = 0,
  DoneStep = 1,
}

export const OnStep: React.FC<Props> = ({
  supportedTokens,
  selectedTokenSymbol,
  setSelectedTokenSymbol,
  depositAmount,
  setDepositAmount,
  connectedWallet,
  onHelpToggle,
  onNext,
  onConfirm,
  isProcessing,
  disabled,
}) => {


  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showWalletNotice, setShowWalletNotice] = useState(false);

  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  const convertedAmount = exchangeRate && depositAmount
  ? (parseFloat(depositAmount) * exchangeRate).toFixed(2)
  : "";

  
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
    depositAmount === "" || selectedTokenSymbol === "";

  useEffect(() => {
    const fetchRate = async () => {
      if (!selectedTokenSymbol) return;

      try {
        const { rates, gbdoRate } = await getExchangeRates();
        const selectedTokenRateObj = rates.find(r => r.symbol === selectedTokenSymbol);

        if (!selectedTokenRateObj) {
          throw new Error(`Exchange rate for token symbol ${selectedTokenSymbol} not found`);
        }

        const tokenRate = selectedTokenRateObj.rate;
        const exchangeRateFloat = tokenRate / gbdoRate;
        setExchangeRate(exchangeRateFloat);
      } catch (err) {
        console.error("Error fetching exchange rate:", err);
        setExchangeRate(null);
      }
    };

    fetchRate();
  }, [selectedTokenSymbol]);

  return (
    <div className="flex flex-col h-full space-y-4">
    {/* Header - separate from background */}
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-light text-primary">GLOBAL DOLLAR PURCHASE</h2>
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
            <option value="" disabled>Select Payment Method</option>
            {supportedTokens
              .filter(t => !["GBDo", "GBDx", "COPx", "GLB", "TGUSA", "TGMX", "BGFFS", "BGFRS"].includes(t.symbol))
              .map(t => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol} • {t.name}
                </option>
              ))}
          </select>
          <p className="text-xs text-justify text-white mt-">
            Includes routing fee of 0.25%. Non-Stablecoin purchases are not based live conversion rates in an effort to protect products on this platform from volatility. Users are encouraged to convert to Stablecoin for investment and energy related product purchases on this platform.
          </p>
        </div>

        <div>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
            placeholder="Enter Spend Amount"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
          />
        </div>
        <div>
          <input
            type="text"
            readOnly
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/30 placeholder:text-white/30 hover:bg-secondary/5"
            placeholder="Converted Amount"
            value={convertedAmount}
          />
          {exchangeRate && (
            <p className="text-xs px-2 text-white/40">
              1 {selectedTokenSymbol} ≈ {exchangeRate.toFixed(4)} GBDo
            </p>
          )}
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
            value={userFirstName}
            placeholder="First Name"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
            onChange={e => setUserFirstName(e.target.value)}
          />
          <input
            type="name"
            value={userLastName}
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
        </div>
      </div>
    </div>
     {/* Wallet connect section and buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 py-4 border-t bg-transparent w-full">
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
          <WalletConnectButton />
          {!connectedWallet && (
            <div className="relative inline-block">
              <button
                onClick={() => setShowWalletNotice(true)}
                className="w-6 h-6 rounded-full bg-white/30 hover:bg-red-200 flex items-center justify-center"
                title="Wallet Required"
              >
                <ExclamationCircleIcon className="w-4 h-4 text-red-600" />
              </button>
              {showWalletNotice && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/70 border-t border-red-300 shadow-lg px-4 max-h-[40vh] overflow-y-auto animate-slide-up">
                  <div className="flex items-center gap-2 mb-4">
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
          <button className="invisible btn btn-primary/15 btn-sm h-8 text-xs rounded-md px-6" aria-hidden="true">
              Previous
          </button>
          <button className="btn btn-primary/15 hover:bg-secondary/30 font-light btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
            onClick={() => {
              console.log("click confirmed")
              onConfirm();
            }}
            disabled={!connectedWallet || isProcessing}
          >
            {isProcessing ? "Processing..." : "CONFIRM"}
          </button>
        </div>
      </div>
    </div>
  );
};

