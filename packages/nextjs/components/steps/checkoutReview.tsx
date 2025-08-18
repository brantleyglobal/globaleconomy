"use client";

import React from "react";

type Props = {
  checkoutAsset: { id: number; name: string };
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
  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Checkout Summary */}
      <div className="flex-grow overflow-y-auto p-4 space-y-6 text-sm">
        <h3 className="text-lg font-semibold">REVIEW & CHECKOUT</h3>

        {/* Payment Info */}
        <div className="space-y-1">
          <p className="font-light text-info-400">PAYMENT</p>
          <p>
            Method: <strong>
              {paymentMethod === "native"
                ? "GBDO"
                : paymentMethod === "stable"
                ? `${tokenSymbol} (Stablecoin)`
                : "Cash via Stripe"}
            </strong>
          </p>
          <p>
            Estimated Total: <strong>
              {estimatedTotal} {paymentMethod === "cash" ? "USD" : tokenSymbol}
            </strong>
          </p>

          {paymentMethod === "stable" && (
            <p>
              Protocol Fee: <strong>
                {(((Number(estimatedTotal) * 25) / 1_000_000)).toFixed(2)} {tokenSymbol}
              </strong>
            </p>
          )}
          {paymentMethod === "cash" && (
            <p className="text-warning">
              Stripe Processing Fee applies (2.9% + $0.30 USD)
            </p>
          )}
        </div>

        <hr className="border-gray-700" />

        {/* Product Info */}
        <div className="space-y-1">
          <p className="font-light text-info-400">PRODUCT</p>
          <p>Name: <strong>{checkoutAsset.name}</strong></p>
          <p>Asset ID: <strong>{checkoutAsset.id}</strong></p>
          <p>Quantity: <strong>{quantity}</strong></p>
        </div>

        <hr className="border-gray-700" />

        {/* Delivery Info */}
        <div className="space-y-1">
          <p className="font-light text-info-400">DELIVERY</p>
          <p>Time: <strong>{deliveryDays} days</strong></p>
          <p>Deadline: <strong>{deliveryDeadline}</strong></p>
        </div>
      </div>

      {/* Sticky Footer Navigation */}
      <div className="flex justify-end gap-2 p-4 border-t bg-transparent">
        <button
          className="btn btn-secondary rounded-md text-white h-6 btn-sm"
          onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
        >
          Previous
        </button>
        <button
          className="btn btn-primary rounded-md text-white h-6 btn-sm"
          onClick={handlePurchaseConfirm}
        >
          Confirm Purchase
        </button>
      </div>
    </div>
  );
};
