"use client";

import React from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { toast } from "react-hot-toast";

interface DoneStepProps {
  onClose: () => void;
  receiptHash?: string;
  userEmail?: string;
  actionType: "refund" | "repair";
}

export const DoneStep: React.FC<DoneStepProps> = ({ 
  onClose, 
  receiptHash, 
  userEmail, 
  actionType 
}) => {

  const copyToClipboard = () => {
    if (receiptHash) {
      navigator.clipboard.writeText(receiptHash);
      toast.success("Transaction reference ID copied to clipboard!");
    }
  };

  const titleText = actionType === "refund" 
    ? "REFUND PROCESSING COMPLETE" 
    : "REPAIR INTAKE REGISTRATION COMPLETE";

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 bg-transparent text-center overflow-y-auto">
      {/* Dynamic Header Step Alert */}
      <div className="w-16 h-16 bg-secondary/20 text-secondary rounded-full flex items-center justify-center mb-4 text-2xl font-bold animate-pulse">
        ✓
      </div>
      
      <h3 className="text-xl font-light text-primary mb-2 tracking-wide uppercase">
        {titleText}
      </h3>
      
      {userEmail && (
        <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
          An interactive operational summary layout has been dispatched to{" "}
          <span className="text-white font-mono font-medium">{userEmail}</span>.
        </p>
      )}

      {/* Hex Reference Tracking Clipboard */}
      {receiptHash && (
        <div className="mb-6 w-full max-w-md bg-black/40 border border-white/5 p-4 rounded-lg">
          <label className="block mb-2 text-gray-400 font-mono text-[10px] tracking-widest uppercase">
            System Receipt Ledger Identity
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={receiptHash}
              className="w-full px-3 py-2 text-xs rounded bg-black text-gray-300 font-mono select-all border-none focus:outline-none focus:ring-0"
            />
            <button
              onClick={copyToClipboard}
              className="flex items-center justify-center p-2 bg-white/5 hover:bg-secondary/20 text-white rounded-md transition-all duration-200 active:scale-[0.95]"
              aria-label="Copy Tracking Hash ID"
            >
              <ContentCopyIcon className="h-4 w-4 text-primary" />
            </button>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-1">
        Track your repair request status at any time.
      </p>

      {/* Control Navigation Elements */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mt-4 w-full justify-center">
        <a
          href="/dashboard"
          className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center px-6 w-full sm:w-auto font-medium"
        >
          Go to Dashboard
        </a>
        <button
          onClick={onClose}
          className="btn bg-white/5 hover:bg-white/10 btn-sm h-8 text-xs text-gray-400 rounded-md flex items-center justify-center px-6 w-full sm:w-auto font-light"
        >
          DISMISS
        </button>
      </div>
    </div>
  );
};