import { useState, useEffect } from "react";
import { useScaffoldWriteContract } from "~~/hooks/globalDEX/useScaffoldWriteContract";
import { Modal } from "~~/components/common/modal";
import { supportedTokens, Token } from "~~/components/constants/tokens";

type Props = {
  amount: bigint;
  committedQuarters: number;
  token: Token;
  isOpen: boolean;
  onClose: () => void;
};

export const InvestmentModal: React.FC<Props> = ({
  amount,
  committedQuarters,
  token,
  isOpen,
  onClose,
}) => {
  // 1) Bail out if the parent hasn’t opened us
  if (!isOpen) return null;

  // 2) Local wizard state
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [summary, setSummary] = useState<{
    unlockQ: number;
    eligibilityQ: number;
    multiplier: number;
  } | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [termsText, setTermsText] = useState("");
  const [policyText, setPolicyText] = useState("");

  // 3) Load legal text once
  useEffect(() => {
    fetch("/legal/investorOverview.txt")
      .then((r) => r.text())
      .then(setTermsText);
    fetch("/legal/privacy-policy.txt")
      .then((r) => r.text())
      .then(setPolicyText);
  }, []);

  // 4) Compute summary on step 3
  useEffect(() => {
    if (step === 3) {
      const now = Date.now() / 1000;
      const q = getQuarter(now);
      setSummary({
        unlockQ: q + committedQuarters,
        eligibilityQ: computeEligibilityQuarter(now, committedQuarters),
        multiplier: getMultiplier(now, committedQuarters),
      });
    }
  }, [step, committedQuarters]);

  // 5) Prepare deposit call
  const { writeContractAsync, isMining } = useScaffoldWriteContract({
    contractName: "SmartVault",
  });
  const handleDeposit = async () => {
    try {
      const tx = await writeContractAsync({
        functionName: "deposit",
        args: [amount, committedQuarters],
      });
      if (tx) {
        setTxHash(tx);
        setStep(5); // move to confirmation
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Confirm Investment">
      <div className="space-y-4 h-[500px] flex flex-col">
        {/* STEP 1: Terms */}
        {step === 1 && (
          <>
            <h3 className="font-semibold">Investment Terms</h3>
            <div className="flex-1 overflow-y-auto text-sm border p-2 bg-black rounded">
              {termsText || "Loading…"}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={() => setTermsAccepted(!termsAccepted)}
              />
              I agree to the Investment Terms
            </label>
            <button
              className="btn btn-primary btn-sm ml-auto"
              disabled={!termsAccepted}
              onClick={() => setStep(2)}
            >
              Next
            </button>
          </>
        )}

        {/* STEP 2: Privacy Policy */}
        {step === 2 && (
          <>
            <h3 className="font-semibold">Privacy Policy</h3>
            <div className="flex-1 overflow-y-auto text-sm border text-justify p-2 bg-black rounded">
              {policyText || "Loading…"}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={policyAccepted}
                onChange={() => setPolicyAccepted(!policyAccepted)}
              />
              I agree to the Privacy Policy
            </label>
            <div className="flex justify-between">
              <button
                className="btn btn-sm"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                className="btn btn-primary btn-sm"
                disabled={!policyAccepted}
                onClick={() => setStep(3)}
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* STEP 3: Summary */}
        {step === 3 && summary && (
          <>
            <h3 className="font-semibold">Smart Contract Summary</h3>
            <div className="flex-1 overflow-y-auto text-sm border text-justify p-2 bg-black rounded space-y-1">
              <p>
                Amount:{" "}
                <strong>
                  {Number(amount) / 10 ** token.decimals} {token.symbol}
                </strong>
              </p>
              <p>
                Quarters: <strong>{committedQuarters}</strong>
              </p>
              <p>
                Unlock Qtr: <strong>{summary.unlockQ}</strong>
              </p>
              <p>
                Eligibility Qtr: <strong>{summary.eligibilityQ}</strong>
              </p>
              <p>
                Multiplier: <strong>{summary.multiplier}%</strong>
              </p>
            </div>
            <div className="flex justify-between">
              <button
                className="btn btn-sm"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                className="btn btn-success btn-sm"
                onClick={() => setStep(4)}
              >
                Confirm Summary
              </button>
            </div>
          </>
        )}

        {/* STEP 4: Ready to Commit */}
        {step === 4 && (
          <>
            <h3 className="font-semibold">Ready to Commit</h3>
            <p className="flex-1">
              About to deposit{" "}
              <strong>
                {Number(amount) / 10 ** token.decimals} {token.symbol}
              </strong>
              . This is irreversible.
            </p>
            <div className="flex justify-between">
              <button
                className="btn btn-sm"
                onClick={() => setStep(3)}
              >
                Back
              </button>
              <button
                className="btn btn-success btn-sm"
                onClick={handleDeposit}
                disabled={isMining}
              >
                {isMining ? "Processing…" : "Confirm Deposit"}
              </button>
            </div>
          </>
        )}

        {/* STEP 5: Confirmation */}
        {step === 5 && txHash && (
          <>
            <h3 className="font-semibold">Investment Confirmed</h3>
            <p className="flex-1">
              View tx:{" "}
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                className="underline text-blue-500"
              >
                {txHash.slice(0, 10)}…
              </a>
            </p>
            <button
              className="btn btn-sm ml-auto"
              onClick={onClose}
            >
              Close
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};

// --- Mock implementations (for client-side preview) ---
function getQuarter(ts: number): number {
  const year = 1970 + ts / 31556926;
  const month = (ts / 2592000) % 12 + 1;
  return Math.floor(year * 4 + ((month - 1) / 3));
}
function computeEligibilityQuarter(ts: number, committed: number): number {
  const q = getQuarter(ts);
  const start = getQuarterStart(ts);
  const daysIntoQuarter = (ts - start) / 86400;
  const grace = committed >= 3 ? 20 : 0;
  return daysIntoQuarter <= grace ? q : q + 1;
}
function getQuarterStart(ts: number): number {
  const year = 1970 + ts / 31556926;
  const month = (ts / 2592000) % 12 + 1;
  const quarterStart = ((month - 1) / 3) * 3 + 1;
  return toTimestamp(year, quarterStart, 1);
}
function toTimestamp(year: number, month: number, day: number): number {
  return (year - 1970) * 365 * 86400 + (month - 1) * 30 * 86400 + (day - 1) * 86400;
}
function getMultiplier(ts: number, committed: number): number {
  return committed >= 6 ? 200 : committed >= 4 ? 150 : 125;
}
