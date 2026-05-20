import React, { useState, useEffect } from "react";
import { Token } from "~~/components/constants/tokens";
import { WalletConnectButton } from "~~/utils/globalEco/walletConnectButton";
import { parseUnits } from "ethers";
import { WalletIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { getExchangeRates } from "~~/lib/exchangeRates";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useRpcStatus } from "~~/hooks/globalEco/statusRpc";
import { formatAmount } from "~~/components/dashboard/transactions/transactions";

export type Props = {
  supportedTokens: Token[];
  selectedTokenSymbol: string;
  setSelectedTokenSymbol: (symbol: string) => void;
  depositAmount: string;
  setDepositAmount: (amount: string) => void;
  convertedAmount: string;
  setConvertedAmount: (amount: string) => void;
  exchangeRate: string;
  setExchangeRate: (amount: string) => void;
  userFirstName: string;
  setUserFirstName: (val: string) => void;
  userLastName: string;
  setUserLastName: (val: string) => void;
  userEmail: string;
  setUserEmail: (val: string) => void;
  connectedWallet: string | undefined;
  onHelpToggle: () => void;
  onNext: () => void;
  onBack: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  disabled: boolean;
};

enum ModalStep {
  OnStep = 0,
  DoneStep = 1,
}

function formatMoneyFromDigits(raw: string) {
  // Remove all non‑digits
  const digits = raw.replace(/\D/g, "");

  if (digits === "") return "";

  // Convert to number of cents
  const cents = Number(digits);

  // Convert to dollars with 2 decimals
  const value = (cents / 100).toFixed(2);
  const locale = navigator.language || "en-US";

  // Add commas
  return Number(value).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function parseLocalNumber (rawNumber: string, locale: string) {
  const amountToFormat = Intl.NumberFormat(locale).format(1.1);
  const decimal = amountToFormat.charAt(amountToFormat.length - 2);

  const normalized = rawNumber.replace(new RegExp(`[^0-9${decimal}-]`,"g"), "");

  return Number(normalized);
}

export const OnStep: React.FC<Props> = ({
  supportedTokens,
  selectedTokenSymbol,
  setSelectedTokenSymbol,
  depositAmount,
  setDepositAmount,
  convertedAmount,
  setConvertedAmount,
  exchangeRate,
  setExchangeRate,
  connectedWallet,
  onHelpToggle,
  onNext,
  onBack,
  onConfirm,
  isProcessing,
  disabled,
}) => {


  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showWalletNotice, setShowWalletNotice] = useState(false);
  const [showStablecoinInfo, setShowStablecoinInfo] = useState(false);
  const rpcUp = useRpcStatus();
  const getNetwork = (symbol: string, address?: string): string => {
    if (symbol === "BTC") return "Bitcoin";

    if (address && address.startsWith("0x")) {
      // Ethereum-style address
      const polygonSymbols = ["ZARP", "BRL1", "JPYC"];
      if (polygonSymbols.includes(symbol)) {
        return "Polygon";
      }
      return "Ethereum";
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
    depositAmount === "" || selectedTokenSymbol === "";

  useEffect(() => {
    let cancelled = false; // guard against stale responses
    const requestId = Date.now();

    const fetchRate = async () => {
      const symbol = (selectedTokenSymbol || "").toUpperCase();
      if (!symbol) return;

      try {
        const { rates, gbdoRate } = await getExchangeRates();

        // Validate gbdoRate
        const gbdo = Number(gbdoRate);
        if (!isFinite(gbdo) || gbdo <= 0) {
          throw new Error(`Invalid GBDO rate: ${gbdoRate}`);
        }

        // Hardcoded USD prices for volatile tokens (example values)
        const hardcodedUsd: Record<string, number> = {
          WETH: 3000,
          WBNB: 900,
          WBTC: 90000,
        };

        // Build a quick lookup for API rates (assumed USD)
        const apiMap = new Map<string, number>();
        for (const r of rates ?? []) {
          if (r?.symbol) apiMap.set(String(r.symbol).toUpperCase(), Number(r.rate));
        }

        // Resolve tokenRate (USD)
        let tokenRate = hardcodedUsd[symbol];
        if (tokenRate === undefined) {
          const apiRate = apiMap.get(symbol);
          if (!isFinite(apiRate!)) {
            throw new Error(`Exchange rate for token ${symbol} not found or invalid`);
          }
          tokenRate = apiRate!;
        }

        // Compute token → GBDo
        const exchangeRateFloat = tokenRate / gbdo;

        // Extra validation
        if (!isFinite(exchangeRateFloat)) {
          throw new Error(
            `Computed exchange rate is invalid: tokenRate=${tokenRate}, gbdoRate=${gbdo}`
          );
        }

        // Skip if effect has been cancelled (user changed token)
        if (cancelled) return;

        // Keep string handler
        setExchangeRate(exchangeRateFloat.toString());
      } catch (err) {
        console.error("Error fetching exchange rate:", err);
        setExchangeRate("");
      }
    };

    fetchRate();

    return () => {
      // cancel any in-flight response from older selections
      cancelled = true;
    };
  }, [selectedTokenSymbol]);

  // Derive converted amount whenever depositAmount or exchangeRate changes
  useEffect(() => {
    if (!exchangeRate || depositAmount === "") {
      setConvertedAmount("");
      return;
    }

    const rate = formatMoneyFromDigits(exchangeRate);
    const locale = navigator.language || "en-US";
    const amount = (parseLocalNumber(depositAmount, locale) * parseLocalNumber(exchangeRate, locale));
    const converted = formatMoneyFromDigits((amount).toFixed(2)).toString();

    setConvertedAmount(
      converted
    );
    
  }, [depositAmount, exchangeRate]);

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
          <span className="text-xs mb-4 font-light">SELECT PAYMENT METHOD</span>
          <select
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
            value={selectedTokenSymbol}
            onChange={e => setSelectedTokenSymbol(e.target.value)}
          >
            <option value="" disabled>Select Payment Token</option>
            {supportedTokens
              .filter(t => !["GBDo", "GBDx",  "BNB", "MATIC", "UNI", "LINK", "ETH", "COPx", "GLB", "TGUSA", "TGMX", "CREs", "CREh", "CGRi"].includes(t.symbol))
              .map(t => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol} • {t.name}
                </option>
              ))}
          </select>
          <button
              type="button"
              onClick={() => setShowStablecoinInfo(true)}
              className="bg-white/10 animate-pulse backdrop-blur-md px-6 py-2 rounded-md w-full text-sm text-white hover:bg-white/20 transition flex items-center gap-2 shadow-md"
          >
              Supported Stablecoin
          </button>
        </div>

        <div>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
            placeholder="Enter Spend Amount"
            value={depositAmount}
            onChange={e => {
              const formatted = formatMoneyFromDigits(e.target.value);
              setDepositAmount(formatted);
            }}
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
            <p>
              1 {selectedTokenSymbol} ≈ {exchangeRate ? parseFloat(exchangeRate).toFixed(2) : ""} GBDo
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
          {/*{!rpcUp &&(
            <div className="bg-red-500/50 text-white text-xs p-3 rounded mb-3">
              Native currency purchases temporarily unavailable.Please try again later.
            </div>
          )}*/}
          <button
              className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
              onClick={onBack}
          >
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
      <SlidePanel
        isOpen={showStablecoinInfo}
        onClose={() => setShowStablecoinInfo(false)}
        title="SUPPORTED STABLECOIN"
        >
        <div className="overflow-hidden max-h-[40vh] rounded-t-xl">
            <div className="overflow-y-auto max-h-[calc(40vh-20px)] px-6 py-4 space-y-4 text-sm text-gray-300">
            {supportedTokens
                .filter(({ symbol }) => !["GBDo", "LINK", "MATIC", "ETH", "UNI", "BNB", "GBDx", "COPx", "GLB", "TGUSA", "TGMX", "CREs", "CREh", "CGRi"].includes(symbol))
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
