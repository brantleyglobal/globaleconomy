"use client";

import { useState, useEffect } from "react";
import type { Bytes } from "ethers";
import { Modal } from "~~/components/common/modal";
import { Token, supportedTokens } from "~~/components/constants/tokens";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import { useTokenBalance } from "~~/components/invest/useTokenBalance";
import { useDeposit } from "~~/components/invest/useDepositHandler";
import { useInfra } from "~~/components/invest/useInfraHandler";
import type { Props as InputStepProps  } from "~~/components/invest/steps/termStep";
import SelectionStep from "~~/components/invest/steps/selectionStep";
import { TermStep } from "~~/components/invest/steps/termStep";
import { RegionStep } from "~~/components/invest/steps/regionStep";
import { ConfirmStep } from "~~/components/invest/steps/confirmStep";
import { DoneStep } from "~~/components/invest/steps/doneStep";
import HelpStep from "~~/components/invest/steps/helpStep";
import { sendInvestmentConfirmation } from "~~/components/email/sendInvestmentEmail";
import { useRouter } from "next/navigation";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

function getQuarter(ts: number): number {
  const date = new Date(ts * 1000);
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3);
  return year * 4 + quarter;
}

function computeEligibilityQuarter(ts: number, committed: number): number {
  const q = getQuarter(ts);
  const start = getQuarterStart(ts);
  const daysIntoQuarter = (ts - start) / 86400;
  const grace = committed >= 3 ? 20 : 0;
  return daysIntoQuarter <= grace ? q : q + 1;
}

function getQuarterStart(ts: number): number {
  const date = new Date(ts * 1000);
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3);
  const startMonth = quarter * 3;
  return Math.floor(new Date(year, startMonth, 1).getTime() / 1000);
}

function getMultiplier(ts: number, committed: number): number {
  return committed >= 6 ? 200 : committed >= 4 ? 150 : 125;
}

function quarterToDate(q: number): Date {
  const year = Math.floor(q / 4);
  const quarter = q % 4;
  const month = quarter * 3;
  return new Date(year, month, 1);
}

