"use client";

import React, { useEffect } from "react";
import { useCheckoutStore } from "~~/components/purchase/useCheckoutStore";
import type { AssetVariation } from "~~/components/purchase/checkoutModal";

type Props = {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  selectedVariations: Record<string, AssetVariation>;
  setSelectedVariations: (value: Record<string, AssetVariation>) => void;
  selectedVoltage: number;
  setSelectedVoltage: (v: number) => void;
  selectedFrequency: "50Hz" | "60Hz" | null;
  setSelectedFrequency: (v: "50Hz" | "60Hz") => void;
  selectedPhase: "Single-Phase" | "Split-Phase" | "3-Phase" | null;
  setSelectedPhase: (v: "Single-Phase" | "Split-Phase" | "3-Phase") => void;
  selectedReactor: "Default (None)" | "Line Reactor(s)" | null;
  setSelectedReactor: (v: "Default (None)" | "Line Reactor(s)") => void;
  isRestrictedCombo: boolean;
};

const DEFAULT_FREQUENCY: "50Hz" | "60Hz" = "60Hz";
const DEFAULT_PHASE: "Single-Phase" | "Split-Phase" | "3-Phase" = "3-Phase";
const DEFAULT_REACTOR: "Line Reactor(s)" | "Default (None)" = "Default (None)" ;


const frequencyOptions: Array<"50Hz" | "60Hz"> = ["50Hz", "60Hz"];
const phaseOptions: Array<"Single-Phase" | "Split-Phase" | "3-Phase"> = [
  "Single-Phase",
  "Split-Phase",
  "3-Phase",
];

const reactorOptions: Array< "Default (None)" | "Line Reactor(s)"> = [
  "Default (None)",
  "Line Reactor(s)",
];

export const OutputCustomizationStep: React.FC<Props> = ({
  currentStep,
  setCurrentStep,
  selectedVariations,
  setSelectedVariations,
  selectedVoltage,
  setSelectedVoltage,
  selectedFrequency,
  setSelectedFrequency,
  selectedPhase,
  setSelectedPhase,
  selectedReactor,
  setSelectedReactor,
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
    if (!selectedReactor) {
      setSelectedReactor(DEFAULT_REACTOR);
      setField("reactor", DEFAULT_REACTOR);
    }
  }, []);

  const epanelSelected = selectedVariations["epanel"];

  return (
    <div className="flex flex-col h-full">
    <div className="flex-grow p-4 space-y-4">
      <h3 className="text-2xl font-light tracking-tight text-primary">
        Customize Output
      </h3>

    {/* Voltage Selector */}
    <div className="rounded-xl border border-secondary/30 bg-black/70 shadow-md p-3">
      <h4 className="text-xs uppercase tracking-wide text-info-400 mb-4">
        Voltage Output
      </h4>
      <input
        type="range"
        min={120}
        max={800}
        step={10}
        value={selectedVoltage}
        onChange={(e) => {
          const rawVoltage = Number(e.target.value);
          setSelectedVoltage(rawVoltage);
          setField("voltage", `${rawVoltage}V`);
        }}
        className="range-secondary40 w-full"
      />
      <p className="text-xs text-center mt-2 text-info-300">
        Voltage: <span className="font-semibold">{selectedVoltage}V</span>
      </p>
    </div>

    {/* Frequency Picker */}
    <div className="rounded-xl border border-secondary/30 bg-black/70 shadow-md p-3">
      <h4 className="text-xs uppercase tracking-wide text-info-400 mb-4">
        Frequency Output
      </h4>
      <div className="grid grid-cols-2 gap-4">
        {frequencyOptions.map((frequency) => {
          const isSelected = selectedFrequency === frequency;
          return (
            <button
              key={frequency}
              onClick={() => {
                setSelectedFrequency(frequency);
                setField("frequency", frequency);
              }}
              className={`w-full py-1.5 rounded-md text-sm transition-all duration-200 ${
                isSelected
                  ? "bg-secondary/40 text-info shadow-md"
                  : "bg-white/2 text-info-400 hover:bg-secondary/20"
              }`}
            >
              {frequency}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-center mt-3 text-info-300">
        Frequency: <span className="font-semibold">{selectedFrequency || "—"}</span>
      </p>
    </div>

    {/* Phase Picker */}
    <div className="rounded-xl border border-secondary/30 bg-black/70 shadow-md p-3">
      <h4 className="text-xs uppercase tracking-wide text-info-400 mb-4">
        Phase Output
      </h4>
      <div className="grid grid-cols-3 gap-4">
        {phaseOptions.map((phase) => {
          const isSelected = selectedPhase === phase;
          return (
            <button
              key={phase}
              onClick={() => {
                setSelectedPhase(phase);
                setField("phase", phase);
              }}
              className={`w-full py-1.5 rounded-md text-sm transition-all duration-200 ${
                isSelected
                  ? "bg-secondary/40 text-info shadow-md"
                  : "bg-white/2 text-info-400 hover:bg-secondary/20"
              }`}
            >
              {phase}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-center mt-3 text-info-300">
        Phase: <span className="font-semibold">{selectedPhase || "—"}</span>
      </p>
    </div>
    {/* Phase Reactor */}
    {!epanelSelected && (
      <div className="rounded-xl border border-secondary/30 bg-black/70 shadow-md p-3">
        <h4 className="text-xs uppercase tracking-wide text-info-400 mb-4">
          Line Reactor
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {reactorOptions.map((reactor) => {
            const isSelected = selectedReactor === reactor;
            return (
              <button
                key={reactor}
                onClick={() => {
                  setSelectedReactor(reactor);
                  setField("reactor", reactor);
                }}
                className={`w-full py-1.5 rounded-md text-sm transition-all duration-200 ${
                  isSelected
                    ? "bg-secondary/40 text-info shadow-md"
                    : "bg-white/2 text-info-400 hover:bg-secondary/20"
                }`}
              >
                {reactor}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-center mt-3 text-info-300">
          Reactor: <span className="font-semibold">{selectedReactor || "—"}</span>
        </p>
      </div>
    )}
  </div>

  {/* Footer Navigation */}
  <div className="flex flex-row justify-between items-center px-6 pt-4 border-t bg-black/20 shadow-inner">
    <button
      className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md px-6 disabled:opacity-50"
      onClick={() => setCurrentStep(Math.max(currentStep - 1, 0))}
      disabled={currentStep <= 0}
    >
      Previous
    </button>
    <button
      className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md px-6 disabled:opacity-50"
      onClick={() => setCurrentStep(currentStep + 1)}
      disabled={isRestrictedCombo}
    >
      Next
    </button>
  </div>
</div>


  );
};
