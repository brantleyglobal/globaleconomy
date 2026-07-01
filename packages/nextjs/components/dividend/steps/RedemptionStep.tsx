"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Address as AddressType, getContract, erc20Abi } from "viem";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { BanknotesIcon, WalletIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { WalletConnectButton } from "~~/utils/globalEco/walletConnectButton";
import { Token, dividendTokens, supportedTokens } from "~~/components/constants/tokens";
import { toast } from "react-hot-toast";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useRedemptionHandler } from "~~/components/invest/useRedemptionHandler";
import { sendInvestmentConfirmation } from "~~/components/email/sendRedemptionEmail";

type FaucetProps = {
  openWalletModal?: () => void;
};

interface Summary {
  unlockLabel: string;
  eligibilityLabel: string;
  multiplier: number;
}

type Props = {
  newAddress: string | undefined;
  setNewAddress: (val: string) => void;
  amount: string;
  setAmount: (val: string) => void;
  selectedTokenSymbol: string;
  setSelectedTokenSymbol: (val: string) => void;
  selectedTokenSymbol2: string;
  setSelectedTokenSymbol2: (val: string) => void;
  userFirstName: string;
  setUserFirstName: (val: string) => void;
  userLastName: string;
  setUserLastName: (val: string) => void;
  userEmail: string;
  setUserEmail: (val: string) => void;
  receiptHash: string | "";
  setReceiptHash: (val: string) => void;
  onBack: () => void;
  onNext: () => void;
  onHelpToggle: () => void;
  openWalletModal?: () => void;
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
  const locale = navigator.language || "en-US";

  // Add commas
  return Number(value).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export default function RedemptionStep({
  newAddress,
  setNewAddress,
  amount,
  setAmount,
  selectedTokenSymbol,
  setSelectedTokenSymbol,
  selectedTokenSymbol2,
  setSelectedTokenSymbol2,
  userFirstName,
  setUserFirstName,
  userLastName,
  setUserLastName,
  userEmail,
  setUserEmail,
  receiptHash,
  setReceiptHash,
  onHelpToggle,
  openWalletModal,
  onBack,
  onNext,
  isDisabled = false,
}: Props) {
//export const DividendRedeemModal = ({ openWalletModal }: FaucetProps) => {
  const [step, setStep] = useState(0);
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = chain?.id;

  const promo = "";

  const [autoPay, setAutoPay] = useState(false);

  const [walletTokens, setWalletTokens] = useState<(Token & { balance: bigint })[]>([]);
  const [available, setAvailable] = useState<bigint | undefined>(undefined);
  const [showWalletNotice, setShowWalletNotice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const openRedemptionModal = () => {
    setShowRedemptionModal(true);
  };

  const closeRedemptionModal = () => {
    setShowRedemptionModal(false);
  };

  const [localNewAddress, setLocalNewAddress] = useState(newAddress ?? "");

  // Investment confirmation related state
  const [committedQuarters, setCommittedQuarters] = useState<number>(4); // example default, adjust as needed
  const [summary, setSummary] = useState<Summary | null>(null);
  const [emailError, setEmailError] = useState("");

  const safeAmount = parseFloat(amount);
  const isAmountValid = !isNaN(safeAmount) && isFinite(safeAmount) && safeAmount > 0;
    
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

  const selectedToken = useMemo(
    () => walletTokens.find((t) => t.symbol === selectedTokenSymbol),
    [walletTokens, selectedTokenSymbol]
  );

  const selectedToken2 = supportedTokens.find(
    (token) => token.address === selectedTokenSymbol2
  ) as Token | undefined;

  useEffect(() => {
    if (!address || !publicClient) {
      setWalletTokens([]);
      setSelectedTokenSymbol("");
      return;
    }
    const fetchBalances = async () => {
        try {
          const balances = await Promise.all(
            dividendTokens.map(async (token) => {
              let balance: bigint = 0n;
              if (token.isNative) {
                balance = await publicClient.getBalance({ address });
              } else {
                const contract = getContract({ address: token.address, abi: erc20Abi, client: publicClient });
                balance = await contract.read.balanceOf([address]);
              }
              return { ...token,
                chain: token.chain as "global" | "ethereum" | "polygon" | "bitcoin",
                balance,
              };
            })
          );
          const tokensWithBalance = balances.filter((token) => token.balance > 0n);
          setWalletTokens(tokensWithBalance);
          if (tokensWithBalance.length > 0) {
            setSelectedTokenSymbol(tokensWithBalance[0].symbol);
          } else {
            setSelectedTokenSymbol("");
          }
        } catch (error) {
          console.error("Failed to fetch token balances:", error);
          setWalletTokens([]);
          setSelectedTokenSymbol("");
        }
      };
      fetchBalances();
    }, [address, publicClient]);

  const { send } = useRedemptionHandler({
    sender: address,
    chainId,
    selectedToken,
    selectedToken2,
    available,
    signature: "",
    openWalletModal,
    newAddress,
    autoPay,   // ← add this
  });

  // Handle send click and after redemption successfully send investment confirmation email
  const handleSendClick = async () => {
    if (!address) {
      toast.error("Missing required fields.");
      return;
    }
    setIsProcessing(true);
    const toastId = toast.loading("Processing claim...");
    try {
      const result = await send();
      if (!result?.success) {
        toast.error(`Transfer failed: ${result?.error || "Unknown error"}`, { id: toastId });
      } else {
        toast.success("Transfer successful!", { id: toastId });

        const receipt = result?.txHash || "";
        if (!summary) {
          toast.error("Summary info not available.");
          return;
        }

        if (receipt) {
          setReceiptHash(receipt);
        }

        const { unlockLabel, eligibilityLabel, multiplier } = summary;

        // Call investment email confirmation after successful redemption
        if (selectedToken) {
          await sendInvestmentConfirmation({
            templateType: "redemption",
            userFirstName,
            userLastName,
            userEmail,
            connectedWallet: address,
            tokenSymbol: selectedToken.symbol,
            tokenSymbol2: selectedToken2?.address || newAddress || "",
            newAddress: "",
            amount,
            receipt,
          });
          toast.success("Investment confirmation email sent.");
        }
      }
    } catch (error: any) {
      toast.error(`Transfer failed: ${error?.message || "Unknown error"}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const isRedemptionDisabled = 
    !amount || 
    !isAmountValid || 
    !address || 
    !chainId ||
    !selectedToken || 
    !selectedToken2 || 
    isProcessing

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-light text-primary">REDEMPTION PROCESS</h3>
        <button
          onClick={onHelpToggle}
          aria-label="Toggle help"
          className="text-primary hover:text-secondary flex items-center gap-1"
        >
          <HelpOutlineIcon />
          
        </button>
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <span className="text-xs mb-4 font-light">SELECT DIVIDEND OR VENTURE TOKEN</span>
          <select
            className="select rounded-md bg-black w-full mt-2 text-info-600 mb-4 outline-none hover:bg-secondary/5 border-none focus:ring-0 focus:outline-none"
            value={selectedTokenSymbol}
            onChange={(e) => {
              setSelectedTokenSymbol(e.target.value);
            }}
          >
            <option value="" disabled>Select Dividend or Venture Token</option>
            {dividendTokens
            .filter(t => !["GBDx", "COPx", "GLB", "TGUSA", "TGMX", "CREs", "CREh"].includes(t.symbol))
            .map(t => (
              <option key={t.symbol} value={t.symbol}>
                {t.symbol} • {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <span className="text-xs mb-4 font-light">SELECT PAYOUT TOKEN</span>
          <select
            className="select rounded-md bg-black w-full mt-2 text-info-600 mb-4 outline-none hover:bg-secondary/5 border-none focus:ring-0 focus:outline-none"
            value={selectedTokenSymbol2}
            onChange={(e) => {
              setSelectedTokenSymbol2(e.target.value);
            }}
          >
            <option value="" disabled>Select Payout Token</option>
            {supportedTokens
            .filter(t => !["GBDx", "COPx", "GLB", "TGUSA", "TGMX", "CREs", "CREh", "AUDD", "AUDT", "BRZ", "MMXN", "NGNT", "INRX", "TRYX", "ZARP"].includes(t.symbol))
            .map(t => (
              <option key={t.symbol} value={t.symbol}>
                {t.symbol} • {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="text-xs mb-4 font-light">ENTER AMOUNT TO BE REDEEMED</span>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
            placeholder="Enter Redemption Amount"
            value={amount}
            onChange={e => {
              const formatted = formatMoneyFromDigits(e.target.value);
              setAmount(formatted);
            }}
          />

        </div>
        <div className="flex justify-between px-2 mt-10 mb-12">
          <div>
            <span className="text-xs font-light">BALANCE </span>{" "}
            <span className="text-base font-light">
              {selectedToken && selectedToken.balance !== undefined && selectedToken.balance > 0n
                ? (Number(selectedToken.balance) / 10 ** (selectedToken.decimals ?? 18)).toFixed(2)
                : " --"}
            </span>
          </div>
          {/*<div className="flex flex-col gap-2">
            <div>
              <span className="text-xs font-light">CREDIT </span>{" "}
              <span className="text-base font-light">
                {cavailable !== undefined && cavailable > 0n
                  ? (Number(cavailable) / 10 ** (selectedToken?.decimals ?? 18)).toFixed(2)
                  : " --"}
              </span>
            </div>
          </div>*/}
        </div>

        {/* AutoPay Seelection */}
        <div className="flex items-center justify-between mt-6 mb-4 px-1">
          <span className="text-xs font-light text-white/80 tracking-wide">
            ENABLE/DISABLE AUTO‑PAY FOR FUTURE WITHDRAWALS
          </span>

          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoPay}
              onChange={() => setAutoPay(!autoPay)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:bg-secondary transition-all"></div>
            <div className="absolute w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-5 transition-all"></div>
          </label>
        </div>

        <div className="">
          <p className="text-white mb-2 mt-10 uppercase tracking-wide text-xs font-light">CONFIRMATION DETAILS</p>
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
        {/* Wallet connect section and buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 py-4 border-t bg-transparent w-full">
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
            <WalletConnectButton />
            {!address && (
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
              className="btn bg-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
              onClick={handleSendClick}
              disabled={isRedemptionDisabled}
            >
              {isProcessing ? (
                "Processing..."
              ) : (
                <BanknotesIcon className="h-5 w-4 shrink-0" />
              )}
              {isProcessing ? "Processing..." : "PROCESS"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
