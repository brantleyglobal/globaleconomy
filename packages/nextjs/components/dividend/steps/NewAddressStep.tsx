"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Address as AddressType, getContract, erc20Abi } from "viem";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { BanknotesIcon, WalletIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { WalletConnectButton } from "~~/utils/globalEco/walletConnectButton";
import { Token, dividendTokens, supportedTokens } from "~~/components/constants/tokens";
import { toast } from "react-hot-toast";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useRedemptionHandler } from "~~/components/invest/useRedemptionHandler";
import { sendInvestmentConfirmation } from "~~/components/email/sendRedemptionEmail";
import { AddressInput } from "~~/components/globalEco";
import { getAddress } from "viem";

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
  selectedTokenSymbol: string;
  setSelectedTokenSymbol: (val: string) => void;
  userFirstName: string;
  setUserFirstName: (val: string) => void;
  userLastName: string;
  setUserLastName: (val: string) => void;
  userEmail: string;
  setUserEmail: (val: string) => void;
  onBack: () => void;
  onNext: () => void;
  onHelpToggle: () => void;
  openWalletModal?: () => void;
  isDisabled?: boolean;
};

export default function AddressStep({
  newAddress,
  setNewAddress,
  selectedTokenSymbol,
  setSelectedTokenSymbol,
  userFirstName,
  setUserFirstName,
  userLastName,
  setUserLastName,
  userEmail,
  setUserEmail,
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
  const [addressError, setAddressError] = useState("");
  const chainId = chain?.id;

  const [localNewAddress, setLocalNewAddress] = useState(newAddress ?? "");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const promo = "";

  const [autoPay, setAutoPay] = useState(false);

  const [walletTokens, setWalletTokens] = useState<(Token & { balance: bigint })[]>([]);
  const [recipient, setRecipient] = useState<AddressType>();
  const [available, setAvailable] = useState<bigint | undefined>(undefined);
  const [cavailable, setCAvailable] = useState<bigint | undefined>(undefined);
  const [unlockDate, setUnlockDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showWalletNotice, setShowWalletNotice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Investment confirmation related state
  const [committedQuarters, setCommittedQuarters] = useState<number>(4); // example default, adjust as needed
  const [summary, setSummary] = useState<Summary | null>(null);
  const [emailError, setEmailError] = useState("");
    
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

  const validateAndSetAddress = (val: string) => {
    try {
      const checksummed = getAddress(val);
      setNewAddress(checksummed);
      setAddressError("");
    } catch {
      setNewAddress("");
      setAddressError(val === "" ? "" : "Invalid Ethereum address");
    }
  };

  // Handle input change with debounce
  const handleAddressChange = (val: string) => {
    setNewAddress(val);
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
    validateAndSetAddress(localNewAddress.trim());
  };

  const stepLabels = ["Redemption Details", "Done"];

  const selectedToken = useMemo(
    () => walletTokens.find((t) => t.symbol === selectedTokenSymbol),
    [walletTokens, selectedTokenSymbol]
  );

  const selectedToken2 = useMemo(
    () => supportedTokens.find((t) => t.symbol === selectedTokenSymbol),
    [supportedTokens, selectedTokenSymbol]
  );

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
    autoPay,
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

        const { unlockLabel, eligibilityLabel, multiplier } = summary;

        // Call investment email confirmation after successful redemption
        if (selectedToken) {
          await sendInvestmentConfirmation({
            templateType: "walletchange",
            userFirstName,
            userLastName,
            userEmail,
            connectedWallet: address,
            tokenSymbol: selectedToken.symbol,
            tokenSymbol2: selectedToken2?.address || newAddress || "",
            newAddress: newAddress!,
            amount: "",
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
    !address || 
    !chainId ||
    !selectedToken || 
    !newAddress || 
    isProcessing

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-light text-primary">WALLET ADDRESS CHANGE</h3>
        <button
          onClick={onHelpToggle}
          aria-label="Toggle help"
          className="text-primary hover:text-secondary flex items-center gap-1"
        >
          <HelpOutlineIcon />
          
        </button>
      </div>
      <div className="space-y-1 mt-4">
        <span className="text-xs mb-4 font-light">SELECT TOKEN CONTRACT</span>
        <select
          className="select rounded-md bg-black w-full mt-2 text-info-600 mb-4 outline-none hover:bg-secondary/5 border-none focus:ring-0 focus:outline-none"
          value={selectedTokenSymbol}
          onChange={(e) => {
            setSelectedTokenSymbol(e.target.value);
          }}
        >
          <option value="" disabled>Select Contract Token</option>
          {dividendTokens
          .filter(t => !["GBDx", "COPx", "GLB", "TGUSA", "TGMX", "CREs", "CREh"].includes(t.symbol))
          .map(t => (
            <option key={t.symbol} value={t.symbol}>
              {t.symbol} • {t.name}
            </option>
          ))}
        </select>
        <span className="text-xs font-light">NEW PAYOUT WALLET ADDRESS</span>
        <div className="relative inline-block ml-2">
          <span className="text-xs font-light cursor-pointer group">ⓘ
              <div className="absolute right-0 mt-2 w-64 px-3 py-2 text-xs text-white bg-[#061708] shadow-lg rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
              This new Wallet Address will be used for all future payouts unless altered. The can only change your address from the current Wallet Address on currently on file.
              </div>
          </span>              
        </div>
        <AddressInput
          placeholder="Enter Wallet Address"
          value={localNewAddress}
          onBlur={handleBlur}
          onChange={handleAddressChange}
        />
        {addressError && <p className="text-red-500 text-xs mt-1">{addressError}</p>}
      </div>

      {/* AutoPay Seelection */}
      <div className="flex items-center justify-between mt-6 mb-4 px-1">
        <span className="text-xs font-light text-white/80 tracking-wide">
          ENABLE AUTO‑PAY FOR FUTURE WITHDRAWALS
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
      {/* Amount and Recipient inputs can be added here if needed */}
      <div className="flex flex-col sm:flex-row relative justify-between items-center gap-4 mt-6 pt-4 border-t w-full">
        <div className="flex flex-col items-start sm:flex-row sm:items-center w-full sm:gap-2">
          <WalletConnectButton />
          {!address && (
            <>
              <button
                onClick={() => setShowWalletNotice(true)}
                className="w-6 h-6 rounded-full bg-white/40 hover:bg-red-200 flex items-center justify-center ml-2"
                title="Wallet Required"
              >
                <ExclamationCircleIcon className="w-4 h-4 text-red-600" />
              </button>
              {showWalletNotice && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/70 border-t border-red-300 shadow-lg p-4 max-h-[40vh] overflow-y-auto animate-slide-up">
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
            </>
          )}
        </div>
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
  );
};