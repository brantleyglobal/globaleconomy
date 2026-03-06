"use client";

import React from "react";
import type { AssetVariation } from "~~/components/purchase/checkoutModal";

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
    currency: "GBDo" | "USD"
  ) => {
    const group = variationGroups[groupKey];
    if (!group) return null;

    return (
      <div>
        <h4 className="text-xs font-light text-info-400 mb-2 mt-8 uppercase tracking-wide">
          {variationDisplayLabels[labelKey] || labelKey}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {group.map((variation) => {
            const isSelected = selectedVariations[groupKey]?.label === variation.label;

            return (
              <button
                key={`${groupKey}-${variation.label}`}
                onClick={() => {
                  setSelectedVariations({ ...selectedVariations, [groupKey]: variation });
                  setCustomizeGroupKey(variation.label === "Customize" ? groupKey : null);
                }}
                  className={`relative w-full h-auto min-h-[48px] p-2 sm:p-3 border rounded-md shadow-sm flex flex-col justify-between transition-all duration-200 ease-in-out ${
                  isSelected
                    ? "bg-secondary/30 text-info border-none"
                    : "bg-black/50 text-info-400 border-none hover:bg-secondary/30"
                }`}
              >
                <div className="font-light">{variation.label}</div>
                <div className="text-xs text-info-300">
                  +${Number(variation.apriceInGBDo) / 1e6} {currency}
                </div>
                {/*{isSelected && (
                  <div className="absolute right-0 top-0 h-full w-1 bg-info rounded-l-md animate-slideFade" />
                )}*/}
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
    setCurrentStep(shouldCustomize ? 1 : 2);
  };

  return (
    <div className="flex flex-col flex-full h-full">
      <div className="px-0">
        <h3 className="text-xl font-light tracking-tight text-primary">SYSTEM CONFIGURATION</h3>
      </div>
      <div className="flex flex-col flex-full asjustify-between h-full rounded-xl"> 
        <div className="flex-grow text-xs sm:text-sm px-4 rounded text-justify text-white space-y-8">          
          {variationGroups.epanel
            ? renderVariationGroup("epanel", "epanel", "GBDo")
            : variationGroups.xpanel && renderVariationGroup("xpanel", "xpanel", "GBDo")}

          {variationGroups.etie
            ? renderVariationGroup("etie", "etie", "GBDo")
            : variationGroups.xtie && renderVariationGroup("xtie", "xtie", "GBDo")}

          {variationGroups.monitoring &&
            renderVariationGroup("monitoring", "monitoring", "GBDo")}

          {/* Volume Orders Section */}
          <div className="bg-black/40 border border-info-400 rounded-md mt-4 p-1 text-center">
            <p className="text-sm text-info-300">
              For <span className="font-semibold text-info">customized multi-unit systems, volume or bulk orders</span>, 
              please <a href="mailto:global@brantley-global.com" className="underline hover:text-secondary">
                contact directly
              </a>.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4 mt-4 border-t bg-transparent w-full">
          <button
            className="invisible btn btn-primary/15 btn-sm h-8 text-xs rounded-md px-6"
            aria-hidden="true"
          >
            Previous
          </button>
          <button
            className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
            onClick={handleNext}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
