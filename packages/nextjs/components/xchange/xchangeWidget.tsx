"use client";

import React, { useState, useEffect } from "react";
import { Address as AddressType } from "viem";

// Import your step components 
import SelectionStep from "~~/components/xchange/steps/selectionStep";
import InitiantStep from "~~/components/xchange/steps/initiantStep";
import CounterPartyStep from "~~/components/xchange/steps/counterPartyStep";
import DepositOrRefundStep from "~~/components/xchange/steps/depositRefundStep";
import ReviewStep from "~~/components/xchange/steps/ReviewStep";
import HelpStep from "~~/components/xchange/steps/helpStep";
import { DoneStep } from "~~/components/xchange/steps/doneStep";
import { useXchangeHandler } from "~~/components/xchange/useXchangeHandler";
import { useAccount } from "wagmi";
import { supportedTokens, dividendTokens, Token } from "~~/components/constants/tokens";

enum ModalStep {
  SelectionStep = 0,
  AgreementStep = 1,
  InitiantStep = 2,
  CounterPartyStep = 3,
  DepositOrRefundStep = 4,
  ReviewStep = 5,
  DoneStep = 6,
}

type GlobalXchangeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  openWalletModal: () => void;
};

export const GlobalXchangeModal = ({ isOpen, onClose, openWalletModal }: GlobalXchangeModalProps) => {
  const [step, setStep] = useState<ModalStep>(ModalStep.SelectionStep);
  const [isHelpMode, setIsHelpMode] = useState(false);

  // Ref to remember the step from which help was opened
  const [savedStep, setSavedStep] = useState<ModalStep | null>(null);
  const [userAction, setUserAction] = useState<"refund" | "deposit" | "newContract" | null>(null);

  const [isRefundSelected, setIsRefundSelected] = useState(false);
  const [isNewContractSelected, setIsNewContractSelected] = useState(false);

  // New contract step 1
  const [recipient, setRecipient] = useState<AddressType | undefined>(undefined);
  const [recipient2, setRecipient2] = useState<AddressType | undefined>(undefined);
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState("");
  const [selectedTokenSymbolS, setSelectedTokenSymbolS] = useState("");
  const [selectedTokenSymbol2, setSelectedTokenSymbol2] = useState("");
  const [amount2, setAmount2] = useState("");
  const [amount, setAmount] = useState("");

  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedToken2, setSelectedToken2] = useState<Token | null>(null);

  // New contract step 2
 
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userFirstName2, setUserFirstName2] = useState("");
  const [userLastName2, setUserLastName2] = useState("");
  const [userEmail2, setUserEmail2] = useState("");

  // Deposit/refund step
  const [xchangeId, setXchangeId] = useState<AddressType | undefined>(undefined);

  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [policyText, setPolicyText] = useState("");

  // Wallet state from wagmi
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { chain } = useAccount();
  const [provider, setProvider] = useState<EthereumProvider | null>(null);
  const [walletName, setWalletName] = useState<string>("");
  
  useEffect(() => {
    const ethereum = window.ethereum;
    const xdefi = window.xfi;

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

  // RainbowKit modal control hook
  //const { openConnectModal } = useConnectModal();

  // Centralized disable logic for steps, adjust validation logic per your needs:
  const isCounterPartyStepDisabled = 
    !recipient2 || 
    !selectedTokenSymbol2 || 
    !amount2 || Number(amount2) <= 0 ||
    !isConnected;

  const isDepositOrRefundStepDisabled =
    !xchangeId ||
    !selectedTokenSymbol ||
    !amount || Number(amount) <= 0 ||
    !isConnected;

  // When user toggles Help
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

  function getTokenBySymbol(symbol: string): Token | undefined {
    return [...supportedTokens, ...dividendTokens].find(
      (t) => t.symbol === symbol
    );
  }

  useEffect(() => {
    const tokenObj = getTokenBySymbol(selectedTokenSymbol);
    setSelectedToken(tokenObj ?? null);
  }, [selectedTokenSymbol]);

  // Whenever selectedTokenSymbol2 changes:
  useEffect(() => {
    const tokenObj2 = getTokenBySymbol(selectedTokenSymbol2);
    setSelectedToken2(tokenObj2 ?? null);
  }, [selectedTokenSymbol2]);

  const goToReview = () => {
    setSavedStep(step);
    setStep(ModalStep.ReviewStep);
  };

  const returnFromReview = () => {
    if (savedStep !== null) {
      setStep(savedStep);
      setSavedStep(null);
    } else {
      setStep(ModalStep.SelectionStep); // fallback if none saved
    }
  };

  const { send } = useXchangeHandler({
    sender: address || "",
    chainId: chain?.id,
    selectedToken: selectedToken ?? undefined,
    selectedToken2: selectedToken2 ?? undefined,
    amount,
    amount2,
    recipient,
    recipient2,
    xchangeId,
    isRefundSelected,
    isNewContractSelected,
    provider,
    openWalletModal,
  });

  useEffect(() => {
    fetch("/legal/privacy-policy.txt")
      .then((r) => r.text())
      .then(setPolicyText);
  }, []);

  useEffect(() => {
    const resolveWallet = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setAddress(accounts[0]);
            setIsConnected(true);
          } else {
            setAddress(null);
            setIsConnected(false);
          }

          window.ethereum.on?.("accountsChanged", (accounts: string[]) => {
            const newAccount = accounts.length > 0 ? accounts[0] : null;
            setAddress(newAccount);
            setIsConnected(!!newAccount);
          });
        } catch (err) {
          console.error("Failed to get wallet address:", err);
        }
      }
    };

    resolveWallet();
  }, []);

  const stepLabels = ["Selection", "Policy", "Initiant", "CounterParty", "Deposits/Refunds", "Review", "Done"];

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
                setIsRefundSelected(userAction === "refund");
                setIsNewContractSelected(userAction === "newContract");
                if (userAction === "newContract") setStep(ModalStep.AgreementStep);
                else setStep(ModalStep.AgreementStep);
              }}
              onHelpToggle={() => setIsHelpMode(true)}
            />
          )}

          {step === ModalStep.AgreementStep && (
            <div className="flex flex-col flex-full h-full space-y-2">
              <div className="px-0 h-full">
                <h2 className="text-xl font-light text-primary">AGREEMENTS</h2>
              </div>
              <div className="relative z-20 text-sm text-gray-400 animate-bounce">
                Scroll to accept ↓
              </div>
              <div className="flex-grow max-h-150 sm:max-h-95 overflow-y-auto text-xs sm:text-sm border px-4 rounded bg-black text-justify text-white space-y-8">
                <section>
                  <h3 className="font-semibold mb-6 mt-2 text-2xl">PRIVACY POLICY</h3>
                  <div dangerouslySetInnerHTML={{ __html: policyText || "<p>Loading…</p>" }} />
                  <label className="flex items-center gap-2 mt-4 mb-6">
                    <input
                      type="checkbox"
                      checked={policyAccepted}
                      onChange={() => setPolicyAccepted(!policyAccepted)}
                      className="form-checkbox"
                    />
                    I agree to the Policy
                  </label>
                </section>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-4 pt-4 border-t bg-transparent w-full">
                <button
                  className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
                  onClick={() => { setStep(0)}}
                >
                  Previous
                </button>
                <button
                  className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
                  onClick={() => {
                    if (!policyAccepted) return;

                    // Branch to steps based on userAction
                    if (userAction === "newContract") {
                      setStep(ModalStep.InitiantStep);
                    } else {
                      setStep(ModalStep.DepositOrRefundStep);
                    }
                  }}
                  disabled={!(policyAccepted)}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {userAction === "newContract" && step === ModalStep.InitiantStep && (
            <InitiantStep
              recipient={recipient ?? ""}
              setRecipient={setRecipient}
              selectedTokenSymbol={selectedTokenSymbol}
              setSelectedTokenSymbol={setSelectedTokenSymbol}
              amount={amount}
              setAmount={setAmount}
              userFirstName={userFirstName}
              setUserFirstName={setUserFirstName}
              userLastName={userLastName}
              setUserLastName={setUserLastName}
              userEmail={userEmail}
              setUserEmail={setUserEmail}
              onHelpToggle={() => setIsHelpMode(true)}
              onNext={() => setStep(ModalStep.CounterPartyStep)}
              onBack={() => setStep(ModalStep.AgreementStep)}
            />
          )}

          {userAction === "newContract" && step === ModalStep.CounterPartyStep && (
            <CounterPartyStep
              recipient2={recipient2 ?? ""}
              setRecipient2={setRecipient2}
              selectedTokenSymbol2={selectedTokenSymbol2}
              setSelectedTokenSymbol2={setSelectedTokenSymbol2}
              amount2={amount2}
              setAmount2={setAmount2}
              userFirstName2={userFirstName2}
              setUserFirstName2={setUserFirstName2}
              userLastName2={userLastName2}
              setUserLastName2={setUserLastName2}
              userEmail2={userEmail2}
              setUserEmail2={setUserEmail2}
              onHelpToggle={() => setIsHelpMode(true)}
              onBack={() => setStep(ModalStep.InitiantStep)}
              onNext={() => goToReview()}
              isConnected={isConnected}
              isDisabled={isCounterPartyStepDisabled}
            />
          )}

          {(userAction === "deposit" || userAction === "refund") && step === ModalStep.DepositOrRefundStep && (
            <DepositOrRefundStep
              xchangeId={xchangeId ?? ""}
              setXchangeId={setXchangeId}
              selectedTokenSymbol={selectedTokenSymbol}
              setSelectedTokenSymbol={setSelectedTokenSymbol}
              amount={amount}
              setAmount={setAmount}
              userFirstName={userFirstName}
              setUserFirstName={setUserFirstName}
              userLastName={userLastName}
              setUserLastName={setUserLastName}
              userEmail={userEmail}
              setUserEmail={setUserEmail}
              onHelpToggle={() => setIsHelpMode(true)}
              onBack={() => setStep(ModalStep.AgreementStep)}
              onNext={() => goToReview()}
              isConnected={isConnected}
              isDisabled={isDepositOrRefundStepDisabled}
            />
          )}

          {step === ModalStep.ReviewStep && (
            <ReviewStep
              xchangeId={xchangeId}
              selectedTokenSymbolS={selectedTokenSymbolS}
              setSelectedTokenSymbolS={setSelectedTokenSymbolS}
              setXchangeId={setXchangeId}
              recipient={recipient}
              setRecipient={setRecipient}
              selectedTokenSymbol={selectedTokenSymbol}
              setSelectedTokenSymbol={setSelectedTokenSymbol}
              amount={amount}
              setAmount={setAmount}
              userFirstName={userFirstName}
              setUserFirstName={setUserFirstName}
              userLastName={userLastName}
              setUserLastName={setUserLastName}
              userEmail={userEmail}
              setUserEmail={setUserEmail}
              recipient2={recipient2 ?? ""}
              setRecipient2={setRecipient2}
              selectedTokenSymbol2={selectedTokenSymbol2}
              setSelectedTokenSymbol2={setSelectedTokenSymbol2}
              amount2={amount2}
              setAmount2={setAmount2}
              userFirstName2={userFirstName2}
              setUserFirstName2={setUserFirstName2}
              userLastName2={userLastName2}
              setUserLastName2={setUserLastName2}
              userEmail2={userEmail2}
              setUserEmail2={setUserEmail2}
              onHelpToggle={() => setIsHelpMode(true)}
              onBack={returnFromReview}
              isConnected={isConnected}
              walletAddress={address ?? undefined}
              //openWalletModal={openConnectModal}
              reviewType={userAction ?? "newContract"}
              isRefundSelected={isRefundSelected}
              isNewContractSelected={isNewContractSelected}
              onComplete={() => setStep(ModalStep.DoneStep)}
            />
          )}
        </>
      )}
      {step === ModalStep.DoneStep && (
        <DoneStep onClose={onClose} xchangeId={xchangeId} />
      )}
    </div>
  );
};