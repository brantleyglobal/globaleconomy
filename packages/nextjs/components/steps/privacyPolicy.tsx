"use client";

import React from "react";

type Props = {
  privacyText?: string | null;
  privacyAccepted: boolean;
  setPrivacyAccepted: (value: boolean) => void;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
};

export const PrivacyPolicyStep: React.FC<Props> = ({
  privacyText,
  privacyAccepted,
  setPrivacyAccepted,
  setCurrentStep,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        <h3 className="text-lg font-light">PRIVACY POLICY</h3>

        {/* Scrollable Policy Text */}
        <div className="max-h-[350px] overflow-y-auto text-sm border p-3 rounded bg-black text-justify text-info-300">
          {privacyText || "Loading…"}
        </div>

        {/* Acceptance Checkbox */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={() => setPrivacyAccepted(!privacyAccepted)}
          />
          I agree to the Privacy Policy
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
            if (privacyAccepted) {
              setCurrentStep(6);
            }
          }}
          disabled={!privacyAccepted}
        >
          Next
        </button>
      </div>
    </div>
  );
};
