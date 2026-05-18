import React, { useState } from "react";
import { Token } from "~~/components/constants/tokens";
import { WalletConnectButton } from "~~/utils/globalEco/walletConnectButton";
import { WalletIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

type Props = {
  amount: string;
  committedQuarters: number;
  token: Token;
  token2: Token;
  summary: {
    unlockLabel: string;
    eligibilityLabel: string;
    multiplier: number;
  } | null;
  connectedWallet: string | undefined
  onPrevious: () => void;
  onConfirm: () => void;
  onHelpToggle: () => void;
  isProcessing: boolean;
  disabled: boolean;
};

export function ConfirmStep({
  amount,
  committedQuarters,
  token,
  token2,
  summary,
  connectedWallet,
  onPrevious,
  onConfirm,
  onHelpToggle,
  isProcessing,
  disabled,
}: Props) {
  const [showWalletNotice, setShowWalletNotice] = useState(false);

  return (
    <div className="flex flex-col flex-full h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-light text-primary tracking-wide">CONTRACT SUMMARY & CONFIRMATION</h3>
          <p className="font-semibold text-justify text-sm pr-10 text-secondary">
            BE ADVISED: <span className="font-semibold text-sm text-primary">Vault and Venture contract investing is <span className= "font semibold text-secondary" >IRREVERSIBLE</span>. While no refunds are possible trading or selling of your assets are possible prior to beginning the redemption process. Please REVIEW ALL VALUES before proceeding. Returns or redemption of original investment are outlined in the Terms & Conditions, Overview & Disclosure.</span>
          </p>
        </div>
        <button
          onClick={onHelpToggle}
          aria-label="Toggle help"
          className="text-primary hover:text-secondary flex items-center gap-1"
        >
          <HelpOutlineIcon />
          
        </button>
      </div>
        <div className="flex flex-col justify-between h-full rounded-xl"> 
          <div className="flex-grow max-h-250 sm:max-h-98 overflow-y-auto mb-4 pt-6 bg-base-200 border px-4 border-base-300 rounded-md shadow-sm text-sm">
            {/* Summary info */}
          <div className="flex justify-between items-center border-b border-base-300 pb-2">
            <p className="text-white/50 uppercase tracking-wide text-xs font-light">
              Investment Amount
            </p>
            <p className="font-bold text-white">
              {amount}
            </p>
          </div>

          {/* Conditional Venture Name */}
          {token2 && (
            <div className="flex justify-between items-center border-b border-base-300 pb-2">
              <p className="text-white/50 uppercase tracking-wide text-xs font-light">
                Venture Name
              </p>
              <p className="font-bold text-white">{token2.name}</p>
            </div>
          )}

          <div className="flex justify-between items-center border-b border-base-300 pb-2">
            <p className="text-white/50 uppercase tracking-wide text-xs font-light">
              Quarters to Invest
            </p>
            <p className="font-bold text-white">{committedQuarters}</p>
          </div>

          <div className="flex justify-between items-center border-b border-base-300 pb-2">
            <p className="text-white/50 uppercase tracking-wide text-xs font-light">
              Unlock Quarter
            </p>
            <p className="font-bold text-white">{summary?.unlockLabel}</p>
          </div>

          <div className="flex justify-between items-center border-b border-base-300 pb-2">
            <p className="text-white/50 uppercase tracking-wide text-xs font-light">
              Eligibility Quarter
            </p>
            <p className="font-bold text-white">{summary?.eligibilityLabel}</p>
          </div>

          {/* Only show multiplier if valid */}
          {summary?.multiplier ? (
            <div className="flex justify-between items-center border-b border-base-300 pb-2">
              <p className="text-white/50 uppercase tracking-wide text-xs font-light">
                Investment Multiplier
              </p>
              <p className="font-bold text-white">{summary.multiplier}%</p>
            </div>
          ) : null}

          <div className="text-sm text-gray-400 text-justify leading-relaxed mt-6 space-y-2">
            <p>
              This transaction is <span className="font-semibold text-red">Irreversible</span>. A{" "}
              <span className="font-semibold text-white">.25%</span> protocol fee will be deducted from your
              deposited amount and issued dividend tokens will be based on the deposited amount less the protocol fee.
              Your investment and any rewards{" "}
              <span className="italic text-white">will not</span> be available until you reach your{" "}
              <span className="font-semibold text-white">Invest Unlock Quarter</span>.
              By clicking <span className="font-semibold text-white">Confirm</span>, you consent to invest the total
              stated above and accept the conditions outlined in the investment process.
            </p>
          </div>
        </div>
        {/* Wallet connect section and buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4 border-t bg-transparent w-full">
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
            <WalletConnectButton />
            {!connectedWallet && (
              <div className="relative inline-block">
                <button
                  onClick={() => setShowWalletNotice(true)}
                  className="w-6 h-6 rounded-full bg-white/30 hover:bg-red-200 flex items-center justify-center"
                  title="Wallet Required"
                >
                  <ExclamationCircleIcon className="w-4 h-4 text-red-600" />
                </button>
                {showWalletNotice && (
                  <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/70 border-t border-red-300 shadow-lg px-4 max-h-[40vh] overflow-y-auto animate-slide-up">
                    <div className="flex items-center gap-2 mb-4">
                      <WalletIcon className="w-6 h-6 text-red-500" />
                      <h2 className="text-lg mt-2 font-semibold text-red-600">WALLET REQUIRED</h2>
                    </div>
                    <p className="text-sm text-black mb-2">
                      Connect your wallet to continue. This ensures secure and personalized access.
                    </p>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setShowWalletNotice(false)}
                        className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Got it
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row justify-center sm:justify-end items-center gap-2">
            <button
              className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
              onClick={onPrevious}
            >
              Previous
            </button>
            <button className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
              onClick={() => {
                console.log("click confirmed")
                onConfirm();
              }}
              disabled={!connectedWallet || isProcessing || disabled}
             >
              {isProcessing ? "Processing..." : "CONFIRM"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}