"use client";

import { Modal } from "../common/modal";
import { useAccount, useWriteContract } from "wagmi";
import { createPublicClient, http } from "viem";
import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useCheckoutStore } from "~~/components/purchase/useCheckoutStore";
import { ethers } from "ethers";
import { supportedTokens } from "../constants/tokens";
import { StablecoinRate, getExchangeRates } from "~~/lib/exchangeRates";
import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";
import deployments from "~~/lib/contracts/deployments.json";
import { toast } from "react-hot-toast";
import { initiatePurchase } from "~~/components/purchase/usePurchaseHandler";
import { PaymentMethodStep } from "~~/components/steps/paymentMethod";
import { SystemConfigurationStep } from "~~/components/steps/systemConfiguration";
import { OutputCustomizationStep } from "~~/components/steps/outputCustomization";
import { CheckoutReviewStep } from "~~/components/steps/checkoutReview";
import { PurchaseSummaryStep } from "~~/components/steps/purchaseSummary";
import { handleStripeReturn } from "~~/components/purchase/usePurchaseHandler";
import { ShippingInfoStep } from "../steps/shippingInfo";

export function getContractAddress(contractName: keyof typeof deployments): string {
  return deployments[contractName] ?? "";
}

export type StripeReturnContext = {
  sessionId?: string | null;
  cancelled?: boolean;
  new?: boolean;
};

// Represents a priced variation like panel type, monitoring, etc.
export type AssetVariation = {
  label: string;
  apriceInGBDO: bigint;
};

export type CheckoutModalProps = {
  isOpen: boolean;
  selectedCurrency: string;
  variationGroups: Record<string, AssetVariation[]>;
  selectedVariations: Record<string, AssetVariation>;
  setSelectedVariations: (value: Record<string, AssetVariation>) => void;
  onClose: () => void;
  openWalletModal: () => void;
};

export type CheckoutModalRef = {
  handlePurchaseConfirm: (ctx?: StripeReturnContext) => void;
};

const publicClient = createPublicClient({
  chain: GLOBALCHAIN, // replace with your actual chain
  transport: http(),
});


