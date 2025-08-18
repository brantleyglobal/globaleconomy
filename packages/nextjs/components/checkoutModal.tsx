"use client";

import { Modal } from "./common/modal";
import { useAccount, useWriteContract } from "wagmi";
import { createPublicClient, http } from "viem";
import React, { useEffect, useState, forwardRef, useImperativeHandle, useRef } from "react";
import { useCheckoutStore } from "~~/components/useCheckoutStore";
import { ethers } from "ethers";
import { supportedTokens } from "./constants/tokens";
import { StablecoinRate, getExchangeRates } from "~~/lib/exchangeRates";
import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";
import deployments from "~~/lib/contracts/deployments.json";
import { RainbowKitCustomConnectButton } from "~~/components/globalEco";
import { toast, Toaster } from "react-hot-toast";
import { initiatePurchase } from "~~/hooks/globalEco/usePurchaseHandler";
import { token } from "../../hardhat/typechain-types/@openzeppelin/contracts";
import { PaymentMethodStep } from "~~/components/steps/paymentMethod";
import { SystemConfigurationStep } from "~~/components/steps/systemConfiguration";
import { OutputCustomizationStep } from "~~/components/steps/outputCustomization";
import { TermsStep } from "~~/components/steps/terms";
import { CheckoutReviewStep } from "~~/components/steps/checkoutReview";
import { PurchaseSummaryStep } from "~~/components/steps/purchaseSummary";
import { PrivacyPolicyStep } from "~~/components/steps/privacyPolicy";
import { ReturnsStep } from "~~/components/steps/returns";
import { handleStripeReturn } from "~~/hooks/globalEco/usePurchaseHandler";



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

  const [currentStep, setCurrentStep] = useState<number>(1);

    // Legal and contract checks
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [returnsAccepted, setReturnsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [termsText, setTermsText] = useState<string | null>(null);
  const [privacyText, setPrivacyText] = useState<string | null>(null);
  const [returnsText, setReturnsText] = useState<string | null>(null);


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
    "Terms",
    "Refunds",
    "Privacy",
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

  function calculateTotalPrice(
    variations: Record<string, AssetVariation>,
    method: "cash" | "native" | "stable",
    tokenSymbol: string,
    exchangeData: {
      rates: StablecoinRate[];
      gbdoRate: number;
      lastUpdated: number;
    },
    basePriceInGBDO: BigInt
  ): number {
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
      const fee = subtotalGBDO * 0.0025;
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

    // Final calculation
    const finalPrice = subtotalGBDO * tokenRate;
    //console.log(`[Pricing] Final Price in ${effectiveSymbol}:`, finalPrice);

    return Math.round(finalPrice * 100) / 100;
  }

  const [finalizing, setFinalizing] = useState(true);

  async function handleNext() {
    const exchangeData = await getExchangeRates();

    const total = calculateTotalPrice(
      selectedVariations,
      paymentMethod,
      tokenSymbol,
      exchangeData,
      basePriceInGBDO
    );

    setField("estimatedTotal", total.toFixed(2));
    setCurrentStep(7);
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

        setCurrentStep(sessionId ? 8 : 7); // Step 8 for success, 7 for cancelled
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

      const total = calculateTotalPrice(
        selectedVariations,
        paymentMethod,
        tokenSymbol,
        exchangeData,
        basePriceInGBDO
      );

      setField("estimatedTotal", total.toFixed(2));
      setField("asset", checkoutAsset);

      if (!checkoutAsset) throw new Error("checkoutAsset must be defined before initiating purchase");

      const selectedTokenMeta = supportedTokens.find(t => t.symbol === tokenSymbol);
      if (!selectedTokenMeta) throw new Error(`Token metadata not found for symbol: ${tokenSymbol}`);

      const purchaseCompleted = await initiatePurchase({
        currentStep: 8,
        paymentMethod,
        checkoutAsset,
        estimatedTotal: total.toFixed(2),
        tokenSymbol,
        quantity,
        toast,
        publicClient,
        userAddress: address ?? "",
        chainId: chainId ?? GLOBALCHAIN.id,
        selectedToken: {
          symbol: tokenSymbol,
          address: selectedTokenMeta.address,
          decimals: selectedTokenMeta.decimals,
        },
        value: total.toFixed(2),
      });

      setCurrentStep(purchaseCompleted ? 8 : 7);
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
      {/* Step Tracker */}
      <div className="flex justify-between text-xs mt-10 mb-6 px-2">
        {stepLabels.map((label, index) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className={`w-4 h-4 rounded-full border-1 mb-6 ${
                currentStep > index
                  ? "bg-info border-info"
                  : currentStep === index
                  ? "bg-secondary border-info"
                  : "border-gray-400"
              }`}
            />
            <span
              className={`${
                currentStep === index ? "font-light text-info" : "text-gray-500"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2 h-[550px] flex flex-col">
        {currentStep === 1 && (
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


        {currentStep === 2 && (
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

        {/* Step 3 - Terms */}
        {currentStep === 3 && (
          <TermsStep
            termsText={termsText}
            termsAccepted={termsAccepted}
            setTermsAccepted={setTermsAccepted}
            setCurrentStep={setCurrentStep}
            currentStep={currentStep}
            customizeGroupKey={customizeGroupKey}
            selectedVariations={selectedVariations}
          />
        )}

        {/* Step 4 - Returns */}
        {currentStep === 4 && (
          <ReturnsStep
            returnsText={returnsText}
            returnsAccepted={returnsAccepted}
            setReturnsAccepted={setReturnsAccepted}
            setCurrentStep={setCurrentStep}
            currentStep={currentStep}
            customizeGroupKey={customizeGroupKey}
            selectedVariations={selectedVariations}
          />
        )}

        {/* Step 5 - Privacy */}
        {currentStep === 5 && (
          <PrivacyPolicyStep
            privacyText={privacyText}
            privacyAccepted={privacyAccepted}
            setPrivacyAccepted={setPrivacyAccepted}
            setCurrentStep={setCurrentStep}
          />
        )}

        {currentStep === 6 && (
          <PaymentMethodStep
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            handleNext={handleNext}
          />
        )}

        {/* Step 7 - Review and Checkout */}
        {currentStep === 7 && checkoutAsset && (
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

        {currentStep === 8 && (
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
