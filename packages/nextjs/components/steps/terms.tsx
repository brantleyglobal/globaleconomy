"use client";

import React from "react";

type Props = {
  termsText: string | null;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  setCurrentStep: (step: number) => void;
  currentStep: number;
  customizeGroupKey: string | null;
  selectedVariations: Record<string, { label: string }>;
};

export const TermsStep: React.FC<Props> = ({
  termsText,
  termsAccepted,
  setTermsAccepted,
  setCurrentStep,
  currentStep,
  customizeGroupKey,
  selectedVariations,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        <h3 className="text-lg font-light">TERMS & CONDITIONS</h3>

        {/* Scrollable Terms Text */}
        <div className="max-h-[350px] overflow-y-auto text-sm border p-3 rounded bg-black text-justify text-info-300">
          {termsText || "Loading…"}
        </div>

        {/* Acceptance Checkbox */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={() => setTermsAccepted(!termsAccepted)}
          />
          I agree to the Terms & Conditions
        </label>
      </div>

      {/* Sticky Footer Navigation */}
      <div className="flex justify-end gap-2 p-4 border-t bg-transparent">
        <button
          className="btn btn-secondary rounded-md text-white h-6 btn-sm"
          onClick={() => {
            if (
              customizeGroupKey &&
              selectedVariations[customizeGroupKey]?.label === "Customize"
            ) {
              setCurrentStep(2);
            } else {
              setCurrentStep(1);
            }
          }}
        >
          Previous
        </button>
        <button
          className="btn btn-primary px-6 rounded-md text-white h-6 btn-sm"
          onClick={() => {
            if (termsAccepted) {
              setCurrentStep(4);
            }
          }}
          disabled={!termsAccepted}
        >
          Next
        </button>
      </div>
    </div>
  );
};
