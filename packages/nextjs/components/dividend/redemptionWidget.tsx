"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Address as AddressType, getContract, erc20Abi } from "viem";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { BanknotesIcon, WalletIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { WalletConnectButton } from "~~/utils/globalEco/walletConnectButton";
import { Token, dividendTokens } from "~~/components/constants/tokens";
import { ethers, Contract, BrowserProvider } from "ethers";
import smartVaultabi from "~~/lib/contracts/abi/SmartVault.json";
import { toast } from "react-hot-toast";
import deployments from "~~/lib/contracts/deployments.json";
import SelectionStep from "~~/components/dividend/steps/selectionStep";
import AddressStep from "~~/components/dividend/steps/NewAddressStep";
import RedemptionStep from "~~/components/dividend/steps/RedemptionStep";
import HelpStep from "~~/components/dividend/steps/helpStep";
import { useRedemptionHandler } from "~~/components/invest/useRedemptionHandler";
import { sendInvestmentConfirmation } from "~~/components/email/sendInvestmentEmail";
import { DoneStep } from "../xchange/steps/doneStep";

type FaucetProps = {
  isOpen: boolean;
  onClose: () => void;
  openWalletModal?: () => void;
};

interface Summary {
  unlockLabel: string;
  eligibilityLabel: string;
  multiplier: number;
}

enum ModalStep {
  SelectionStep = 0,
  AddressStep = 1,
  RedemptionStep = 2,
  Complete = 3,
}

export const DividendRedeemModal = ({ isOpen, onClose, openWalletModal }: FaucetProps) => {
  //const [step, setStep] = useState(0);
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = chain?.id;

  const promo = "";

  const [step, setStep] = useState<ModalStep>(ModalStep.SelectionStep);
  const [isHelpMode, setIsHelpMode] = useState(false);

  // Ref to remember the step from which help was opened
  const [savedStep, setSavedStep] = useState<ModalStep | null>(null);
  const [userAction, setUserAction] = useState<"addressChange" | "redemption" | null>(null);
  
  const [autoPay, setAutoPay] = useState(false);

  const [newAddress, setNewAddress] = useState<AddressType | undefined>(undefined);
  
  const [isNewAddressSelected, setIsNewAddressSelected] = useState(false);
  const [isRedemptionSelected, setIsRedemptionSelected] = useState(false);

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

  /*const { send } = useRedemptionHandler({
    sender: address,
    chainId,
    selectedToken,
    available,
    signature: "",
    openWalletModal,
    newAddress,
    autoPay,   // ← add this
  });*/

  const isNewAddressDisabled =
    !newAddress

  const isRedemptionDisabled = 
    !amount || 
    !isAmountValid || 
    !address || 
    !chainId ||
    !recipient || 
    !selectedToken || 
    isProcessing


  function toggleHelp() {
    if (!isHelpMode) {
      setSavedStep(step);  // Save current step into state
      setIsHelpMode(true);
    } else {
      setIsHelpMode(false);
      if (savedStep !== null) {
        setStep(savedStep); // Restore saved step from state
        setSavedStep(null); // Clear saved state
      }
    }
  }

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
        const provider = new BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
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
  /*const handleSendClick = async () => {
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
            promo,
          });
          toast.success("Investment confirmation email sent.");
        }
      }
    } catch (error: any) {
      toast.error(`Transfer failed: ${error?.message || "Unknown error"}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };*/

  const stepLabels = ["Address Change", "Redemption Details", "Done"];

  return (
      
    <div className="space-y-2">
      <div className="overflow-x-auto whitespace-nowrap text-xs mt-4 mb-4 px-2 p-4 scrollbar-hide">
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
      {/* Help toggle button */}
      {/* Conditionally render help or current step */}
      {isHelpMode ? (
        <HelpStep id="help-step" onClose={toggleHelp} />
      ) : (
        <>
          {step === ModalStep.SelectionStep && (
            <SelectionStep
              userAction={userAction}
              setUserAction={setUserAction}
              onNext={() => {
                if (!userAction) return;
                setIsNewAddressSelected(userAction === "addressChange");
                setIsRedemptionSelected(userAction === "redemption");
                if (userAction === "addressChange") setStep(ModalStep.AddressStep);
                else setStep(ModalStep.RedemptionStep);
              }}
              onHelpToggle={() => setIsHelpMode(true)}
            />
          )}

          {userAction === "addressChange" && step === ModalStep.AddressStep && (
            <AddressStep
              newAddress={newAddress ?? ""}
              setNewAddress={setNewAddress}
              selectedTokenSymbol={selectedTokenSymbol}
              setSelectedTokenSymbol={setSelectedTokenSymbol}
              userFirstName={userFirstName}
              setUserFirstName={setUserFirstName}
              userLastName={userLastName}
              setUserLastName={setUserLastName}
              userEmail={userEmail}
              setUserEmail={setUserEmail}
              onHelpToggle={() => setIsHelpMode(true)}
              onNext={() => setStep(ModalStep.Complete)}
              onBack={() => setStep(ModalStep.SelectionStep)}
              isDisabled={isNewAddressDisabled}
            />
          )}

          {userAction === "redemption" && step === ModalStep.RedemptionStep && (
            <RedemptionStep
              newAddress={newAddress ?? ""}
              setNewAddress={setNewAddress}
              selectedTokenSymbol={selectedTokenSymbol}
              setSelectedTokenSymbol={setSelectedTokenSymbol}
              userFirstName={userFirstName}
              setUserFirstName={setUserFirstName}
              userLastName={userLastName}
              setUserLastName={setUserLastName}
              userEmail={userEmail}
              setUserEmail={setUserEmail}
              onHelpToggle={() => setIsHelpMode(true)}
              onBack={() => setStep(ModalStep.SelectionStep)}
              onNext={() => setStep(ModalStep.Complete)}
              isDisabled={isRedemptionDisabled}
            />
          )}
        </>
      )}
      {step === ModalStep.Complete && (
        <DoneStep onClose={onClose} />
      )}
    </div>
  );
};
