"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Address as AddressType, getContract } from "viem";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { BanknotesIcon, WalletIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/globalEco";
import { Token, dividendTokens } from "~~/components/constants/tokens";
import { ethers, Contract } from "ethers";
import { erc20Abi } from "viem";
import smartVaultabi from "~~/lib/contracts/abi/SmartVault.json";
import { toast } from "react-hot-toast";
import deployments from "~~/lib/contracts/deployments.json";
import { useRedemptionHandler } from "~~/components/invest/useRedemptionHandler";
import { sendInvestmentConfirmation } from "~~/components/email/sendInvestmentEmail";

type FaucetProps = {
  openWalletModal?: () => void;
};

interface Summary {
  unlockLabel: string;
  eligibilityLabel: string;
  multiplier: number;
}

export const DividendRedeemModal = ({ openWalletModal }: FaucetProps) => {
  const [step, setStep] = useState(0);
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = chain?.id;

  const [walletTokens, setWalletTokens] = useState<(Token & { balance: bigint })[]>([]);
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string>("");
  const [amount, setAmount] = useState("");
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

  const safeAmount = parseFloat(amount);
  const isAmountValid = !isNaN(safeAmount) && isFinite(safeAmount) && safeAmount > 0;

  const selectedToken = useMemo(
    () => walletTokens.find((t) => t.symbol === selectedTokenSymbol),
    [walletTokens, selectedTokenSymbol]
  );

  const { send } = useRedemptionHandler({
    sender: address,
    chainId,
    selectedToken,
    available,
    signature: "",
    openWalletModal,
  });

  // Fetch balances on address or client change
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
            return { ...token, balance };
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

  // Fetch credit from SmartVault
  useEffect(() => {
    if (!walletClient || !address || !chainId || !selectedToken) {
      setCAvailable(undefined);
      return;
    }
    const fetchCredit = async () => {
      try {
        if (!publicClient) {
          // handle undefined client, e.g., show error or skip
          return;
        }
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const signerAddress = await signer.getAddress();
        const stablecoinContract = new Contract(selectedToken.address, erc20Abi, signer);
        const tokenBalance = await stablecoinContract.balanceOf(signerAddress);

        const credit = await publicClient.readContract({
          address: deployments.SmartVault,
          abi: smartVaultabi.abi,
          functionName: "toDate",
          args: [selectedToken.address, tokenBalance],
        });
        setCAvailable(typeof credit === "bigint" ? credit : undefined);
      } catch (e) {
        toast.error("Failed to fetch credit.");
        setCAvailable(undefined);
      }
    };
    fetchCredit();
  }, [walletClient, address, chainId, selectedToken, publicClient]);

  // Enable/disable form submit based on validations
  useEffect(() => {
    setLoading(!recipient || !amount || !address || !selectedToken || !isAmountValid);
  }, [recipient, amount, address, selectedToken, isAmountValid]);

  // Compute summary for investment confirmation - example
  useEffect(() => {
    if (!amount || !committedQuarters) {
      setSummary(null);
      return;
    }
    // Replace with your actual logic to compute these values
    const unlockLabel = "Q4 2025";
    const eligibilityLabel = "Q3 2025";
    const multiplier = committedQuarters >= 6 ? 200 : committedQuarters >= 4 ? 150 : 125;
    setSummary({ unlockLabel, eligibilityLabel, multiplier });
  }, [amount, committedQuarters]);

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
            templateType: "redemption",
            userFirstName,
            userLastName,
            userEmail,
            connectedWallet: address,
            tokenSymbol: selectedToken.symbol,
            tokenSymbol2: "",
            amount,
            committedQuarters,
            unlockLabel,
            eligibilityLabel,
            multiplier,
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

  const stepLabels = ["Redemption Details", "Done"];

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
                <h3 className="text-xl font-light text-primary">INVESTMENT REDEMPTION</h3>
                <p className="text-xs text-gray-400">Returning what belongs</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs mb-4 font-light">SELECT DIVIDEND TOKEN</span>
              <select
                className="select rounded-md bg-black w-full mt-2 text-info-600 mb-4 outline-none hover:bg-secondary/5 border-none focus:ring-0 focus:outline-none"
                value={selectedTokenSymbol}
                onChange={(e) => {
                  setSelectedTokenSymbol(e.target.value);
                }}
              >
                <option value="" disabled>
                  {walletTokens.length === 0 ? "-- No Tokens Available --" : "Select Token"}
                </option>
                {walletTokens.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol} • {token.displayName || token.name}
                  </option>
                ))}
              </select>
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
              <div className="flex flex-col gap-2">
                <div>
                  <span className="text-xs font-light">CREDIT </span>{" "}
                  <span className="text-base font-light">
                    {cavailable !== undefined && cavailable > 0n
                      ? (Number(cavailable) / 10 ** (selectedToken?.decimals ?? 18)).toFixed(2)
                      : " --"}
                  </span>
                </div>
              </div>
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
                onClick={handleSendClick}
                disabled={!amount || !isAmountValid || !address || !chainId || !recipient || !selectedToken || isProcessing}
              >
                {isProcessing ? (
                  "Processing..."
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
