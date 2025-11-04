"use client";

import { useState, useEffect } from "react";
import { Modal } from "~~/components/common/modal";
import { Token, supportedTokens } from "~~/components/constants/tokens";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import { useTokenBalance } from "~~/components/invest/useTokenBalance";
import { useDeposit } from "~~/components/acquire/useAcquisitionHandler";
import type { Props as InputStepProps  } from "~~/components/acquire/steps/onStep";
import { OnStep } from "~~/components/acquire/steps/onStep";
import { DoneStep } from "~~/components/invest/steps/doneStep";
import { sendAcquisitionConfirmation } from "~~/components/email/sendAcquisitionEmail";
import { useRouter } from "next/navigation";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

enum ModalStep {
  OnStep = 0,
  DoneStep = 1,
}

export const AcquireModal: React.FC<Props> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [step, setStep] = useState<ModalStep>(ModalStep.OnStep);
  const [isHelpMode, setIsHelpMode] = useState(false);

  const [savedStep, setSavedStep] = useState<ModalStep | null>(null);
  const [userAction, setUserAction] = useState<"term" | "region" | "speculative" | null>(null);
  
  const [isTermSelected, setIsTermSelected] = useState(false);
  const [isRegionSelected, setIsRegionSelected] = useState(false);
  const [isSpeculativeSelected, setIsSpeculativeSelected] = useState(false);

  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [termsText, setTermsText] = useState("");
  const [policyText, setPolicyText] = useState("");

  const { address: connectedWallet } = useAccount();
  const { isProcessing: isDepositProcessing, error: depositError, deposit } = useDeposit();
  const { isProcessing: isDepositBTCProcessing, error: depositBTCerror, depositBTC } = useDeposit();
  const isAnyProcessing = isDepositProcessing || isDepositBTCProcessing;
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState("");
  const [selectedTokenSymbol2, setSelectedTokenSymbol2] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState(0);
  const [depositAmount, setDepositAmount] = useState("");
  const [convertedAmount, setConvertedAmount] = useState("");

  // Derive full Token object from selected symbol
  const selectedToken: Token | undefined = supportedTokens.find(
    (token) => token.symbol === selectedTokenSymbol
  );

  const selectedToken2: Token | undefined = supportedTokens.find(
    (token2) => token2.symbol === selectedTokenSymbol2
  );


  const balance = useTokenBalance(connectedWallet, selectedToken!);

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

  const handleConfirm = async () => {
    if (!selectedToken) {
      toast.error("Please select a valid token.");
      return;
    }

    if (!balance) {
      toast.error("Unable to fetch balance");
      return;
    }

    if (!connectedWallet) {
      toast.error("Please connect your wallet.");
      return;
    }

    if (selectedTokenSymbol === "GLB") {
    // Skip processing for GLB token or show a special prompt
      toast("Investment Is Not Open.");
      return;
    }

    if (selectedTokenSymbol === "TGMX") {
    // Skip processing for GLB token or show a special prompt
      toast("Investment Is Not Open.");
      return;
    }

    if (selectedTokenSymbol === "TGUSA") {
    // Skip processing for GLB token or show a special prompt
      toast("Investment Is Not Open.");
      return;
    }

    console.log("Processing Transaction");
    
    try {

      let receiptx = "";

      if (selectedTokenSymbol === "BTC") {
        const receiptx = await depositBTC(depositAmount, convertedAmount, selectedToken, connectedWallet!);
      } else if ( selectedTokenSymbol !== "BTC") {
        const receiptx = await deposit(depositAmount, convertedAmount, selectedToken, connectedWallet!);
      }

      console.log("Transaction Hash:", receiptx);
      console.log("Sending Confirmation");

      await sendAcquisitionConfirmation({
        templateType: "acquisition",
        userFirstName,
        userLastName,
        userEmail,
        connectedWallet: selectedToken?.address,
        tokenSymbol: selectedToken?.symbol ?? "unknown",
        amountin: depositAmount,
        amountout: convertedAmount,
        receipt: receiptx || "",
      });

      setStep(1);
      toast.success("Deposit successful and confirmation email sent.");
    } catch (e) {
      toast.error("Error during deposit or email sending.");
      console.error(e);
    }
  };

  useEffect(() => {
    fetch("/legal/investorOverview.txt")
      .then((r) => r.text())
      .then(setTermsText);
    fetch("/legal/privacy-policy.txt")
      .then((r) => r.text())
      .then(setPolicyText);
  }, []);

  if (!isOpen) return null;

  const stepLabels = ["Complete & Confirmation", "Done"];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
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

      <div className="space-y-2 h-full h-[min(90vh,auto)] flex flex-col">
        {step === ModalStep.OnStep && (
          <OnStep
            supportedTokens={supportedTokens}
            selectedTokenSymbol={selectedTokenSymbol}
            setSelectedTokenSymbol={setSelectedTokenSymbol}
            depositAmount={depositAmount}
            setDepositAmount={setDepositAmount}
            userFirstName={userFirstName}
            setUserFirstName={setUserFirstName}
            userLastName={userLastName}
            setUserLastName={setUserLastName}
            userEmail={userEmail}
            setUserEmail={setUserEmail}
            connectedWallet={connectedWallet}
            onConfirm={handleConfirm}
            isProcessing={isAnyProcessing}
            disabled={!connectedWallet || isAnyProcessing}
            onNext={() => {
              if (!selectedTokenSymbol || selectedQuarter <= 0 || !depositAmount) {
                toast.error("Please fill all the investment details.");
                return;
              }
              setStep(ModalStep.DoneStep);
            }}
          />
        )}
        {step === ModalStep.DoneStep && <DoneStep onClose={onClose} />}
      </div>
    </Modal>
  );
};


