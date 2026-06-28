"use client";

import { useState, useEffect } from "react";
import { Modal } from "~~/components/common/modal";
import { Token, supportedTokens } from "~~/components/constants/tokens";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import { useDeposit } from "~~/components/acquire/useAcquisitionHandler";
import SelectionStep from  "~~/components/acquire/steps/selectionStep";
import { OnStep } from "~~/components/acquire/steps/onStep";
import { LiquidateStep } from "~~/components/acquire/steps/liquidateStep";
import { DoneStep } from "~~/components/invest/steps/doneStep";
import { sendAcquisitionConfirmation } from "~~/components/email/sendAcquisitionEmail";
import HelpStep from "~~/components/acquire/steps/helpStep";
import { useRouter } from "next/navigation";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

enum ModalStep {
  SelectionStep = 0,
  OnStep = 1,
  LiquidateStep = 2,
  DoneStep = 3,
}

export const AcquireModal: React.FC<Props> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [step, setStep] = useState<ModalStep>(ModalStep.SelectionStep);
  const [isHelpMode, setIsHelpMode] = useState(false);

  const [savedStep, setSavedStep] = useState<ModalStep | null>(null);
  const [userAction, setUserAction] = useState<"acquire" | "liquidate" | null>(null);
  const [isAcquireSelected, setIsAcquireSelected] = useState(false);
  const [isLiquidateSelected, setIsLiquidateSelected] = useState(false);

  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [termsText, setTermsText] = useState("");
  const [policyText, setPolicyText] = useState("");

  const { address: connectedWallet } = useAccount();
  const { isProcessing: isDepositProcessing, error: depositError, deposit } = useDeposit();
  const isAnyProcessing = isDepositProcessing;
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState("");
  const [selectedTokenSymbol2, setSelectedTokenSymbol2] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState(0);
  const [depositAmount, setDepositAmount] = useState("");
  const [convertedAmount, setConvertedAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [provider, setProvider] = useState<EthereumProvider | null>(null);
  const [walletName, setWalletName] = useState<string>("");

  const [receiptHash, setReceiptHash] = useState("");
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ethereum = (window as any).ethereum;
    const xdefi = (window as any).xfi;

    if (ethereum?.isMetaMask) {
      setWalletName("MetaMask");
      setProvider(ethereum);
    } else if (ethereum?.isBraveWallet) {
      setWalletName("Brave Wallet");
      setProvider(ethereum);
    } else if (ethereum) {
      setWalletName("Injected Wallet");
      setProvider(ethereum);
    }

    if (xdefi) {
      setWalletName("XDEFI Wallet");
      setProvider(xdefi.ethereum);
    }
  }, []);

  // Derive full Token object from selected symbol
  const selectedToken = supportedTokens.find(
    (token) => token.symbol === selectedTokenSymbol
  ) as Token | undefined;

  const selectedToken2: Token | undefined = supportedTokens.find(
    (token2) => token2.symbol === selectedTokenSymbol2
  ) as Token | undefined;

  //const balance = useTokenBalance(connectedWallet, selectedToken!);

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
      console.log("Please select a valid token.");
      return;
    }

    /*if (!balance) {
      console.log("Unable to fetch balance");
      return;
    }*/

    if (!connectedWallet) {
      console.log("Please connect your wallet.");
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

    if (!depositAmount || depositAmount.trim() === "") {
      console.log("Please enter a deposit amount.");
      return;
    }

    if (!convertedAmount || convertedAmount.trim() === "") {
      console.log("Converted amount is missing.");
      return;
    }

    console.log("Processing Transaction");
    
    try {

      console.log(depositAmount);
      console.log(convertedAmount);

      let receiptx = "";

      receiptx = await deposit(
        userAction!,
        depositAmount,
        convertedAmount,
        selectedToken,
        connectedWallet,
        exchangeRate,
        provider,
      );

      if (receiptx) {
        setReceiptHash(receiptx);
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

      setStep(ModalStep.DoneStep);
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
      {isHelpMode ? (
        <HelpStep id="help-step" onClose={toggleHelp} />
      ) : (
        <>
          <div className="space-y-2 h-full h-[min(90vh,auto)] flex flex-col">
            {step === ModalStep.SelectionStep && (
              <SelectionStep
                userAction={userAction}
                setUserAction={setUserAction}
                onNext={() => {
                  if (!userAction) return;
                  setIsAcquireSelected(userAction === "acquire");
                  setIsLiquidateSelected(userAction === "liquidate");
                  if (userAction === "acquire") setStep(ModalStep.OnStep);
                  else setStep(ModalStep.LiquidateStep);
                }}
                onHelpToggle={() => setIsHelpMode(true)}
              />
            )}
            {step === ModalStep.OnStep && (
              <OnStep
                supportedTokens={supportedTokens.map(token => ({
                  ...token,
                  chain: token.chain as "global" | "ethereum" | "polygon" | "bitcoin",
                }))}
                selectedTokenSymbol={selectedTokenSymbol}
                setSelectedTokenSymbol={setSelectedTokenSymbol}
                depositAmount={depositAmount}
                setDepositAmount={setDepositAmount}
                convertedAmount={convertedAmount}
                setConvertedAmount={setConvertedAmount}
                exchangeRate={exchangeRate}
                setExchangeRate={setExchangeRate}
                userFirstName={userFirstName}
                setUserFirstName={setUserFirstName}
                userLastName={userLastName}
                setUserLastName={setUserLastName}
                userEmail={userEmail}
                setUserEmail={setUserEmail}
                connectedWallet={connectedWallet}
                onHelpToggle={() => setIsHelpMode(true)}
                onConfirm={handleConfirm}
                isProcessing={isAnyProcessing}
                disabled={!connectedWallet || isAnyProcessing}
                onBack={() => setStep(ModalStep.SelectionStep)}
                onNext={() => {
                  if (!selectedTokenSymbol || selectedQuarter <= 0 || !depositAmount) {
                    toast.error("Please fill all the investment details.");
                    return;
                  }
                  setStep(ModalStep.DoneStep);
                }}
              />
            )}
            {step === ModalStep.LiquidateStep && (
              <LiquidateStep
                supportedTokens={supportedTokens.map(token => ({
                  ...token,
                  chain: token.chain as "global" | "ethereum" | "polygon" | "bitcoin",
                }))}
                selectedTokenSymbol={selectedTokenSymbol}
                setSelectedTokenSymbol={setSelectedTokenSymbol}
                depositAmount={depositAmount}
                setDepositAmount={setDepositAmount}
                convertedAmount={convertedAmount}
                setConvertedAmount={setConvertedAmount}
                exchangeRate={exchangeRate}
                setExchangeRate={setExchangeRate}
                userFirstName={userFirstName}
                setUserFirstName={setUserFirstName}
                userLastName={userLastName}
                setUserLastName={setUserLastName}
                userEmail={userEmail}
                setUserEmail={setUserEmail}
                connectedWallet={connectedWallet}
                onHelpToggle={() => setIsHelpMode(true)}
                onConfirm={handleConfirm}
                isProcessing={isAnyProcessing}
                disabled={!connectedWallet || isAnyProcessing}
                onBack={() => setStep(ModalStep.SelectionStep)}
                onNext={() => {
                  if (!selectedTokenSymbol || selectedQuarter <= 0 || !depositAmount) {
                    toast.error("Please fill all the investment details.");
                    return;
                  }
                  setStep(ModalStep.DoneStep);
                }}
              />
            )}
            {step === ModalStep.DoneStep && <DoneStep onClose={onClose} receiptHash={receiptHash}/>}
          </div>
        </>
      )}
    </Modal>
  );
};


