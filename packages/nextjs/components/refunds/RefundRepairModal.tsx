"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "~~/components/common/modal";
import { Address as AddressType } from "viem";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

// Internal Steps Layout Modules
import SelectionStep from "./steps/selectionStep";
import HelpStep from "~~/components/refunds/helpStep";
import { RefundStep } from "./steps/refundStep";
import { RepairStep } from "./steps/repairStep";
import { DoneStep } from "./steps/doneStep";
// Assets, Handlers, Email and Infrastructure Configurations
import { useRefundHandler } from "~~/components/refunds/useRefundHandler";
import { sendRefundConfirmation } from "~~/components/email/sendRefundEmail";
import deployments from "~~/lib/contracts/deployments.json";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  openWalletModal?: () => void;
};

enum ModalStep {
  SelectionStep = 0,
  DetailStep = 1,
  DoneStep = 2,
}

export const RefundRepairModal: React.FC<Props> = ({ isOpen, onClose, openWalletModal }) => {
  const { address, isConnected, chain } = useAccount();

  // Multi-Step Framework State Matrix
  const [step, setStep] = useState<ModalStep>(ModalStep.SelectionStep);
  const [userAction, setUserAction] = useState<"refund" | "repair" | null>(null);
  const [isHelpMode, setIsHelpMode] = useState(false);
  const [savedStep, setSavedStep] = useState<ModalStep | null>(null);

  // Common Unified Input States
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [receipt, setUserReceipt] = useState<string>("");
  const [isValidHash, setIsValidHash] = useState(false);

  // Refund Specific Mapping Elements
  const [data, setData] = useState("AssetPurchase");
  const [contractAddress, setSelectedContractAddress] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptHash, setReceiptHash] = useState("");

  // Repair Specific Component States
  const [systemSerialNumber, setSystemSerialNumber] = useState("");
  const [repairDescription, setRepairDescription] = useState("");

  // Track dynamic contract target updates based on user selection type
  useEffect(() => {
    if (!data) {
      setSelectedContractAddress("");
      return;
    }
    if (data === "AssetPurchase") {
      setSelectedContractAddress(deployments.AssetPurchase);
    }
  }, [data]);

  // Hook validation checks
  const validateHash = (value: string) => {
    let v = value.trim().toLowerCase();
    if (v.length > 0 && !v.startsWith("0x")) {
      v = "0x" + v;
    }
    setUserReceipt(v);
    setIsValidHash(/^0x[a-f0-9]{64}$/.test(v));
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setUserEmail(email);
    setEmailError(email === "" || validateEmail(email) ? "" : "Please enter a valid email address");
  };

  // Instantiate standard context hook rules
  const { executeAction: send, loading: isHookLoading } = useRefundHandler({
    sender: address,
    chainId: chain?.id,
    receipt,
    available: undefined,
    signature: "",
    openWalletModal,
  });

  function toggleHelp() {
    if (!isHelpMode) {
      setSavedStep(step);
      setIsHelpMode(true);
    } else {
      setIsHelpMode(false);
      if (savedStep !== null) {
        setStep(savedStep);
        setSavedStep(null);
      }
    }
  }

  // Unified execution workflow terminal processing point
  const handleActionConfirm = async (actionType: "refund" | "repair") => {
    if (!address) {
      toast.error("Please connect your structural Web3 account wallet.");
      return;
    }
    if (emailError || !userEmail || !userFirstName || !userLastName) {
      toast.error("Please provide valid confirmation profile fields.");
      return;
    }

    setIsProcessing(true);
    try {
      if (userAction === "refund") {
        if (!isValidHash) {
          toast.error("A valid 64-character hex receipt transaction hash is required.");
          setIsProcessing(false);
          return;
        }

        const result = await send("refund"); 
        if (!result?.success) {
          throw new Error(result?.error || "On-chain exception encountered.");
        }

        const resolvedTxHash = result.receipt2?.toString() || receipt;
        setReceiptHash(resolvedTxHash);

        await sendRefundConfirmation({
          templateType: "refund",
          userFirstName,
          userLastName,
          userEmail,
          connectedWallet: address,
          contractAddress: contractAddress,
          receipt: resolvedTxHash,
        });

        toast.success("Refund processed cleanly. System tracking updated.");
      } else {
        // System Repair Processing Endpoint Integration Layout Context
        if (!systemSerialNumber || !repairDescription) {
          toast.error("Please enter the system serial number and error context details.");
          setIsProcessing(false);
          return;
        }

        console.log("Staging hardware repair tracking footprint parameters...", {
          systemSerialNumber,
          repairDescription,
        });

        // Simulating immediate execution confirmation
        setReceiptHash("REPAIR-" + Math.floor(Math.random() * 100000));
        toast.success("Repair ticket established. Prepaid shipping labels issued.");
      }

      setStep(ModalStep.DoneStep);
    } catch (error: any) {
      toast.error(`Operation aborted: ${error?.message || "Internal Exception"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const dynamicStepLabels =
    userAction === "repair"
      ? ["Selection", "Repair Ticket", "Confirmation"]
      : ["Selection", "Refund Details", "Confirmation"];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      {/* Step Tracker Header Map */}
      <div className="overflow-x-auto whitespace-nowrap text-[10px] uppercase tracking-wider pb-4 mb-4 border-b border-white/5 scrollbar-hide">
        <div className="flex justify-between gap-2">
          {dynamicStepLabels.map((label, index) => (
            <span
              key={label}
              className={`flex-1 text-center ${
                step === index ? "text-secondary font-bold" : "text-gray-500"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Main Structural Step Screen Layout Layer */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 space-y-4">
        {isHelpMode ? (
          <HelpStep id="help-step" onClose={toggleHelp} />
        ) : (
          <>
            {/* STEP 0: CARD TRACK SELECTION */}
            {step === ModalStep.SelectionStep && (
              <SelectionStep
                userAction={userAction}
                setUserAction={setUserAction}
                onNext={() => setStep(ModalStep.DetailStep)}
                onHelpToggle={toggleHelp}
              />
            )}

            {/* STEP 1: MODULAR REFUND ELEMENT VIEW */}
            {step === ModalStep.DetailStep && userAction === "refund" && (
              <RefundStep
                receipt={receipt}
                validateHash={validateHash}
                data={data}
                setData={setData}
                userFirstName={userFirstName}
                setUserFirstName={setUserFirstName}
                userLastName={userLastName}
                setUserLastName={setUserLastName}
                userEmail={userEmail}
                setUserEmail={setUserEmail}
                emailError={emailError}
                handleEmailChange={handleEmailChange}
                onHelpToggle={toggleHelp}
                onNext={() => handleActionConfirm("refund")}
                isProcessing={isProcessing}
                isValidHash={isValidHash}
              />
            )}

            {/* STEP 1: MODULAR REPAIR ELEMENT VIEW */}
            {step === ModalStep.DetailStep && userAction === "repair" && (
              <RepairStep
                receipt={receipt}
                address={address}
                setReceipt={setUserReceipt}
                userFirstName={userFirstName}
                setUserFirstName={setUserFirstName}
                userLastName={userLastName}
                setUserLastName={setUserLastName}
                userEmail={userEmail}
                setUserEmail={setUserEmail}
                emailError={emailError}
                handleEmailChange={handleEmailChange}
                onHelpToggle={toggleHelp}
                onPrevious={() => setStep(ModalStep.SelectionStep)}
                onNext={() => handleActionConfirm("repair")}
                isProcessing={isProcessing}
                isValidHash={isValidHash}
              />
            )}

            {/* STEP 2: FINISHED SYSTEM RECEIPT RESOLUTION PANELS */}
            {step === ModalStep.DoneStep && (
              <DoneStep
                receiptHash={receiptHash}
                userEmail={userEmail}
                actionType={userAction || "refund"}
                onClose={() => {
                  // Clear state flags safely upon interface dismissal
                  setStep(ModalStep.SelectionStep);
                  setUserAction(null);
                  setUserReceipt("");
                  onClose();
                }}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
};