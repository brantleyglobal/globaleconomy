"use client";

import React from "react";
import type { AssetVariation } from "../checkoutModal";

type Props = {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  variationGroups: Record<string, AssetVariation[]>;
  selectedVariations: Record<string, AssetVariation>;
  setSelectedVariations: (value: Record<string, AssetVariation>) => void;
  customizeGroupKey: string | null;
  setCustomizeGroupKey: (key: string | null) => void;
};

export const SystemConfigurationStep: React.FC<Props> = ({
  setCurrentStep,
  variationGroups,
  selectedVariations,
  setSelectedVariations,
  customizeGroupKey,
  setCustomizeGroupKey,
}) => {
  const variationDisplayLabels: Record<string, string> = {
    epanel: "Panel Configuration",
    xpanel: "Panel Configuration",
    monitoring: "Remote Monitoring",
    etie: "Grid Integration",
    xtie: "Grid Integration",
  };

  const renderVariationGroup = (
    groupKey: keyof typeof variationGroups,
    labelKey: keyof typeof variationDisplayLabels,
    currency: "GBDO" | "USD"
  ) => {
    const group = variationGroups[groupKey];
    if (!group) return null;

    return (
      <div>
        <h4 className="text-xs font-light text-info-400 mb-2 mt-8 uppercase tracking-wide">
          {variationDisplayLabels[labelKey] || labelKey}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {group.map(variation => {
            const isSelected = selectedVariations[groupKey]?.label === variation.label;
            return (
              <button
                key={`${groupKey}-${variation.label}`}
                onClick={() => {
                  setSelectedVariations({ ...selectedVariations, [groupKey]: variation });
                  setCustomizeGroupKey(variation.label === "Customize" ? groupKey : null);
                }}
                className={`w-full h-[60px] p-3 border rounded-md shadow-sm flex flex-col justify-between ${
                  isSelected
                    ? "bg-neutral-800 border-none text-info hover:bg-secondary/30"
                    : "bg-neutral-800 border-none hover:bg-secondary/30"
                }`}
              >
                <div className="font-light">{variation.label}</div>
                <div className="text-xs text-info-300">
                  +${Number(variation.apriceInGBDO) / 1e6} {currency}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleNext = () => {
    const shouldCustomize =
      customizeGroupKey &&
      selectedVariations[customizeGroupKey]?.label === "Customize";
    setCurrentStep(shouldCustomize ? 2 : 3);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        <h3 className="text-xl font-light tracking-tight mb-10 text-info">
          SYSTEM CONFIGURATION
        </h3>

        {variationGroups.epanel
          ? renderVariationGroup("epanel", "epanel", "GBDO")
          : variationGroups.xpanel && renderVariationGroup("xpanel", "xpanel", "GBDO")}

        {variationGroups.etie
          ? renderVariationGroup("etie", "etie", "USD")
          : variationGroups.xtie && renderVariationGroup("xtie", "xtie", "USD")}

        {variationGroups.monitoring && renderVariationGroup("monitoring", "monitoring", "USD")}
      </div>

      <div className="flex justify-end gap-2 p-4 border-t bg-transparent">
        <button
          className="btn btn-primary px-6 rounded-md h-6 text-white btn-sm"
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
};
