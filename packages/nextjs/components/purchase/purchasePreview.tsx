import React from "react";

type PurchaseSummaryProps = {
  assetName: string;
  assetId: number;
  metadataCID: string;
  quantity: number;
  tokenSymbol: string;
  buyer: string;
  estimatedTotal: string; // e.g. "100.00"
  estimatedEscrow: string; // e.g. "50.00"
  deliveryDays: number;
  estimatedDeadline: string; // human-readable or timestamp
  estimatedFee: string;
  status: "draft" | "confirmed";
  txhash?: string;
  summaryCID?: string;
};

export const PurchaseSummaryPreview: React.FC<PurchaseSummaryProps> = ({
  assetName,
  assetId,
  metadataCID,
  quantity,
  tokenSymbol,
  buyer,
  estimatedTotal,
  estimatedEscrow,
  deliveryDays,
  estimatedDeadline,
  estimatedFee,
  status,
  txhash,
  summaryCID,
}) => {
  return (
    <div className="border rounded p-4 bg-black shadow-sm text-sm">
      <h3 className="text-base font-semibold mb-2">
        {status === "draft" ? "Purchase Summary (Preview)" : "Purchase Summary"}
      </h3>

      <ul className="space-y-1">
        <li><strong>Asset:</strong> {assetName} (#{assetId})</li>
        <li><strong>Quantity:</strong> {quantity}</li>
        <li><strong>Price:</strong> {estimatedTotal} {tokenSymbol}</li>
        <li><strong>Escrow:</strong> {estimatedEscrow} {tokenSymbol}</li>
        <li><strong>Buyer:</strong> {buyer}</li>
        <li><strong>Delivery Window:</strong> {deliveryDays} days</li>
        <li><strong>Estimated Deadline:</strong> {estimatedDeadline}</li>
        <li><strong>Protocol Fee:</strong> {estimatedFee}</li>
        <li><strong>Asset Metadata:</strong> <a href={`https://ipfs.io/ipfs/${metadataCID}`} target="_blank" rel="noreferrer">{metadataCID}</a></li>
        {status === "confirmed" && txhash && (
          <li><strong>Transaction:</strong> <a href={`https://your-explorer.com/tx/${txhash}`} target="_blank" rel="noreferrer">{txhash.slice(0, 10)}…</a></li>
        )}
        {status === "confirmed" && summaryCID && (
          <li><strong>Stored Summary:</strong> <a href={`https://ipfs.io/ipfs/${summaryCID}`} target="_blank" rel="noreferrer">{summaryCID}</a></li>
        )}
      </ul>

      {status === "draft" && (
        <p className="text-xs mt-3 italic text-gray-500">
          This is a draft preview. The summary will be finalized and stored after checkout.
        </p>
      )}
    </div>
  );
};
