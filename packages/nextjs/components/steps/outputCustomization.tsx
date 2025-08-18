"use client";

import React from "react";
import { useCheckoutStore } from "~~/components/useCheckoutStore";

type Props = {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  selectedVoltage: number;
  setSelectedVoltage: (v: number) => void;
  selectedFrequency: "50Hz" | "60Hz" | null;
  setSelectedFrequency: (v: "50Hz" | "60Hz") => void;
  selectedPhase: "Single-Phase" | "Split-Phase" | "3-Phase" | null;
  setSelectedPhase: (v: "Single-Phase" | "Split-Phase" | "3-Phase") => void;
  isRestrictedCombo: boolean;
};

const frequencyOptions: Array<"50Hz" | "60Hz"> = ["50Hz", "60Hz"];
const phaseOptions: Array<"Single-Phase" | "Split-Phase" | "3-Phase"> = [
  "Single-Phase",
  "Split-Phase",
  "3-Phase",
];

export const OutputCustomizationStep: React.FC<Props> = ({
  currentStep,
  setCurrentStep,
  selectedVoltage,
  setSelectedVoltage,
  selectedFrequency,
  setSelectedFrequency,
  selectedPhase,
  setSelectedPhase,
  isRestrictedCombo,
}) => {
  const setField = useCheckoutStore(state => state.setField);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        <h3 className="text-xl font-light tracking-tight mb-4 text-info">
          CUSTOMIZE OUTPUT
        </h3>

        {/* Voltage Selector */}
        <div>
          <label className="block text-xs font-light text-info-400 mt-10 mb-6">
            VOLTAGE OUTPUT
          </label>
          <input
            type="range"
            min={120}
            max={800}
            step={10}
            value={selectedVoltage}
            onChange={(e) => {
              const voltage = Number(e.target.value);
              setSelectedVoltage(voltage);
              setField("voltage", voltage);
            }}
            className="range range-secondary w-full"
          />
          <p className="text-sm text-center text-light text-info-300">
            Voltage: <strong>{selectedVoltage}</strong>
          </p>
        </div>

        {/* Frequency Picker */}
        <div>
          <label className="block text-xs font-light text-info-400 mt-10 mb-6">
            FREQUENCY OUTPUT
          </label>
          <div className="grid grid-cols-2 gap-3">
            {frequencyOptions.map((frequency) => (
              <button
                key={frequency}
                onClick={() => {
                  setSelectedFrequency(frequency);
                  setField("frequency", frequency);
                }}
                className={`w-full py-2 border rounded-full text-sm btn-black ${
                  selectedFrequency === frequency
                    ? "bg-secondary text-info border-info"
                    : "bg-black/50 border-info text-info-400 hover:bg-neutral-800"
                }`}
              >
                {frequency}
              </button>
            ))}
          </div>
          <p className="text-sm mt-6 mb-6 text-light text-center text-info-300">
            Frequency: <strong>{selectedFrequency || "—"}</strong>
          </p>
        </div>

        {/* Phase Picker */}
        <div>
          <label className="block text-xs font-light text-info-400 mt-10 mb-6">
            PHASE OUTPUT
          </label>
          <div className="grid grid-cols-3 gap-3">
            {phaseOptions.map((phase) => (
              <button
                key={phase}
                onClick={() => {
                  setSelectedPhase(phase);
                  setField("phase", phase);
                }}
                className={`w-full py-2 border rounded-full text-sm btn-black ${
                  selectedPhase === phase
                    ? "bg-secondary text-info border-info"
                    : "bg-black/50 border-info text-info-400 hover:bg-neutral-800"
                }`}
              >
                {phase}
              </button>
            ))}
          </div>
          <p className="text-sm mt-6 mb-6 text-light text-center text-info-300">
            Phase: <strong>{selectedPhase || "—"}</strong>
          </p>
        </div>
      </div>

      {/* Sticky Footer Navigation */}
      <div className="flex justify-end gap-2 p-4 border-t bg-transparent">
        {currentStep > 1 && (
          <button
            className="btn btn-secondary rounded-md text-white h-6 btn-sm"
            onClick={() => setCurrentStep(Math.max(currentStep - 1, 1))}
          >
            Previous
          </button>
        )}
        <button
          className={`btn btn-round px-6 btn-primary rounded-md text-white h-6 btn-sm ${
            isRestrictedCombo ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isRestrictedCombo}
          onClick={() => setCurrentStep(currentStep + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