// Modal component
const CheckoutModalBase = (
  {
    onClose,
    isOpen,
    openWalletModal,
    selectedCurrency,
    variationGroups,
    selectedVariations,
    setSelectedVariations,
  }: CheckoutModalProps,
  ref: React.Ref<CheckoutModalRef>
) => {

  const [currentStep, setCurrentStep] = useState<number>(0);

    // Legal and contract checks
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [termsText, setTermsText] = useState<string | null>(null);
  const [privacyText, setPrivacyText] = useState<string | null>(null);
  const [returnsText, setReturnsText] = useState<string | null>(null);

  const handleTermsPrevious = () => {
    if (customizeGroupKey && selectedVariations[customizeGroupKey]?.label === "Customize") {
      setCurrentStep(1);
    } else {
      setCurrentStep(0);
    }
  };

  useEffect(() => {
    const loadLegalDocs = async () => {
      try {
        const [terms, privacy, returns] = await Promise.all([
          fetch("/legal/terms-conditions.txt").then(res => res.text()),
          fetch("/legal/privacy-policy.txt").then(res => res.text()),
          fetch("/legal/refund-returns.txt").then(res => res.text()),
        ]);

        setTermsText(terms);
        setPrivacyText(privacy);
        setReturnsText(returns);
      } catch (err) {
        console.error("Failed to load legal documents", err);
      }
    };

    loadLegalDocs();
  }, []);

 const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
    } else {
      console.warn("No Ethereum provider found");
      // You can still show the modal and prompt wallet connection
    }
  }, []);


  const { chain } = useAccount();
  const chainId = chain?.id;
  
  // System configuration selections
  const [selectedVoltage, setSelectedVoltage] = useState<number>(360);
  const [selectedPhase, setSelectedPhase] = useState<"Single-Phase" | "Split-Phase" | "3-Phase" | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<"50Hz" | "60Hz" | null>(null);

  const epanelSelected = selectedVariations["epanel"];
  const xpanelSelected = selectedVariations["xpanel"];

  const isEpanelRestricted =
    epanelSelected?.label === "Restricted" && selectedVoltage === 120;

  const isXpanelRestricted =
    xpanelSelected?.label === "Restricted" &&
    selectedVoltage === 360 &&
    selectedPhase === "3-Phase" &&
    selectedFrequency === "60Hz";

  const isRestrictedCombo = isEpanelRestricted || isXpanelRestricted;
  const basePriceInGBDO = useCheckoutStore(state => state.asset?.basePriceInGBDO ?? BigInt(0));

 // External data and contract hooks
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const stepLabels = [
    "Configure",
    "Tuning",
    "Agreement",
    "Shipping",
    "Method",
    "Review",
    "Done",
  ];

  // Store-driven state (like payment method and estimates)
  const {
    asset: checkoutAsset,
    quantity,
    tokenSymbol,
    estimatedTotal,
    estimatedEscrow,
    paymentMethod,
    stripeSessionId,
    stripeConfirmation, 
    txhash,
    userAddress,
    transactionStatus,
    ipfsCid,
    setField,
  } = useCheckoutStore(); 

  const { shippingInfo } = useCheckoutStore.getState();
  
  // Label helpers
  const variationDisplayLabels: Record<string, string> = {
    epanel: "Panel Configuration",
    xpanel: "Panel Configuration",
    monitoring: "Remote Monitoring",
    etie: "Grid Integration",
    xtie: "Grid Integration",
  };

  // Delivery estimate
  const deliveryDays =
    (checkoutAsset?.baseDays ?? 0) +
    (checkoutAsset?.perUnitDelay ?? 0) * (quantity - 1);

  const deliveryDeadline = new Date(Date.now() + deliveryDays * 86400000).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "short", day: "numeric" }
  );

  const [customizeGroupKey, setCustomizeGroupKey] = useState<string | null>(null);

  const handleClose = () => {
    setCustomizeGroupKey(null);
    setCurrentStep(1); // Optional: reset step to beginning
    onClose(); // Call parent-provided close
  };  

  async function calculateTotalPrice(
    variations: Record<string, AssetVariation>,
    method: "cash" | "native" | "stable",
    tokenSymbol: string,
    exchangeData: {
      rates: StablecoinRate[];
      gbdoRate: number;
      lastUpdated: number;
    },
    basePriceInGBDO: BigInt
  ): Promise<number> {
    // Convert microGBDO to GBDO
    const basePrice = Number(basePriceInGBDO) / 1e6;
    //console.log("[Pricing] Base GBDO:", basePrice);

    // Sum variations
    const variationTotal = Object.values(variations)
      .reduce((sum, v) => sum + Number(v.apriceInGBDO), 0) / 1e6;
    //console.log("[Pricing] Variation Total GBDO:", variationTotal);

    let subtotalGBDO = basePrice + variationTotal;
    //console.log("[Pricing] Subtotal before Fees:", subtotalGBDO);

    // Apply fee based on method
    if (method === "stable") {
      const fee = subtotalGBDO * 0;
      subtotalGBDO += fee;
      //console.log("[Fee] Stablecoin fee applied:", fee);
    } else if (method === "cash") {
      const fee = subtotalGBDO * 0.029 + 0.30;
      subtotalGBDO += fee;
      //console.log("[Fee] Cash fee applied:", fee);
    }

    //console.log("[Pricing] Subtotal after Fees:", subtotalGBDO);

    // Determine token rate
    const effectiveSymbol = method === "cash" ? "USDC" : tokenSymbol;
    const tokenRate = effectiveSymbol === "GBDO"
      ? 1
      : exchangeData.rates.find(r => r.symbol === effectiveSymbol)?.rate ?? 1;

    //console.log(`[Pricing] Using Rate for ${effectiveSymbol}:`, tokenRate);
    //console.log(`[Pricing] GBDO Reference Rate: ${exchangeData.gbdoRate}`);
    const gbdoRate = await getGBDORateFromRates();

    // Final calculation
    const finalPrice = (subtotalGBDO * gbdoRate) / tokenRate;
    //console.log(`[Pricing] Final Price in ${effectiveSymbol}:`, finalPrice);

    return Math.round(finalPrice * 100) / 100;
  }

  const [finalizing, setFinalizing] = useState(true);

  async function handleNext() {
    const exchangeData = await getExchangeRates();

    const total = await calculateTotalPrice(
      selectedVariations,
      paymentMethod,
      tokenSymbol,
      exchangeData,
      basePriceInGBDO
    );

    setField("estimatedTotal", total.toFixed(2));
    setCurrentStep(5);
  }

  async function getGBDORateFromRates() {
    const result = await getExchangeRates();
    const gbdoRate = result.gbdoRate;
    //console.log("GBDO Rate is:", gbdoRate);
    return gbdoRate;
  }

  const handlePurchaseConfirm = async ({ sessionId, cancelled, new: isNew }: StripeReturnContext = {}) => {
    // Stripe return flow — skip calculations and contract calls
    if (sessionId || cancelled) {
      try {
        const stripeReturnData = await handleStripeReturn(); // purely reads from localStorage
        if (!stripeReturnData) {
          toast.error("Missing Stripe return data.");
          return;
        }

        const { checkoutAsset, estimatedTotal } = stripeReturnData;

        setField("asset", checkoutAsset);
        setField("estimatedTotal", estimatedTotal);
        setField("stripeConfirmation", sessionId);

        setCurrentStep(sessionId ? 6 : 5); // Step 6 for success, 5 for cancelled
      } catch (error) {
        console.error("Error handling Stripe return", error);
        toast.error("Failed to resume checkout.");
      }

      return; // Exit early — no need to calculate or initiate purchase
    }

    if (isNew) {
      console.log("Starting New Checkout Session...");
    }
    // Fresh purchase flow — full calculation and contract initiation
    let provider: ethers.providers.Web3Provider | null = null;

    if (paymentMethod !== "cash") {
      if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
      } else {
        toast.error("Wallet not connected or provider missing.");
        return;
      }
    }

    try {
      const exchangeData = await getExchangeRates();

      const total = await calculateTotalPrice(
        selectedVariations,
        paymentMethod,
        tokenSymbol,
        exchangeData,
        basePriceInGBDO
      );

      function sanitizeBigInts(obj: Record<string, any>) {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'bigint') {
            result[key] = value.toString();
          } else if (Array.isArray(value)) {
            result[key] = value.map(item =>
              typeof item === 'bigint' ? item.toString() : item
            );
          } else if (typeof value === 'object' && value !== null) {
            result[key] = sanitizeBigInts(value); // Recursively sanitize nested objects
          } else {
            result[key] = value;
          }
        }
        return result;
      }

      const configuration = {
        system: sanitizeBigInts({
          selectedVariations,
          customizeGroupKey,
        }),
        output: sanitizeBigInts({
          selectedVoltage,
          selectedFrequency,
          selectedPhase,
          isRestrictedCombo,
        }),
      };

      const serializedConfig = JSON.stringify(configuration);

      const tokenRate = exchangeData.rates.find(r => r.symbol === "GBDO")?.rate ?? 1;

      setField("estimatedTotal", total.toFixed(2));
      setField("asset", checkoutAsset);

      if (!checkoutAsset) throw new Error("checkoutAsset must be defined before initiating purchase");

      let selectedTokenMeta = null;
      if (paymentMethod !== "cash") {
        selectedTokenMeta = supportedTokens.find(t => t.symbol === tokenSymbol);
        if (!selectedTokenMeta) throw new Error(`Token metadata not found for symbol: ${tokenSymbol}`);
      } 

      const { shippingInfo } = useCheckoutStore.getState();

      if (!shippingInfo) {
        throw new Error("Shipping info is missing.");
      }

      const purchaseCompleted = await initiatePurchase({
        currentStep: 6,
        paymentMethod,
        checkoutAsset,
        estimatedTotal: total.toFixed(2),
        tokenSymbol,
        quantity,
        tokenRate,
        configuration: serializedConfig,
        toast,
        publicClient,
        userAddress: address ?? "",
        chainId: chainId ?? GLOBALCHAIN.id,
        selectedToken: {
          symbol: tokenSymbol,
          address: selectedTokenMeta?.address,
          decimals: selectedTokenMeta?.decimals,
        },
        value: total.toFixed(2),
        shippingInfo,
      });

      setCurrentStep(purchaseCompleted ? 6 : 5);
    } catch (error) {
      console.error("Error confirming purchase", error);
      toast.error("Purchase failed.");
    }
  };

  useImperativeHandle(ref, () => ({
    handlePurchaseConfirm,
  }));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="">
      <div className="overflow-x-auto whitespace-nowrap text-xs mt-2 px-2 p-4 scrollbar-hide">
        <div className="inline-flex gap-4">
          {stepLabels.map((label, index) => (
            <span
              key={label}
              className={`min-w-[80px] text-center block ${
                currentStep === index ? "text-secondary/90 font-medium" : "text-gray-500"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2 h-auto min-h-[400px] sm:h-[500px] flex flex-col">
        {currentStep === 0 && (
          <SystemConfigurationStep
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            variationGroups={variationGroups}
            selectedVariations={selectedVariations}
            setSelectedVariations={setSelectedVariations}
            customizeGroupKey={customizeGroupKey}
            setCustomizeGroupKey={setCustomizeGroupKey}
          />
        )}


        {currentStep === 1 && (
          <OutputCustomizationStep
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            selectedVoltage={selectedVoltage}
            setSelectedVoltage={setSelectedVoltage}
            selectedFrequency={selectedFrequency}
            setSelectedFrequency={setSelectedFrequency}
            selectedPhase={selectedPhase}
            setSelectedPhase={setSelectedPhase}
            isRestrictedCombo={isRestrictedCombo}
          />
        )}

        {/* Step 3 - Terms & Policies */}
        {currentStep === 2 && (
          <div className="flex flex-col h-full space-y-2">
            <div className="px-0 h-full">
              <h2 className="text-xl font-light text-primary">AGREEMENTS</h2>
            </div>
            <div className="relative z-20 text-sm text-gray-400 animate-bounce">
                Scroll to accept ↓
              </div>
            <div className="flex-grow max-h-90 sm:max-h-90 overflow-y-auto text-xs sm:text-sm border px-4 rounded bg-black text-justify text-white space-y-8">
              <section>
                <h3 className="font-semibold mb-2 mt-2 text-2xl">TERMS & CONDITIONS</h3>
                <div dangerouslySetInnerHTML={{ __html: termsText || "<p>Loading…</p>" }} />
              </section>

              <section>
                <h3 className="font-semibold mb-2 text-2xl">RETURNS & REFUNDS</h3>
                <div dangerouslySetInnerHTML={{ __html: returnsText || "<p>Loading…</p>" }} />
              </section>

              <section>
                <h3 className="font-semibold mb-6 text-2xl">PRIVACY POLICY</h3>
                <div dangerouslySetInnerHTML={{ __html: privacyText || "<p>Loading…</p>" }} />
                <label className="flex items-center gap-2 mt-4 mb-6">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={() => setPrivacyAccepted(!privacyAccepted)}
                    className="form-checkbox"
                  />
                  I agree to the Terms & Policies
                </label>
              </section>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-4 py-4 border-t bg-transparent w-full">
              <button
                className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
                onClick={() => {
                  if (customizeGroupKey && selectedVariations[customizeGroupKey]?.label === "Customize") {
                    setCurrentStep(1);
                  } else {
                    setCurrentStep(0);
                  }
                }}
              >
                Previous
              </button>
              <button
                className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
                onClick={() => setCurrentStep(3)}
                disabled={!(privacyAccepted)}
              >
                Next
              </button>
            </div>
          </div>
        )}
        {currentStep === 3 && (
          <ShippingInfoStep
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
          />
        )}

        {currentStep === 4 && (
          <PaymentMethodStep
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            handleNext={handleNext}
          />
        )}

        {/* Step 6 - Review and Checkout */}
        {currentStep === 5 && checkoutAsset && (
          <CheckoutReviewStep
            checkoutAsset={checkoutAsset}
            paymentMethod={paymentMethod}
            tokenSymbol={tokenSymbol}
            estimatedTotal={estimatedTotal}
            quantity={quantity}
            deliveryDays={deliveryDays}
            deliveryDeadline={deliveryDeadline}
            setCurrentStep={setCurrentStep}
            handlePurchaseConfirm={() => handlePurchaseConfirm({ new: true })}
          />
        )}

        {currentStep === 6 && (
          <PurchaseSummaryStep
            transactionStatus={transactionStatus}
            paymentMethod={paymentMethod}
            tokenSymbol={tokenSymbol}
            stripeConfirmation={stripeConfirmation}
            txhash={txhash}
            finalizing={finalizing}
            ipfsCid={ipfsCid}
          />
        )}

      </div>
    </Modal>
  );
};

export const CheckoutModal = forwardRef(CheckoutModalBase);
