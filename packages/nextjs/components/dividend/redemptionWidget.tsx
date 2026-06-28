"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Address as AddressType, erc20Abi } from "viem";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { Token } from "~~/components/constants/tokens";
import { Contract, BrowserProvider } from "ethers";
import smartVaultabi from "~~/lib/contracts/abi/SmartVault.json";
import { toast } from "react-hot-toast";
import deployments from "~~/lib/contracts/deployments.json";
import SelectionStep from "~~/components/dividend/steps/selectionStep";
import AddressStep from "~~/components/dividend/steps/NewAddressStep";
import TokenStep from "~~/components/dividend/steps/NewTokenStep";
import RedemptionStep from "~~/components/dividend/steps/RedemptionStep";
import HelpStep from "~~/components/dividend/steps/helpStep";
import { DoneStep } from "~~/components/dividend/steps/doneStep";

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
  TokenStep = 2,
  RedemptionStep = 3,
  Complete = 4,
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
  const [userAction, setUserAction] = useState<"addressChange" | "tokenChange" | "redemption" | null>(null);
  
  const [autoPay, setAutoPay] = useState(false);
  const [receiptHash, setReceiptHash] = useState("");

  const [newAddress, setNewAddress] = useState<AddressType | undefined>(undefined);
  
  const [isNewAddressSelected, setIsNewAddressSelected] = useState(false);
  const [isRedemptionSelected, setIsRedemptionSelected] = useState(false);

  const [walletTokens, setWalletTokens] = useState<(Token & { balance: bigint })[]>([]);
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string>("");
  const [selectedTokenSymbol2, setSelectedTokenSymbol2] = useState<string>("");
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

  const stepLabels = ["Redemption Process", "Wallet Address Change", "Payout Token Change", "Done"];

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
                setIsNewAddressSelected(userAction === "tokenChange");
                setIsRedemptionSelected(userAction === "redemption");
                if (userAction === "addressChange") setStep(ModalStep.AddressStep);
                else if (userAction === "redemption") setStep(ModalStep.RedemptionStep);
                else if (userAction === "tokenChange") setStep(ModalStep.TokenStep);
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

          {userAction === "tokenChange" && step === ModalStep.TokenStep && (
            <TokenStep
              newAddress={newAddress ?? ""}
              setNewAddress={setNewAddress}
              selectedTokenSymbol={selectedTokenSymbol}
              setSelectedTokenSymbol={setSelectedTokenSymbol}
              selectedTokenSymbol2={selectedTokenSymbol2}
              setSelectedTokenSymbol2={setSelectedTokenSymbol2}
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
              amount={amount ?? ""}
              setAmount={setAmount}
              selectedTokenSymbol={selectedTokenSymbol}
              setSelectedTokenSymbol={setSelectedTokenSymbol}
              selectedTokenSymbol2={selectedTokenSymbol2}
              setSelectedTokenSymbol2={setSelectedTokenSymbol2}
              userFirstName={userFirstName}
              setUserFirstName={setUserFirstName}
              userLastName={userLastName}
              setUserLastName={setUserLastName}
              userEmail={userEmail}
              setUserEmail={setUserEmail}
              receiptHash={receiptHash}
              setReceiptHash={setReceiptHash}
              onHelpToggle={() => setIsHelpMode(true)}
              onBack={() => setStep(ModalStep.SelectionStep)}
              onNext={() => setStep(ModalStep.Complete)}
              isDisabled={isRedemptionDisabled}
            />
          )}
        </>
      )}
      {step === ModalStep.Complete && (
        <DoneStep onClose={onClose} receiptHash={receiptHash}/>
      )}
    </div>
  );
};
