"use client";

import { Modal } from "../common/modal";
import { useAccount, useWriteContract } from "wagmi";
import { createPublicClient, http } from "viem";
import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useCheckoutStore } from "~~/components/purchase/useCheckoutStore";
import { supportedTokens } from "../constants/tokens";
import { StablecoinRate, getExchangeRates } from "~~/lib/exchangeRates";
import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";
import deployments from "~~/lib/contracts/deployments.json";
import { toast } from "react-hot-toast";
import { initiatePurchase } from "~~/components/purchase/usePurchaseHandler";
import { PaymentMethodStep } from "~~/components/purchase//steps/paymentMethod";
import { SystemConfigurationStep } from "~~/components/purchase/steps/systemConfiguration";
import { OutputCustomizationStep } from "~~/components/purchase/steps/outputCustomization";
import { CheckoutReviewStep } from "~~/components/purchase/steps/checkoutReview";
import { PurchaseSummaryStep } from "~~/components/purchase/steps/purchaseSummary";
import { handleStripeReturn } from "~~/components/purchase/usePurchaseHandler";
import { ShippingInfoStep } from "~~/components/purchase/steps/shippingInfo";
import { buildCompactConfigBytes32 } from "~~/components/purchase/configurationPacker";

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
  apriceInGBDo: bigint;
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
  const [provider, setProvider] = useState<EthereumProvider | null>(null);
  const [walletName, setWalletName] = useState<string>("");
  const [variantTotal, setVariantTotal] = useState<number>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ethereum = (window as any).ethereum;
    const xdefi = (window as any).xfi;

    if (ethereum?.isMetaMask) {
      setWalletName("MetaMask");
      setProvider(ethereum);
    } else if (ethereum?.isBraveWallet) {
      setWalletName("Brave Wallet");
      setProvider(ethereum);
    } else if (ethereum) {
      setWalletName("Injected Wallet");
      setProvider(ethereum);
    }

    if (xdefi) {
      setWalletName("XDEFI Wallet");
      setProvider(xdefi.ethereum);
    }
  }, []);

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

  const { chain } = useAccount();
  const chainId = chain?.id;
  
  // System configuration selections
  const [selectedVoltage, setSelectedVoltage] = useState<number>(480);
  const [selectedPhase, setSelectedPhase] = useState<"Single-Phase" | "Split-Phase" | "3-Phase" | null>(null);
  const [selectedReactor, setSelectedReactor] = useState<"Default (None)" | "Line Reactor(s)" | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<"50Hz" | "60Hz" | null>(null);

  const epanelSelected = selectedVariations["epanel"];
  const xpanelSelected = selectedVariations["xpanel"];

  const isEpanelRestricted =
    epanelSelected?.label === "Restricted" && selectedVoltage === 120;

  const isXpanelRestricted =
    xpanelSelected?.label === "Restricted" &&
    selectedVoltage === 480 &&
    selectedPhase === "3-Phase" &&
    selectedFrequency === "60Hz";

  const isRestrictedCombo = isEpanelRestricted || isXpanelRestricted;

  useEffect(() => {
    if (epanelSelected && selectedVoltage !== 120) {
      setSelectedVoltage(120);
      setField("voltage", "120V");
    }
    
  }, [epanelSelected]);

  const basePriceInGBDo = useCheckoutStore(state => state.asset?.basePriceInGBDo ?? BigInt(0));

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
    cardType,
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
    method: "cash" | "native" | "stable" | "paypal" | "applepay" | "klarna" | "affirm" | "afterpay",
    cardType: "debit" | "credit" | null,
    tokenSymbol: string,
    exchangeData: {
      rates: StablecoinRate[];
      gbdoRate: number;
      lastUpdated: number;
    },
    basePriceInGBDo: BigInt,
    quantity: number
  ): Promise<{finalPrice: number, variationTotal: number}> {
    // Convert microGBDo to GBDo
    const basePrice = Number(basePriceInGBDo) / 1e6;
    //console.log("[Pricing] Base GBDo:", basePrice);

    // Sum variations
    const vTotal = Object.values(variations)
      .reduce((sum, v) => sum + Number(v.apriceInGBDo), 0) / 1e6;
    //console.log("[Pricing] Variation Total GBDo:", variationTotal);

    let subtotalGBDo = (basePrice + vTotal) * quantity;
    //console.log("[Pricing] Subtotal before Fees:", subtotalGBDo);

    // Apply fee based on method
    if (method === "stable" || method === "native") {
      const fee = 0;
      subtotalGBDo += fee;

    } else if (method === "paypal") {
      const fee = subtotalGBDo * 0.0395 + 0.13;
      subtotalGBDo += fee;

    } else if (method === "cash") {
      // You MUST detect debit vs credit BEFORE this point
      /*if (cardType === "debit") {
        const fee = subtotalGBDo * 0.008 + 0.13;   // ~0.8% + 0.13
        subtotalGBDo += fee;
      } else if (cardType === "credit") {
        const fee = subtotalGBDo * 0.02 + 0.13;    // ~2.0% + 0.13
        subtotalGBDo += fee;
      } else {
        // fallback for commercial/premium cards
        const fee = subtotalGBDo * 0.025 + 0.13;
        subtotalGBDo += fee;
      }*/
      const fee = subtotalGBDo * 0.029 + 0.30;
      subtotalGBDo += fee;

    } else if (method === "applepay") {
      // Apple Pay uses the underlying card type
      if (cardType === "debit") {
        const fee = subtotalGBDo * 0.008 + 0.13;
        subtotalGBDo += fee;
      } else {
        const fee = subtotalGBDo * 0.02 + 0.13;
        subtotalGBDo += fee;
      }

    } else if (method === "affirm" || method === "klarna" || method === "afterpay") {
      const fee = subtotalGBDo * 0.06 + 0.13;  // BNPL estimated
      subtotalGBDo += fee;
    }


    //console.log("[Pricing] Subtotal after Fees:", subtotalGBDo);

    // Determine token rate
    // Look up token rate directly
    const rateEntry = exchangeData.rates.find(r => r.symbol === tokenSymbol);
    if (!rateEntry) {
      throw new Error(`Missing rate for ${tokenSymbol}`);
    }

    // You already have gbdoRate from exchangeData
    let gbdoRate;
    if (tokenSymbol == "GBDo") {
      gbdoRate = 1;
    } else {
      gbdoRate = exchangeData.gbdoRate;
    }

    // Use the relative rate against GBDo
    let tokenRate;
    if (tokenSymbol == "GBDo") {
      tokenRate = 1;
    } else {
      tokenRate = rateEntry.rate;
    }

    // Final calculation
    const finalPrice = (Math.round((subtotalGBDo * gbdoRate) / tokenRate!) * 100 / 100);
    const variationTotal = (Math.round((vTotal * gbdoRate) / tokenRate!) * 100 / 100) * quantity;
    setVariantTotal(
      variationTotal
    );
    //console.log(`[Pricing] Final Price in ${effectiveSymbol}:`, finalPrice);

    return {finalPrice, variationTotal};
  }

  const [finalizing, setFinalizing] = useState(true);

  async function handleNext() {
    const exchangeData = await getExchangeRates();

    const {finalPrice, variationTotal} = await calculateTotalPrice(
      selectedVariations,
      paymentMethod,
      cardType,
      tokenSymbol,
      exchangeData,
      basePriceInGBDo,
      quantity
    );

    console.log("Total: ", finalPrice);
    console.log("Variation Total: ", variationTotal);


    setField("estimatedTotal", finalPrice.toFixed(2));
    setCurrentStep(5);
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

    try {
      const exchangeData = await getExchangeRates();

      const {finalPrice, variationTotal} = await calculateTotalPrice(
        selectedVariations,
        paymentMethod,
        cardType,
        tokenSymbol,
        exchangeData,
        basePriceInGBDo,
        quantity
      );

      // BUILD THE DYNAMIC TEXT AND ON-CHAIN BYTES FIRST
      const isEseries = "epanel" in selectedVariations;
      const panelKey = isEseries ? "epanel" : "xpanel";

      let formattedConfigText: string;

      if (customizeGroupKey === panelKey && selectedVariations[panelKey]?.label === "Customize") {
        const voltage = selectedVoltage ? `${selectedVoltage}V` : null;
        const frequency = selectedFrequency; // e.g., "60Hz"
        const phase = selectedPhase;         // e.g., "3-Phase"
        
        // Only include Reactor if it's X-Series and not set to None
        const includeReactor = !isEseries && selectedReactor === "Line Reactor(s)";
        const reactor = includeReactor ? "Line Reactor(s)" : null;

        formattedConfigText = [voltage, frequency, phase, reactor]
          .filter(Boolean)
          .map(String)
          .join(" / ");
      } else {
        formattedConfigText = Object.values(selectedVariations)
          .map(v => (v as { label: string }).label)
          .filter(Boolean)
          .join(" / ");
      }

      // RUN YOUR EXISTING BIGINT SANITIZATION LOGIC
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
            result[key] = sanitizeBigInts(value); 
          } else {
            result[key] = value;
          }
        }
        return result;
      }

      // Build your complete off-chain metadata object
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
          // Add the missing reactor selection into your off-chain state tracking too!
          selectedReactor, 
        }),
        // Inject the clean human-readable text block straight into the object payload!
        formattedSummary: formattedConfigText 
      };

      // Ready for off-chain storage/logs
      const serializedConfig = JSON.stringify(configuration);

      const tokenRate = exchangeData.rates.find(r => r.symbol === "GBDo")?.rate ?? 1;

      setField("estimatedTotal", finalPrice.toFixed(2));
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

      const bytes32ConfigString = buildCompactConfigBytes32({
        selectedVariations,
        selectedVoltage,
        selectedFrequency,
        selectedPhase,
        selectedReactor,
      });

      const purchaseCompleted = await initiatePurchase({
        currentStep: 6,
        paymentMethod,
        checkoutAsset,
        estimatedTotal: finalPrice.toFixed(2),
        tokenSymbol,
        customizations: variationTotal.toString(),
        bytes32Config: bytes32ConfigString,
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
          chain: selectedTokenMeta?.chain,
        },
        value: finalPrice.toFixed(2),
        shippingInfo,
        provider,
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

      <div className="flex flex-col flex-full">
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
            selectedVariations={selectedVariations}
            setSelectedVariations={setSelectedVariations}
            selectedVoltage={selectedVoltage}
            setSelectedVoltage={setSelectedVoltage}
            selectedFrequency={selectedFrequency}
            setSelectedFrequency={setSelectedFrequency}
            selectedPhase={selectedPhase}
            setSelectedPhase={setSelectedPhase}
            selectedReactor={selectedReactor}
            setSelectedReactor={setSelectedReactor}
            isRestrictedCombo={isRestrictedCombo}
          />
        )}

        {/* Step 3 - Terms & Policies */}
        {currentStep === 2 && (
          <div className="flex flex-col flex-full h-full">
            <div className="px-0 h-full">
              <h2 className="text-xl font-light text-primary">AGREEMENTS</h2>
            </div>
            <div className="relative z-20 text-sm text-gray-400 animate-bounce">
                All Purchases are subject to restock fees. Please read below.
                Scroll to accept ↓
              </div>
            <div className="flex-grow max-h-150 sm:max-h-95 overflow-y-auto text-xs sm:text-sm border px-4 rounded bg-black text-justify text-white space-y-8">
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

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-4 pt-4 border-t bg-transparent w-full">
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
            variationTotal={variantTotal}
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
