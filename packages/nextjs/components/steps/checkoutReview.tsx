"use client";

import React, { useState, useEffect } from "react";
import { useCheckoutStore } from "~~/components/purchase/useCheckoutStore";
import { supportedCountries } from "~~/components/shipping/supportedCountries";
import { shippingRates, Region, ShippingCategory } from "~~/components/shipping/shippingRates";
import { getExchangeRates, StablecoinRate } from "~~/lib/exchangeRates";

type Props = {
  checkoutAsset: { id: number; name: string; variant: string };
  paymentMethod: "native" | "stable" | "cash";
  tokenSymbol: string;
  estimatedTotal: string;
  quantity: number;
  deliveryDays: number;
  deliveryDeadline: string;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  handlePurchaseConfirm: () => void;
};

export const CheckoutReviewStep: React.FC<Props> = ({
  checkoutAsset,
  paymentMethod,
  tokenSymbol,
  estimatedTotal,
  quantity,
  deliveryDays,
  deliveryDeadline,
  setCurrentStep,
  handlePurchaseConfirm,
}) => {

  const { shippingInfo } = useCheckoutStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [tokenRate, setTokenRate] = useState<number>(1);
  const [loadingRate, setLoadingRate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [loadingShippingCost, setLoadingShippingCost] = useState<boolean>(true);
  const renderPaymentMethod = () => {
    switch (paymentMethod) {
      case "native":
        return "GBDO";
      case "stable":
        return `${tokenSymbol} (Stablecoin)`;
      case "cash":
        return "Cash via Stripe";
    }
  };

  const onConfirm = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await handlePurchaseConfirm();  // Await async purchase
    } catch (e: any) {
      setError(e.message || "An error occurred during purchase.");
    } finally {
      setIsProcessing(false);
    }
  };

  function mapCountryToRegion(countryCode: string): Region {
    const country = supportedCountries.find(c => c.code === countryCode);
    return country ? country.region : Region.NorthAmerica; // fallback
  }

  function determineCategory(quantity: number, variant: string): ShippingCategory {
    return variant.startsWith("xseries") ? "heavy" : "standard";
  }

  async function getGBDORateFromRates() {
    const result = await getExchangeRates();
    const gbdoRate = result.gbdoRate;
    //console.log("GBDO Rate is:", gbdoRate);
    return gbdoRate;
  }

  useEffect(() => {
    setLoadingRate(true);
    getExchangeRates()
      .then(({ rates }) => {
        const rate = rates.find(r => r.symbol === tokenSymbol)?.rate ?? 1;
        setTokenRate(rate);
      })
      .catch(() => setTokenRate(1)) // fallback rate
      .finally(() => setLoadingRate(false));
  }, [tokenSymbol]);

  useEffect(() => {
    async function fetchShippingCost() {
      setLoadingShippingCost(true);
      try {
        if (!shippingInfo || !shippingInfo.country) {
          setShippingCost(0);
          return;
        }
        // You must have calculateShippingCost defined in this file or imported
        const cost = await calculateShippingCost();
        setShippingCost(cost);
      } catch (err) {
        console.error("Failed to fetch shipping cost", err);
        setShippingCost(0);
      } finally {
        setLoadingShippingCost(false);
      }
    }
    fetchShippingCost();
  }, [shippingInfo, quantity, checkoutAsset.variant, tokenRate]); // add any dependencies used inside calculateShippingCost


  // Calculate shipping cost based on shipping info
  async function calculateShippingCost(): Promise<number> {
    if (!shippingInfo?.country) return 0;
    const region = mapCountryToRegion(shippingInfo.country);
    const category = determineCategory(quantity, checkoutAsset.variant);
    const rate = shippingRates.find(
      (r) => r.region === region && r.category === category
    );
    const gbdoRate = await getGBDORateFromRates();
    const shippingTotal = (((rate ? rate.Rate : 0) * quantity) * gbdoRate) / tokenRate;
    return shippingTotal; // convert cents to dollars
  }

  const estimatedTotalNumber = Number(estimatedTotal) || 0;
  const totalIncludingShipping = (estimatedTotalNumber + shippingCost);

  return (
    <div className="flex flex-col h-full space-y-2">
      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto p-2 space-y-2 text-sm">
        <h3 className="text-lg font-light text-primary tracking-wide">
          REVIEW & CHECKOUT
        </h3>

        {/* Section: Payment */}
        <div className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] overflow-y-auto rounded-lg p-2 py-2 bg-black/40 border border-secondary/30 hover:bg-secondary/10 transition-all`}>
          <p className="text-white/80 uppercase tracking-wide text-sm font-light">
            PAYMENT
          </p>
          <p className="text-white/80 tracking-wide text-xs font-semibold">
            Method: <span className="font-semibold text-white">{tokenSymbol}</span>
          </p>
          {paymentMethod === "stable" && (
            <p>
              Protocol Fee:{" "}
              <span className="font-semibold text-white">
                {((Number(estimatedTotal) * 25) / 10_000).toFixed(2)}
              </span>
            </p>
          )}
          {paymentMethod === "cash" && (
            <p className="text-warning text-xs">
              Stripe Processing Fee applies (2.9% + $0.30 USD)
            </p>
          )}
          <p className="text-white/80 tracking-wide text-xs font-semibold">
            Product Total:{" "}
            <span className="bg-ghost text-white px-2 py-1 rounded-full font-semibold">
              {(((Number(estimatedTotal) / 10025)) * 10_000).toFixed(2)} {paymentMethod === "cash" ? "USD" : tokenSymbol}
            </span>
          </p>
          <p className="text-white/80 tracking-wide text-xs font-semibold">
            Shipping Cost:{" "}
            <span className="bg-ghost text-white px-2 py-1 rounded-full font-semibold">
              {shippingCost.toFixed(2)} {paymentMethod === "cash" ? "USD" : tokenSymbol}
            </span>
          </p>
          {/* New Total with Shipping block */}
          <p className="text-white/80 tracking-wide text-xs font-semibold mt-2 border-secondary pt-2">
            Order Total:{" "}
            <span className="bg-ghost text-white px-2 py-1 rounded-full font-semibold">
              {totalIncludingShipping.toFixed(2)} {paymentMethod === "cash" ? "USD" : tokenSymbol}
            </span>
          </p>
        </div>

        {/* Section: Product */}
        <div className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] overflow-y-auto rounded-lg p-2 py-2 bg-black/40 border border-secondary/30 hover:bg-secondary/10 transition-all`}>
          <p className="text-white uppercase tracking-wide text-sm font-light">
            PRODUCT
          </p>
          <p className="font-semibold text-xs text-white">Name: <span className="font-semibold text-xs text-white">{checkoutAsset.name}</span></p>
          <p className="font-semibold text-xs text-white">Asset ID: <span className="font-semibold text-xs text-white">{checkoutAsset.id}</span></p>
          <p className="font-semibold text-xs text-white">Quantity: <span className="font-semibold text-xs text-white">{quantity}</span></p>
        </div>

        {/* Section: Shipping Info */}
        <div className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] overflow-y-auto rounded-lg p-2 py-2 bg-black/40 border border-secondary/30 hover:bg-secondary/10 transition-all`}>
          <p className="text-white uppercase tracking-wide text-sm font-light">
            SHIPPING DETAILS
          </p>
          <p className="font-semibold text-xs text-white">Name: <span className="font-semibold text-xs text-white">{shippingInfo?.firstname} {shippingInfo?.lastname}</span></p>
          <p className="font-semibold text-xs text-white">Email: <span className="font-semibold text-xs text-white">{shippingInfo?.email}</span></p>
          <p className="font-semibold text-xs text-white">Phone: <span className="font-semibold text-xs text-white">{shippingInfo?.phone}</span></p>
          <p className="font-semibold text-xs text-white">Address: <span className="font-semibold text-xs text-white">{shippingInfo?.address}</span></p>
          <p className="font-semibold text-xs text-white">Country: <span className="font-semibold text-xs text-white">{shippingInfo?.country}</span></p>
          <p className="font-semibold text-xs text-white">Postal Code: <span className="font-semibold text-xs text-white">{shippingInfo?.postalCode}</span></p>
        </div>

        {/* Section: Delivery */}
        <div className={`max-h-[300px] sm:max-h-[300px] max-h-[200px] overflow-y-auto rounded-lg p-2 py-2 bg-black/40 border border-secondary/30 hover:bg-secondary/10 transition-all`}>
          <p className="text-white uppercase tracking-wide text-sm font-light">
            DELIVERY NOTES
          </p>
          <p className="font-semibold text-xs text-white">Time: <span className="font-semibold text-xs text-white">{deliveryDays} days</span></p>
          <p className="font-semibold text-xs text-white">Deadline: <span className="font-semibold text-xs text-white">{deliveryDeadline}</span></p>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-t bg-transparent w-full">
        <button
          className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
          onClick={() => setCurrentStep(prev =>Math.max(prev - 1, 1))}
        >
          Previous
        </button>
        <button
          className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
          onClick={onConfirm}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "CONFIRM"}
        </button>
      </div>
    </div>
  );
};