function formatQuarterLabel(date: Date): string {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${year}`;
}

enum ModalStep {
  SelectionStep = 0,
  AgreementStep = 1,
  TermStep = 2,
  RegionStep = 3,
  SpeculativeStep = 4,
  ConfirmStep = 5,
  DoneStep = 6,
}

export const InvestmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [step, setStep] = useState<ModalStep>(ModalStep.SelectionStep);
  const [isHelpMode, setIsHelpMode] = useState(false);
  const [summary, setSummary] = useState<{
    unlockQ: number;
    eligibilityQ: number;
    multiplier: number;
    eligibilityLabel: string;
    unlockLabel: string;
  } | null>(null);

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
  const { isProcessing: isInfraProcessing, error: infraError, infra } = useInfra();
  const { isProcessing: isInfraBTCProcessing, error: infraBTCerror, infraBTC } = useInfra();
  const { isProcessing: isDepositBTCProcessing, error: depositBTCerror, depositBTC } = useDeposit();
  const isAnyProcessing = isDepositProcessing || isDepositBTCProcessing || isInfraProcessing || isInfraBTCProcessing;
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState("");
  const [selectedTokenSymbol2, setSelectedTokenSymbol2] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState(0);
  const [depositAmount, setDepositAmount] = useState("");

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

      if (selectedTokenSymbol === "GLB" && selectedTokenSymbol2 === "BTC") {
        if (!selectedToken2) {
          toast.error("Please select a valid token.");
          return;
        }
        const receiptx = await infraBTC(depositAmount, selectedToken2, selectedToken, connectedWallet!);
      } else if (
        (selectedTokenSymbol === "BGFFS" && selectedTokenSymbol2 !== "BTC") ||
        (selectedTokenSymbol === "BGFRS" && selectedTokenSymbol2 !== "BTC")
        //(selectedTokenSymbol !== "TGMX" && selectedTokenSymbol2 !== "BTC") ||
        //(selectedTokenSymbol !== "TGUSA" && selectedTokenSymbol2 !== "BTC") ||
        //(selectedTokenSymbol !== "GLB" && selectedTokenSymbol2 !== "BTC")
      ) {
        if (!selectedToken2) {
          toast.error("Please select a valid token.");
          return;
        }
        const receiptx = await infra(depositAmount, selectedToken2, selectedToken, connectedWallet!);
      } else if (selectedTokenSymbol !== "GLB" && selectedTokenSymbol2 === "BTC") {
        const receiptx = await depositBTC(depositAmount, selectedQuarter, selectedToken, connectedWallet!);
      } else if (
        (selectedTokenSymbol !== "BGFFS" && selectedTokenSymbol2 !== "BTC") ||
        (selectedTokenSymbol !== "BGFRS" && selectedTokenSymbol2 !== "BTC")
        //(selectedTokenSymbol !== "TGMX" && selectedTokenSymbol2 !== "BTC") ||
        //(selectedTokenSymbol !== "TGUSA" && selectedTokenSymbol2 !== "BTC") ||
        //(selectedTokenSymbol !== "GLB" && selectedTokenSymbol2 !== "BTC")
      ) {
        const receiptx = await deposit(depositAmount, selectedQuarter, selectedToken, connectedWallet!);
      }


      console.log("Transaction Hash:", receiptx);
      console.log("Sending Confirmation");

      if (!summary) {
        toast.error("Summary info not available.");
        return;
      }

      const { unlockLabel, eligibilityLabel, multiplier } = summary;

      await sendInvestmentConfirmation({
        templateType: "investment",
        userEmail,
        userFirstName,
        userLastName,
        connectedWallet,
        tokenSymbol: selectedTokenSymbol,
        tokenSymbol2: selectedTokenSymbol2,
        amount: depositAmount,
        committedQuarters: selectedQuarter,
        unlockLabel,
        eligibilityLabel,
        multiplier,
        receipt: receiptx || "",
      });

      setStep(3);
      toast.success("Deposit successful and confirmation email sent.");
    } catch (e) {
      toast.error("Error during deposit or email sending.");
      console.error(e);
    }
  };

  useEffect(() => {
    if (step === 2) {
      try {
        const now = Date.now() / 1000;
        const currentQ = getQuarter(now);
        const unlockQ = currentQ + selectedQuarter;
        const eligibilityQ = computeEligibilityQuarter(now, selectedQuarter);
        const unlockDate = quarterToDate(unlockQ);
        const eligibilityDate = quarterToDate(eligibilityQ);

         const eligibilityLabel =
        selectedTokenSymbol === "GLB"
          ? "N/A"
          : formatQuarterLabel(eligibilityDate);

        setSummary({
          unlockQ,
          eligibilityQ,
          multiplier: getMultiplier(now, selectedQuarter),
          unlockLabel: formatQuarterLabel(unlockDate),
          eligibilityLabel,
        });
      } catch (err) {
        console.error("Error in summary computation:", err);
        setSummary(null);
      }
    }
  }, [step, selectedQuarter]);

  useEffect(() => {
    fetch("/legal/investorOverview.txt")
      .then((r) => r.text())
      .then(setTermsText);
    fetch("/legal/privacy-policy.txt")
      .then((r) => r.text())
      .then(setPolicyText);
  }, []);

  if (!isOpen) return null;

  const stepLabels = ["Investor Details", "Terms & Policy", "Term Invest", "Regional Invest", "Review & Confirmation", "Done"];

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
                  setIsTermSelected(userAction === "term");
                  setIsRegionSelected(userAction === "region");
                  setIsSpeculativeSelected(userAction === "speculative");
                  if (userAction === "term") setStep(ModalStep.AgreementStep);
                  else setStep(ModalStep.AgreementStep);
                }}
                onHelpToggle={() => setIsHelpMode(true)}
              />
            )}
            {/* Step 1 - Terms & Policies */}
            {step === ModalStep.AgreementStep && (
              <div className="flex flex-col h-full space-y-2">
                <div className="px-0 h-full">
                  <h2 className="text-xl font-light text-primary">AGREEMENTS</h2>
                </div>
                <div className="relative z-20 text-sm text-gray-400 animate-bounce">
                    Scroll to accept ↓
                  </div>
                <div className="flex-grow max-h-90 sm:max-h-90 overflow-y-auto text-xs sm:text-sm border px-4 rounded bg-black text-justify text-white space-y-8">
                  <section>
                    <h3 className="font-semibold mb-2 mt-2 text-2xl">TERMS & CONDITIONS</h3>
                    <div dangerouslySetInnerHTML={{ __html: termsText || "<p>Loading…</p>" }} />
                  </section>

                  <section>
                    <h3 className="font-semibold mb-6 text-2xl">PRIVACY POLICY</h3>
                    <div dangerouslySetInnerHTML={{ __html: policyText || "<p>Loading…</p>" }} />
                    <label className="flex items-center gap-2 mt-4 mb-6">
                      <input
                        type="checkbox"
                        checked={policyAccepted}
                        onChange={() => setPolicyAccepted(!policyAccepted)}
                        className="form-checkbox"
                      />
                      I agree to the Terms & Policies
                    </label>
                  </section>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-4 py-4 border-t bg-transparent w-full">
                  <button
                    className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
                    onClick={() => { setStep(ModalStep.SelectionStep)}}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
                    onClick={() => {
                      if (!policyAccepted) return;
  
                      // Branch to steps based on userAction
                      if (userAction === "term") {
                        setStep(ModalStep.TermStep);
                      } else if (userAction == "region") {
                        setStep(ModalStep.RegionStep);
                      } else { 
                        {/*router.push("/trader");*/} //URL FOR TRADING
                      }
                    }}
                    disabled={!(policyAccepted)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            {step === ModalStep.TermStep && (
              <TermStep
                supportedTokens={supportedTokens}
                selectedTokenSymbol={selectedTokenSymbol}
                setSelectedTokenSymbol={setSelectedTokenSymbol}
                selectedQuarter={selectedQuarter}
                setSelectedQuarter={setSelectedQuarter}
                depositAmount={depositAmount}
                setDepositAmount={setDepositAmount}
                userFirstName={userFirstName}
                setUserFirstName={setUserFirstName}
                userLastName={userLastName}
                setUserLastName={setUserLastName}
                userEmail={userEmail}
                onHelpToggle={() => setIsHelpMode(true)}
                setUserEmail={setUserEmail}
                onPrevious={() => setStep(ModalStep.AgreementStep)}
                onNext={() => {
                  if (!selectedTokenSymbol || selectedQuarter <= 0 || !depositAmount) {
                    toast.error("Please fill all the investment details.");
                    return;
                  }
                  setStep(1);
                }}
              />
            )} 
            {step === ModalStep.RegionStep && (
              <RegionStep
                supportedTokens={supportedTokens}
                selectedTokenSymbol={selectedTokenSymbol}
                setSelectedTokenSymbol={setSelectedTokenSymbol}
                selectedTokenSymbol2={selectedTokenSymbol2}
                setSelectedTokenSymbol2={setSelectedTokenSymbol2}
                selectedQuarter={selectedQuarter}
                setSelectedQuarter={setSelectedQuarter} 
                depositAmount={depositAmount}
                setDepositAmount={setDepositAmount}
                userFirstName={userFirstName}
                setUserFirstName={setUserFirstName}
                userLastName={userLastName}
                setUserLastName={setUserLastName}
                userEmail={userEmail}
                onHelpToggle={() => setIsHelpMode(true)}
                setUserEmail={setUserEmail}
                onPrevious={() => setStep(ModalStep.AgreementStep)}
                onNext={() => {
                  if (!selectedTokenSymbol || selectedQuarter <= 0 || !depositAmount) {
                    toast.error("Please fill all the investment details.");
                    return;
                  }
                  setStep(1);
                }}
              />
            )}           
            {step === ModalStep.ConfirmStep && summary && (
              <ConfirmStep
                amount={depositAmount}
                committedQuarters={selectedQuarter}
                token={selectedToken!}
                token2={selectedToken2!}
                summary={summary}
                connectedWallet={connectedWallet}
                onPrevious={() => setStep(1)}
                onConfirm={handleConfirm}
                onHelpToggle={() => setIsHelpMode(true)}
                isProcessing={isAnyProcessing}
                disabled={!connectedWallet || isAnyProcessing}
              />
            )}
            {step === ModalStep.DoneStep && <DoneStep onClose={onClose} />}
          </>
        )}
      </div>
    </Modal>
  );
};


