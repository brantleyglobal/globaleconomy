"use client";

import React from "react";

type Props = {
  returnsText: string | null;
  returnsAccepted: boolean;
  setReturnsAccepted: (v: boolean) => void;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  currentStep: number;
  customizeGroupKey: string | null;
  selectedVariations: Record<string, { label: string }>;
};

export const ReturnsStep: React.FC<Props> = ({
  returnsText,
  returnsAccepted,
  setReturnsAccepted,
  setCurrentStep,
  currentStep,
  customizeGroupKey,
  selectedVariations,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        <h3 className="text-lg font-light">RETURNS & REFUNDS</h3>

        {/* Scrollable Returns Text */}
        <div className="max-h-[350px] overflow-y-auto text-sm border p-3 rounded bg-black text-justify text-info-300">
          {returnsText || "Loading…"}
        </div>

        {/* Acceptance Checkbox */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={returnsAccepted}
            onChange={() => setReturnsAccepted(!returnsAccepted)}
          />
          I agree to the Returns & Refunds Policy
        </label>
      </div>

      {/* Sticky Footer Navigation */}
      <div className="flex justify-end gap-2 p-4 border-t bg-transparent">
        <button
          className="btn btn-secondary rounded-md text-white h-6 btn-sm"
          onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
        >
          Previous
        </button>
        <button
          className="btn btn-primary px-6 rounded-md text-white h-6 btn-sm"
          onClick={() => {
            if (returnsAccepted) {
              setCurrentStep(5);
            }
          }}
          disabled={!returnsAccepted}
        >
          Next
        </button>
      </div>
    </div>
  );
};
