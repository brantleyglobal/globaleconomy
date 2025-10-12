"use client";

import React, { useEffect, useState } from "react";
import { Address as AddressType, getContract } from "viem";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import {
  Address,
  AddressInput,
  RainbowKitCustomConnectButton,
} from "~~/components/globalEco";
import { supportedTokens, Token } from "~~/components/constants/tokens";
import { erc20Abi } from "viem";
import { TransferSummary } from "~~/components/globalEco/transferSummary";
import { toast } from "react-hot-toast";
import { useTransferHandler } from "~~/components/transfer/useTransferHandler";
import { WalletIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { sendTransferConfirmation } from "~~/components/email/sendTransferEmail";
import { getAddress } from "viem";

type FaucetProps = {
  openWalletModal?: () => void;
};

export const Faucet = ({ openWalletModal }: FaucetProps) => {
  const [step, setStep] = useState(0);
  const [recipient, setRecipient] = useState<AddressType>();
  const [amount, setAmount] = useState("");
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
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

  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string>("");
  const [available, setAvailable] = useState<bigint | undefined>(undefined);

  const [loading, setLoading] = useState(false);

  const selectedToken = supportedTokens.find(t => t.symbol === selectedTokenSymbol);
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = chain?.id;
  const safeAmount = parseFloat(amount);
  const isAmountValid = !isNaN(safeAmount) && isFinite(safeAmount) && safeAmount > 0;

  const { send } = useTransferHandler({
    sender: address,
    chainId,
    selectedToken,
    available,
    signature: "",
    openWalletModal,
    setRecipient,
    setSendValue: setAmount,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [txResult, setTxResult] = useState<any>(null);

  const handleSendClick = async () => {
    if (!recipient || !amount || !address) {
      toast.error("Missing required fields.");
      return;
    }
    setIsProcessing(true);
    try {
      const result = await send(recipient, amount);
      setTxResult(result);  // Save the tx result for further processing

      if (!result?.success) {
        toast.error(`Transfer failed: ${result?.error || "Unknown error"}`);
        return;
      }

      console.log("Transfer successful!");

      await sendTransferConfirmation({
        templateType: "transfer",
        userFirstName,
        userLastName,
        userEmail,
        connectedWallet: address,
        tokenSymbol: selectedToken?.symbol ?? "unknown",
        amount,
        recipient,
        receipt: result.txHash || "",  // Use the actual tx hash from result
      });
      toast.success("Investment confirmation email sent.");
    } catch (error: any) {
      toast.error(`Transfer failed: ${error?.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchBalance = async () => {
      if (!walletClient || !address || !chainId || !selectedToken) return;

      try {
        const balance = selectedToken.isNative
          ? await publicClient?.getBalance({ address })
          : await getContract({
              address: selectedToken.address as AddressType,
              abi: erc20Abi,
              client: walletClient,
            }).read.balanceOf([address]);

        if (isMounted && balance !== undefined) {
          setAvailable(balance);
        }
      } catch {
        if (isMounted) {
          toast.error("Failed to fetch balance.");
          setAvailable(0n);
        }
      }
    };

    fetchBalance();

    return () => {
      isMounted = false;
    };
  }, [walletClient, address, chainId, selectedToken, publicClient]);

  useEffect(() => {
    setLoading(!recipient || !amount || !address);
  }, [recipient, amount, address]);

  const isValidAmount = (value: string): boolean => {
  const num = parseFloat(value);
    return !isNaN(num) && isFinite(num) && num > 0;
  };

  const [addressError, setAddressError] = useState("");

  const handleRecipientChange = (val: string) => {
    try {
      const checksummed = getAddress(val);
      setRecipient(checksummed);
      setAddressError("");
    } catch {
      setRecipient(undefined);
      setAddressError(val === "" ? "" : "Invalid Ethereum address");
    }
  };

  const [showWalletNotice, setShowWalletNotice] = useState(false);
  const stepLabels = ["Transfer Details", "Done"];

  return (
    <div>
      <div className="overflow-x-auto whitespace-nowrap text-xs mt-2 px-2 p-4 scrollbar-hide">
        <div className="inline-flex gap-4">
          {stepLabels.map((label, index) => (
            <span
              key={label}
              className={`min-w-[80px] text-center block ${
                step === index ? "text-secondary/90 font-medium" : "text-gray-500"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
      {step === 0 && (
      <>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
            <h3 className="text-xl font-light text-primary">ASSET TRANSFER</h3>
            <p className="text-xs text-gray-400">Securely move your assets</p>
          </div>
          {/*<Toaster toastOptions={{ style: { zIndex: 9999 } }} />*/}

          {/* Token Selector */}
          <div className="space-y-1">
            <select
              className="select rounded-md bg-black w-full text-primary mt-2 outline-none hover:bg-secondary/5 border-none focus:ring-0 focus:outline-none"
              value={selectedTokenSymbol}
              onChange={e => setSelectedTokenSymbol(e.target.value)}
            >
              <option value="" disabled>Select Token to Transfer</option>
              {supportedTokens
                .filter(t => t.symbol !== "GBDo" && t.symbol !== "GBDx" && t.symbol !== "COPx")
                .map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                    {token.symbol} • {token.name}
                    </option>
              ))}
            </select>
          </div>

          {/* Inputs */}
          <AddressInput
            placeholder="Recipient Address"
            value={recipient ?? ""}
            onChange={handleRecipientChange}
          />
          {addressError && <p className="text-red-500 text-xs mt-1">{addressError}</p>}
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
            placeholder="Enter Amount to Invest"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />

          {/* Summary */}
          {selectedToken && (
            <TransferSummary
              from={address as `0x${string}`}
              to={recipient as `0x${string}`}
              token={selectedToken}
              amount={amount}
            />
          )}

          {/* Address & Balance */}
          <div className="flex justify-between mb-4 px-2">
            <div>
              <span className="text-xs font-light">FROM</span>{" "}
              {isConnected && address ? (
                <Address address={address} onlyEnsOrAddress />
              ) : (
                <span className="text-sm ml-1">--</span>
              )}
            </div>
            <div>
              <span className="text-xs font-light">AVAILABLE</span>{" "}
              <span className="text-base font-light">
                {selectedToken && available !== undefined && available > 0n
                  ? (Number(available) / 10 ** selectedToken.decimals).toFixed(2)
                  : " --"}
              </span>
              {selectedToken && (
                <span className="text-xs text-gray-500">{selectedToken.symbol}</span>
              )}
            </div>
          </div>

          {/* Confirmation details for counterparty */}
          <div className="">
            <p className="text-white mb-2 mt-8 uppercase tracking-wide text-xs font-light">CONFIRMATION DETAILS</p>
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

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row relative justify-between items-center gap-4 mt-10 pt-4 border-t w-full">
            <div className="flex flex-col items-start sm:flex-row sm:items-center w-full sm:gap-2">
              <RainbowKitCustomConnectButton />
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
            <button
              className="btn bg-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
              onClick={async () => {
                await handleSendClick();   // Your existing send logic
                // on success:
                setStep(1);
              }}
              disabled={!amount || !isValidAmount(amount) || !address || !chainId || !recipient || isProcessing}
            >
              {isProcessing ? (
                <span className="loading loading-spinner loading-sm">Processing...</span>
              ) : (
                <BanknotesIcon className="h-5 w-4 shrink-0" />
              )}
              {isProcessing ? "Processing..." : "CONFIRM"}
            </button>
          </div>
        </div>
      </>
      )}
      {step === 1 && (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 bg-white/5 rounded-lg shadow-md text-center overflow-y-auto">
          <h3 className="text-xl font-light text-primary mb-4">TRANSFER COMPLETE</h3>
          <p className="text-gray-700 mb-2">
            View Transaction Details The Dashboard.
          </p>
          <a
            href="/dashboard"
            className="inline-block mt-4 px-5 py-2 bg-white/15 text-white font-medium rounded hover:bg-secondary/30 transition"
          >
            Go to Dashboard
          </a>
        </div>
      )}
    </div>
  );
};
