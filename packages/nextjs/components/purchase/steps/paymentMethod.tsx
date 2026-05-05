"use client";

import React, { useEffect, useState } from "react";
import { useCheckoutStore } from "~~/components/purchase/useCheckoutStore";
import { supportedTokens } from "~~/components/constants/tokens";
import { WalletConnectButton } from "~~/utils/globalEco/walletConnectButton";
import { WalletIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useAccount } from "wagmi";
import { useRpcStatus } from "~~/hooks/globalEco/statusRpc";

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
  const walletRequiredMethods = ["native", "stable"];
  const isDisabled = walletRequiredMethods.includes(paymentMethod) && !isConnected;
  const [showWalletNotice, setShowWalletNotice] = useState(false);
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string>("");
  const [showStablecoinInfo, setShowStablecoinInfo] = useState(false);
  const rpcUp = useRpcStatus();

  const getNetwork = (symbol: string, address: string): string => {
    if (symbol === "BTC") return "Bitcoin";
    if (address.startsWith("0x")) {
      // Polygon tokens often share the same address format as Ethereum
      // If you want to manually tag Polygon tokens, you can add a symbol-based override here
      const polygonSymbols = ["ZARP", "BRL1", "JPYC"];
      return polygonSymbols.includes(symbol) ? "Polygon" : "Ethereum";
    }
    return "Unknown";
  };

  return (
    <>
      <div className="flex flex-col flex-full">
        <div className="px-0">
          <h3 className="text-lg font-light mb-4 text-primary">PAYMENT METHOD</h3>
        </div>
        <div className="flex flex-col justify-between rounded-xl"> 
          {/* Native Token */}
          <div className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] overflow-y-auto rounded-lg border border-secondary/30 transition-all`}>
            {paymentMethod === "native" && rpcUp === false && (
              <div className="bg-red-500/50 text-white text-xs p-3 rounded mb-3">
                Native currency purchases temporarily unavailable. Please try again later.
              </div>
            )}
            <button
              onClick={() => setField("tokenSymbol", "GBDo")}
              className={`w-full block rounded-lg px-4 pt-4 pb-2 bg-black/40 hover:bg-secondary/10 transition-colors text-left ${
                paymentMethod === "native" ? "bg-secondary/20" : ""
              }`}
              disabled={paymentMethod === "native" && rpcUp === false}
            >
              <div>
                <h4 className="flex items-center gap-2 text-md mt-2 font-semibold text-white">
                  <img src="/globalw.png" alt="GBDo Symbol" className="w-4 h-4" />
                  Global Dollar (GBDo)
                </h4>
                <p className="text-xs text-white mt-4">Requires wallet connection.</p>
              </div>
            </button>
          </div>

          {/* Stablecoin */}
          <div className="max-h-[300px] sm:max-h-[300px] max-h-[200px] mt-4 overflow-y-auto rounded-lg border border-secondary/30 transition-all">

            {/* Card container (NOT a button) */}
            <div
              role="button"
              onClick={() => setField("paymentMethod", "stable")}
              className={`w-full block rounded-lg p-4 bg-black/40 hover:bg-secondary/10 transition-colors text-left cursor-pointer ${
                paymentMethod === "stable" ? "bg-secondary/20" : ""
              }`}
            >
              <div className="w-full flex justify-between items-center mt-2">
                <h4 className="text-md font-light mt-2 text-white">STABLECOIN</h4>
              </div>

              <p className="text-xs text-justify text-white">
                Includes routing fee of 0.25%...
              </p>

              {/* Inner button — now works */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStablecoinInfo(true);
                }}
                className="bg-white/10 animate-pulse backdrop-blur-md px-6 py-2 mb-2 rounded-md w-full text-sm text-white hover:bg-white/20 transition flex items-center gap-2 shadow-md"
              >
                Supported Stablecoin
              </button>
            </div>

            {/* Select — now works */}
            {paymentMethod === "stable" && (
              <select
                className="select rounded-md bg-black w-full text-info-600 outline-none hover:bg-white/10 border-none focus:ring-0 focus:outline-none mt-2"
                value={selectedTokenSymbol}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation(); // ← THIS is the missing piece

                  const symbol = e.target.value;

                  setSelectedTokenSymbol(symbol);
                  setField("tokenSymbol", symbol);

                  // Ensure paymentMethod stays stable
                  if (paymentMethod !== "stable") {
                    setField("paymentMethod", "stable");
                  }
                }}
              >
              <option value="" disabled>Select Stablecoin Payment Method</option>
              {supportedTokens
                .filter((t) => !["GBDo","GBDx","WETH","WBTC","WBNB","COPx","GLB","TGUSA","TGMX","CREs","CREh","CGRi"].includes(t.symbol))
                .map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.symbol} • {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>


          {/* Cash via Stripe */}
          <div
            className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] mt-4 overflow-y-auto rounded-lg border border-secondary/30 transition-all`}
          >
            <button
              onClick={() => setField("paymentMethod", "cash")}
              className={`w-full block rounded-lg p-4 bg-black/40 hover:bg-secondary/10 transition-colors text-left ${
                paymentMethod === "cash" ? "bg-secondary/20" : ""
              }`}
            >
              <div>
                <h4 className="text-md font-light mt-2 text-white">STRIPE CREDIT/DEBIT</h4>
                <p className="text-xs text-white mt-6">
                  No wallet required. Processing fee: 2.9% + $0.30 USD.
                </p>
              </div>
            </button>
          </div>

          {/* Traditional Payments (Adyen) */}
          {/*<div className="max-h-[300px] sm:max-h-[300px] max-h-[200px] mt-4 overflow-y-auto rounded-lg border border-secondary/30 transition-all">*/}

            {/* Credit / Debit Card (Template with Icon*/}
            {/*<button
              onClick={() => setField("paymentMethod", "cash")}
              className={`w-full block rounded-lg p-4 bg-black/40 hover:bg-secondary/10 transition-colors text-left ${
                paymentMethod === "cash" ? "bg-secondary/20" : ""
              }`}
            >
              <h4 className="flex items-center gap-2 text-md mt-2 font-light text-white">*/}
                {/*<img src="/icons/card.svg" className="w-5 h-5" />*/}
              {/*}  Credit / Debit Card
              </h4>
              <p className="text-xs text-white mt-2">Visa, Mastercard, Amex. Fees: Debit 0.8% + $0.13 • Credit 2% + $0.13 • Commercial 2.5% + $0.13</p>
            </button>          
          </div>*/}

          {/* Apple Pay */}
           {/*<div className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] mt-4 overflow-y-auto rounded-lg border border-secondary/30 transition-all`}></div>
            <button
              onClick={() => setField("paymentMethod", "applepay")}
              className={`w-full block rounded-lg p-4 bg-black/40 hover:bg-secondary/10 transition-colors text-left ${
                paymentMethod === "applepay" ? "bg-secondary/20" : ""
              }`}
            >
              <h4 className="flex items-center gap-2 text-md mt-2 font-light text-white">
                Apple Pay
              </h4>
              <p className="text-xs text-white mt-2">Fast checkout on Apple devices. Fees: Debit 0.8% + $0.13 • Credit 2% + $0.13 • Commercial 2.5% + $0.13</p>
            </button>
          </div>*/}

          {/* Google Pay */}
          {/*<div className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] mt-4 overflow-y-auto rounded-lg border border-secondary/30 transition-all`}>
            <button
              onClick={() => setField("paymentMethod", "googlepay")}
              className={`w-full block rounded-lg p-4 bg-black/40 hover:bg-secondary/10 transition-colors text-left ${
                paymentMethod === "googlepay" ? "bg-secondary/20" : ""
              }`}
            >
              <h4 className="flex items-center gap-2 text-md mt-2 font-light text-white">
                <img src="/icons/googlepay.svg" className="w-5 h-5" />
                Google Pay
              </h4>
              <p className="text-xs text-white mt-2">Fast checkout on Android devices.</p>
            </button>
          </div>*/}

          {/* PayPal */}
          {/*<div className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] mt-4 overflow-y-auto rounded-lg border border-secondary/30 transition-all`}>
            <button
              onClick={() => setField("paymentMethod", "paypal")}
              className={`w-full block rounded-lg p-4 bg-black/40 hover:bg-secondary/10 transition-colors text-left ${
                paymentMethod === "paypal" ? "bg-secondary/20" : ""
              }`}
            >
              <h4 className="flex items-center gap-2 text-md mt-2 font-light text-white">
                PayPal
              </h4>
              <p className="text-xs text-white mt-2">Pay securely with your PayPal account. Fee: 3.95% + $0.13 USD</p>
            </button>
          </div>*/}

          {/* Klarna */}
          {/*<div className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] mt-4 overflow-y-auto rounded-lg border border-secondary/30 transition-all`}>
            <button
              onClick={() => setField("paymentMethod", "klarna")}
              className={`w-full block rounded-lg p-4 bg-black/40 hover:bg-secondary/10 transition-colors text-left ${
                paymentMethod === "klarna" ? "bg-secondary/20" : ""
              }`}
            >
              <h4 className="flex items-center gap-2 text-md mt-2 font-light text-white">
                Klarna
              </h4>
              <p className="text-xs text-white mt-2">Pay in installments. Fee: 6% + $0.13</p>
            </button>
          </div>*/}

          {/* Afterpay */}
          {/*<div className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] mt-4 overflow-y-auto rounded-lg border border-secondary/30 transition-all`}>
            <button
              onClick={() => setField("paymentMethod", "afterpay")}
              className={`w-full block rounded-lg p-4 bg-black/40 hover:bg-secondary/10 transition-colors text-left ${
                paymentMethod === "afterpay" ? "bg-secondary/20" : ""
              }`}
            >
              <h4 className="flex items-center gap-2 text-md mt-2 font-light text-white">
                Afterpay
              </h4>
              <p className="text-xs text-white mt-2">Pay in 4 interest-free payments or monthly up to 12 months. Fee: 6% + $0.13</p>
            </button>
          </div>*/}

          {/* Affirm */}
          {/*<div className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] mt-4 overflow-y-auto rounded-lg border border-secondary/30 transition-all`}>
            <button
              onClick={() => setField("paymentMethod", "affirm")}
              className={`w-full block rounded-lg p-4 bg-black/40 hover:bg-secondary/10 transition-colors text-left ${
                paymentMethod === "affirm" ? "bg-secondary/20" : ""
              }`}
            >
              <h4 className="flex items-center gap-2 text-md mt-2 font-light text-white">
                Affirm
              </h4>
              <p className="text-xs text-white mt-2">Flexible financing options. Fee: 6% + $0.13</p>
            </button>*/}
          {/*</div>*/}
        </div>

        {/* Sticky-style footer matching modal layout */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 px-4 pt-4 mt-4 border-t bg-transparent w-full">
          {/* Left side: wallet connect button */}
          <div className="bottom-0 w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
            <WalletConnectButton />
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
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}

              disabled={isDisabled}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <SlidePanel
        isOpen={showStablecoinInfo}
        onClose={() => setShowStablecoinInfo(false)}
        title="SUPPORTED STABLECOIN"
      >
        <div className="overflow-hidden max-h-[40vh] rounded-t-xl">
          <div className="overflow-y-auto max-h-[calc(40vh-20px)] px-6 py-4 space-y-4 text-sm text-gray-300">
            {supportedTokens
              .filter(({ symbol }) => !["GBDo", "BTC", "ETH", "GBDx", "COPx", "GLB", "TGUSA", "TGMX", "CREs", "CREh", "CGRi"].includes(symbol))
              .map(({ name, symbol, address }) => (
                <div key={symbol} className="bg-white/5 backdrop-blur-md p-4 rounded-md shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-300">{name}</span>
                    <span className="text-xs text-gray-400">{symbol}</span>
                  </div>
                  <div className="mt-1 text-xs break-all">
                    <strong>Address:</strong> {address}
                  </div>
                  <div className="text-xs text-gray-400">
                    <strong>Network:</strong> {getNetwork(symbol, address)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </SlidePanel>
    </>
  );
};

function SlidePanel({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`fixed bottom-0 left-0 w-full z-50 bg-black/90 text-white px-6 py-8 transition-transform duration-500 ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-light">{title}</h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 backdrop-blur-md p-2 rounded-full hover:bg-white/20 transition duration-300"
            aria-label="Close panel"
          >
            <svg
              className="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        {/* Render children instead of description */}
        <div>{children}</div>
      </div>
    </div>
  );
}


