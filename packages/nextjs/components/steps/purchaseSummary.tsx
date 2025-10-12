"use client";

import React from "react";

type StripeConfirmation = {
  amount_total: number;
  customer_details?: {
    email?: string;
  };
  id: string;
};

type Props = {
  transactionStatus: "accepted" | "confirmed" | "failed" | "pending" | "queued" | "idle" | null | undefined;
  paymentMethod: "native" | "stable" | "cash";
  tokenSymbol: string;
  stripeConfirmation?: StripeConfirmation;
  txhash?: string;
  finalizing: boolean;
  ipfsCid?: string;
};


export const PurchaseSummaryStep: React.FC<Props> = ({
  transactionStatus,
  paymentMethod,
  tokenSymbol,
  stripeConfirmation,
  txhash,
  finalizing,
  ipfsCid,
}) => {
  const getStatusMessage = (
    status: Props["transactionStatus"]
  ): string => {
    switch (status) {
      case "accepted":
        return "Transaction Accepted — Awaiting Confirmation";
      case "confirmed":
        return "Transaction Confirmed";
      case "failed":
        return "Transaction Failed";
      case "pending":
      case "queued":
      case "idle":
      case null:
      case undefined:
      default:
        return "Finalizing Payment...";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 bg-white/5 rounded-lg shadow-md text-center overflow-y-auto">
      <h3 className="text-xl font-light text-primary mb-4">PAYMENT ACCEPTED</h3>
      <p className="text-gray-700 mb-2">
        View Transaction Details The Dashboard.
      </p>
      <a
        href="/dashboard"
        className="inline-block mt-4 px-5 py-2 bg-white/15 text-white font-medium rounded hover:bg-secondary/30 transition"
      >
        Go to Dashboard
      </a>
    </div>
  );
};
