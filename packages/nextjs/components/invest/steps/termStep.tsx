import React, { useState } from "react";
import { Token } from "~~/components/constants/tokens";

export type Props = {
  supportedTokens: Token[];
  selectedTokenSymbol: string;
  setSelectedTokenSymbol: (symbol: string) => void;
  selectedQuarter: number;
  setSelectedQuarter: (q: number) => void;
  depositAmount: string;
  setDepositAmount: (amount: string) => void;
  userFirstName: string;
  setUserFirstName: (val: string) => void;
  userLastName: string;
  setUserLastName: (val: string) => void;
  userEmail: string;
  setUserEmail: (val: string) => void;
  onHelpToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
};

export const TermStep: React.FC<Props> = ({
  supportedTokens,
  selectedTokenSymbol,
  setSelectedTokenSymbol,
  selectedQuarter,
  setSelectedQuarter,
  depositAmount,
  setDepositAmount,
  onHelpToggle,
  onNext,
  onPrevious,
}) => {

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
    
  const isDisabled =
    selectedQuarter === 0 || depositAmount === "" || selectedTokenSymbol === "";

  return (
    <div className="flex flex-col h-full space-y-4">
    {/* Header - separate from background */}
    <div className="px-0">
        <h2 className="text-xl font-light text-primary">INVESTMENT DETAILS</h2>
    </div>
    <div className="flex flex-col justify-between h-full rounded-xl">     
      <div className="space-y-4">
        <div>
          <select
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
            value={selectedTokenSymbol}
            onChange={e => setSelectedTokenSymbol(e.target.value)}
          >
            <option value="" disabled>Select Deposit Method</option>
            {supportedTokens
              .filter(t => !["GBDo", "GBDx", "COPx", "GLB", "TGUSA", "TGMX", "BGFFS", "BGFRS"].includes(t.symbol))
              .map(t => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol} • {t.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <select
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
            value={selectedQuarter || ""}
            onChange={e => setSelectedQuarter(Number(e.target.value))}
          >
            <option value="">Select Investment Duration | Number of Quarters</option>
            {[2, 3, 4, 5, 6, 7, 8].map(q => (
              <option key={q} value={q}>
                {q} Quarter{q > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
            placeholder="Enter Amount"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
          />
        </div>
        {/* Email inputs */}
        <div className="mt-12">
          <p className="text-white/50 uppercase tracking-wide text-xs font-semibold">
            EMAIL FOR CONFIRMATION
          </p>
        </div>
        <div className="space-y-4">
          <input
            type="name"
            placeholder="First Name"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
            onChange={e => setUserFirstName(e.target.value)}
          />
          <input
            type="name"
            placeholder="Last Name"
            className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
            onChange={e => setUserLastName(e.target.value)}
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
      </div>
    </div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 py-4 border-t bg-transparent w-full">
        <button
          className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
          onClick={onPrevious}
        >
          Previous
        </button>
        <button
          className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
          disabled={isDisabled}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
};

