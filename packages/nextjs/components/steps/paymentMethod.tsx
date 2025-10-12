"use client";

import React from "react";
import { useCheckoutStore } from "~~/components/purchase/useCheckoutStore";
import { supportedTokens } from "~~/components/constants/tokens";
import { RainbowKitCustomConnectButton } from "~~/components/globalEco";
import { WalletIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useState } from "react";
import { useAccount } from "wagmi";

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

  const { address, isConnected } = useAccount();
  const isDisabled = paymentMethod !== "cash" && !isConnected;
  const [showWalletNotice, setShowWalletNotice] = useState(false);
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string>("");

  return (
    <>
      <div className="flex flex-col h-full space-y-2">
        <div className="px-0">
          <h3 className="text-lg font-light mb-4 text-primary">PAYMENT METHOD</h3>
        </div>
        <div className="flex flex-col justify-between h-full rounded-xl"> 
          {/* Native Token */}
          {/*<div className={`rounded-lg p-4 bg-black/60 border border-secondary/30 hover:border-secondary transition-all`}>
            <label className="flex items-start gap-4 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === "native"}
                onChange={() => setField("paymentMethod", "native")}
                className="radio radio-secondary mt-1"
              />
              <div>
                <h4 className="flex items-center gap-2 text-md font-semibold text-white">
                  <img src="/globalw.png" alt="GBDO Symbol" className="w-4 h-4" />
                  Global Dominion (GBDO)
                </h4>
                <p className="text-xs text-white mt-1">Requires wallet connection.</p>
              </div>
            </label>
          </div>*/}

          {/* Stablecoin */}
          <div
            className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] overflow-y-auto rounded-lg border border-secondary/30 transition-all`}
          >
            <button
              onClick={() => setField("paymentMethod", "stable")}
              className={`w-full block rounded-lg p-8 bg-black/40 hover:bg-secondary/10 transition-colors text-left ${
                paymentMethod === "stable" ? "bg-secondary/20" : ""
              }`}
            >
              <div className="w-full">
                <h4 className="text-md font-light mt-2 text-white">STABLECOIN</h4>
                <p className="text-xs text-white mt-6">
                  Includes routing fee of 0.25%. Wallet required.
                </p>
                {/* Token Selector */}
                <select
                  disabled={paymentMethod !== "stable"}
                  className="select rounded-md bg-black w-full text-info-600 mb-4 outline-none hover:bg-white/10 border-none focus:ring-0 focus:outline-none"
                  value={selectedTokenSymbol}
                  onChange={(e) => {
                    const symbol = e.target.value;
                    setSelectedTokenSymbol(symbol);
                    setField("tokenSymbol", symbol);
                  }}
                >
                  <option value="" disabled>
                    Select Token
                  </option>
                  {supportedTokens
                    .filter((t) => !["GBDo", "GBDx", "WETH", "WBTC", "WBNB", "COPx"].includes(t.symbol))
                    .map((t) => (
                      <option key={t.symbol} value={t.symbol}>
                        {t.symbol} • {t.name}
                      </option>
                    ))}
                </select>
              </div>
            </button>
          </div>

          {/* Cash via Stripe */}
          <div
            className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] mt-6 overflow-y-auto rounded-lg border border-secondary/30 transition-all`}
          >
            <button
              onClick={() => setField("paymentMethod", "cash")}
              className={`w-full block rounded-lg p-8 bg-black/40 hover:bg-secondary/10 transition-colors text-left ${
                paymentMethod === "cash" ? "bg-secondary/20" : ""
              }`}
            >
              <div>
                <h4 className="text-md font-light mt-2 text-white">STRIPE CASH</h4>
                <p className="text-xs text-white mt-6">
                  No wallet required. Processing fee: 2.9% + $0.30 USD.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Sticky-style footer matching modal layout */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 p-4 mt-4 border-t bg-transparent w-full">
          {/* Left side: wallet connect button */}
          <div className="bottom-0 w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
            <RainbowKitCustomConnectButton />
            {paymentMethod !== "cash" && !isConnected && (
              <div className="relative inline-block">
                <button
                  onClick={() => setShowWalletNotice(true)}
                  className="w-6 h-6 rounded-full mt-2 bg-white/30 hover:bg-red-200 mb-2 gap-6 flex items-center justify-center"
                  title="Wallet Required"
                >
                  <ExclamationCircleIcon className="w-4 h-4 text-red-600" />
                </button>
                {showWalletNotice && (
                  <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/70 border-t border-red-300 shadow-lg p-4 max-h-[40vh] overflow-y-auto animate-slide-up">
                    <div className="flex items-center mb-2">
                      <WalletIcon className="w-6 h-6 text-red-500" />
                      <h2 className="text-lg mt-2 font-semibold text-red-600">WALLET REQUIRED</h2>
                    </div>
                    <p className="text-sm text-black mb-2">
                      Connect your wallet to continue. This ensures secure and personalized access.
                    </p>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setShowWalletNotice(false)}
                        className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Got it
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Previous + Next buttons */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row justify-center sm:justify-end items-center gap-2">
            <button
              className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
              onClick={() => setCurrentStep(Math.max(currentStep - 1, 1))}
            >
              Previous
            </button>
            <button
              className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
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
