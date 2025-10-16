import React, { useState } from "react";
import { Token } from "~~/components/constants/tokens";
import { projectDetails } from "~~/components/invest/projectDetails";
import { ProjectPreview } from "~~/components/invest/projectPreview";

type ProjectKey = keyof typeof projectDetails;

// Helper to safely get project details object by key with type-safe indexing
function getProjectDetails(key: string): typeof projectDetails[ProjectKey] | undefined {
  if ((Object.keys(projectDetails) as string[]).includes(key)) {
    return projectDetails[key as ProjectKey];
  }
  return undefined;
}

export type Props = {
  supportedTokens: Token[];
  selectedTokenSymbol: string;
  setSelectedTokenSymbol: (symbol: string) => void;
  selectedTokenSymbol2: string;
  setSelectedTokenSymbol2: (symbol: string) => void;
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

export const RegionStep: React.FC<Props> = ({
  supportedTokens,
  selectedTokenSymbol,
  setSelectedTokenSymbol,
  selectedTokenSymbol2,
  setSelectedTokenSymbol2,
  selectedQuarter,
  setSelectedQuarter,
  depositAmount,
  setDepositAmount,
  onHelpToggle,
  onNext,
  onPrevious,
}) => {
  // Use helper to get typed details safely
  const details = getProjectDetails(selectedTokenSymbol);

  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setUserEmail(email);

    if (email === "" || validateEmail(email)) {
      setEmailError("");
    } else {
      setEmailError("Please enter a valid email address");
    }
  };

  const isDisabled =
    selectedTokenSymbol2 === "" || depositAmount === "" || selectedTokenSymbol === "";

  return (
    <div className="flex flex-col space-y-4">
      <div className="px-0">
        <h2 className="text-xl font-light text-primary">INVESTMENT DETAILS</h2>
      </div>
      <div className="flex flex-col justify-between h-full rounded-xl">
        <div className="space-y-4">
          <div>
            <select
              className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
              value={selectedTokenSymbol}
              onChange={e => {
                setSelectedTokenSymbol(e.target.value);
                setSelectedQuarter(9);
              }}
            >
              <option value="" disabled>
                Select Venture
              </option>
              {supportedTokens
                .filter(t => ["GLB", "TGUSA", "TGMX"].includes(t.symbol))
                .map(t => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <select
              className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
              value={selectedTokenSymbol}
              onChange={e => setSelectedTokenSymbol(e.target.value)}
            >
              <option value="" disabled>                                                                                                                  
                Select Payment Method
              </option>
              {supportedTokens
                .filter(t => !["GLB", "GBDx", "GBDo"].includes(t.symbol))
                .map(t => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
          {details ? <ProjectPreview {...details} /> : null}
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
