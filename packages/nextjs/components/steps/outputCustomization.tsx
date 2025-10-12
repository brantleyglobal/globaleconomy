"use client";

import React, { useEffect } from "react";
import { useCheckoutStore } from "~~/components/purchase/useCheckoutStore";

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

const DEFAULT_FREQUENCY: "50Hz" | "60Hz" = "60Hz";
const DEFAULT_PHASE: "Single-Phase" | "Split-Phase" | "3-Phase" = "3-Phase";

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

  useEffect(() => {
    if (!selectedFrequency) {
      setSelectedFrequency(DEFAULT_FREQUENCY);
      setField("frequency", DEFAULT_FREQUENCY);
    }
    if (!selectedPhase) {
      setSelectedPhase(DEFAULT_PHASE);
      setField("phase", DEFAULT_PHASE);
    }
  }, []);

  return (
    <div className="flex flex-col h-full space-y-2">
      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        <h3 className="text-xl font-light tracking-tight mb-4 text-primary">
          CUSTOMIZE OUTPUT
        </h3>

        {/* Voltage Selector */}
        <div>
          {/*<label className="block text-xs font-light text-info-400 mt-6 mb-6">
            VOLTAGE OUTPUT
          </label>*/}
          <input
            type="range"
            min={120}
            max={800}
            step={10}
            value={selectedVoltage}
            onChange={(e) => {
              const rawVoltage = Number(e.target.value);
              const voltage = `${rawVoltage}V`;
              setSelectedVoltage(rawVoltage);
              setField("voltage", voltage);
            }}
            className="range range-secondary w-full mt-10"
          />
          <p className="text-sm text-center mt-1 mb-8 text-light text-info-300">
            VOLTAGE: <strong>{selectedVoltage}</strong>
          </p>
        </div>

        {/* Frequency Picker */}
        <div>
          {/*<label className="block text-xs font-light text-info-400 mt-6 mb-6">
            FREQUENCY OUTPUT
          </label>*/}
          <div className="grid grid-cols-2 gap-3 mt-15">
            {frequencyOptions.map((frequency) => {
              const isSelected = selectedFrequency === frequency;
              return (
                <button
                  key={frequency}
                  onClick={() => {
                    setSelectedFrequency(frequency);
                    setField("frequency", frequency);
                  }}
                  className={`relative w-full mt-1 py-2 border rounded-md text-sm btn-black overflow-hidden transition-all duration-200 ease-in-out
                    ${isSelected
                      ? "bg-secondary/30 text-info border-none"
                      : "bg-black/50 border-none text-info-400 hover:bg-secondary/30"
                    }`}
                >
                  {isSelected && (
                    <div className="absolute right-0 top-0 h-full w-1 bg-info rounded-l-md animate-slideFade" />
                  )}
                  {frequency}
                </button>
              );
            })}
          </div>
          <p className="text-sm mt-1 mb-8 text-light text-center text-info-300">
            FREQUENCY: <strong>{selectedFrequency || "—"}</strong>
          </p>
        </div>

        {/* Phase Picker */}
        <div>
          {/*<label className="block text-xs font-light text-info-400 mt-6 mb-6">
            PHASE OUTPUT
          </label>*/}
          <div className="grid grid-cols-3 gap-3 mt-15">
            {phaseOptions.map((phase) => {
              const isSelected = selectedPhase === phase;
              return (
                <button
                  key={phase}
                  onClick={() => {
                    setSelectedPhase(phase);
                    setField("phase", phase);
                  }}
                  className={`relative w-full py-2 border rounded-md text-sm btn-black overflow-hidden transition-all duration-200 ease-in-out
                    ${isSelected
                      ? "bg-secondary/30 text-info border-none"
                      : "bg-black/50 border-none text-info-400 hover:bg-secondary/30"
                    }`}
                >
                  {isSelected && (
                    <div className="absolute right-0 top-0 h-full w-1 bg-info rounded-l-md animate-slideFade" />
                  )}
                  {phase}
                </button>
              );
            })}
          </div>
          <p className="text-sm mt-1 text-light text-center text-info-300">
            PHASE: <strong>{selectedPhase || "—"}</strong>
          </p>
        </div>
      </div>

      {/* Sticky Footer Navigation */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-4 border-t bg-transparent w-full">
        {currentStep > 1 && (
          <button
            className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
            onClick={() => setCurrentStep(Math.max(currentStep - 1, 1))}
          >
            Previous
          </button>
        )}
        <button
          className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
          onClick={() => setCurrentStep(currentStep + 1)}
          disabled={isRestrictedCombo}
        >
          Next
        </button>
      </div>
    </div>
  );
};
