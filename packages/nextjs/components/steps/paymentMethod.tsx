"use client";

import React from "react";
import { useCheckoutStore } from "~~/components/useCheckoutStore";
import { supportedTokens } from "~~/components/constants/tokens";
import { RainbowKitCustomConnectButton } from "~~/components/globalEco";

type Props = {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  handleNext: () => void;
};

export const PaymentMethodStep: React.FC<Props> = ({ currentStep, setCurrentStep, handleNext }) => {
  const {
    paymentMethod,
    tokenSymbol,
    userAddress,
    setField,
  } = useCheckoutStore();

  const isDisabled = paymentMethod !== "cash" && !!userAddress;

  return (
    <>
      <h3 className="text-lg font-light mb-10 text-info">SELECT PAYMENT METHOD</h3>

      <div className="space-y-4">
        {/* Native Token Option */}
        <div className="border-b border-base-300 pb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="paymentMethod"
              checked={paymentMethod === "native"}
              onChange={() => setField("paymentMethod", "native")}
              className="radio radio-info mt-1"
            />
            <div>
              <span className="text-md font-medium">Global Dominion (GBDO)</span>
              <p className="text-xs text-info-400 mt-1">Requires wallet connection.</p>
            </div>
          </label>
        </div>

        {/* Stablecoin Option */}
        <div className="border-b border-base-300 pb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="paymentMethod"
              checked={paymentMethod === "stable"}
              onChange={() => setField("paymentMethod", "stable")}
              className="radio radio-info mt-1"
            />
            <div>
              <span className="text-md font-medium">Stablecoin</span>
              <p className="text-xs text-info-400 mt-1">
                Requires wallet connection. Includes stablecoin routing fee of 0.25%.
              </p>

              <select
                className="select select-black w-full text-info-600 mb-4"
                value={tokenSymbol}
                onChange={(e) => setField("tokenSymbol", e.target.value)}
              >
                {Object.entries(supportedTokens)
                  .filter(([_, token]) => token.symbol !== "GBDO")
                  .map(([_, token]) => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol} — {token.name}
                    </option>
                  ))}
              </select>
            </div>
          </label>
        </div>

        {/* Stripe / Cash Option */}
        <div className="pb-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="paymentMethod"
              checked={paymentMethod === "cash"}
              onChange={() => setField("paymentMethod", "cash")}
              className="radio radio-info mt-1"
            />
            <div>
              <span className="text-md font-medium">Cash via Stripe</span>
              <p className="text-xs text-warning-400 mt-1 mb-4">
                No wallet required. Includes a processing fee of 2.9% + $0.30 USD.
              </p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex flex-col h-full">
        <div className="flex-grow overflow-y-auto p-4" />

        <div className="flex justify-between items-center p-4 border-t bg-transparent">
          {paymentMethod !== "cash" ? (
            <div className="flex items-center gap-2">
              <RainbowKitCustomConnectButton />
              {!!userAddress && (
                <span className="text-red-500 text-xs">Wallet required</span>
              )}
            </div>
          ) : (
            <div />
          )}

          <div className="flex gap-2 items-center">
            {currentStep > 1 && (
              <button
                className="btn btn-secondary rounded-md text-white h-6 btn-sm"
                onClick={() => setCurrentStep(Math.max(currentStep - 1, 1))}
              >
                Previous
              </button>
            )}
            <button
              className="btn btn-primary rounded-md px-6 text-white h-6 btn-sm"
              onClick={handleNext}
              disabled={isDisabled}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
