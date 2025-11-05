import React from "react";

type Props = {
  id?: string;
  onClose: () => void;
};

export default function HelpStep({ id, onClose }: Props) {
  return (
    <div
      id={id}
      className="p-4 bg-secondary/30 rounded-md border border-gray-700 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
    >
      <h2 id={`${id}-title`} className="text-lg font-semibold mb-2">
        How to Use GBDo Acquire
      </h2>
      <p id={`${id}-desc`} className="mb-4 text-xs text-justify leading-relaxed">
        This help section guides you through the steps to process a Global Dollar Purchase.
        There are 2 transactions conducted, the fist being the transfer of your assets. While this has been confined to this platform
        the first transaction must be conducted on your asset's chain/network, once completed and confirmed a second transaction will be conducted. 
        Associated tokens are minted, transferred to your wallet, and the entire transaction is recorded to brantley-global's ledger and database.
        You can always access this help feature by clicking the help "Icon' button.
      </p>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Transfer</h3>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Purchase Details: Enter details specific to the Transaction.</li>
          <li>Select the asset you wish to make your Global Dollar purchase with.</li>
          <li>Enter the amount you wish to you wish to convert</li>
          <li>Click "Confirm" and you will receive a confimation of each transaction as they are completed.</li>
          <li>Track your transfers from the Dashboard at any time via the "GBDo PURCHASES" tab.</li>
        </ul>
      </div>
      <button
        onClick={onClose}
        className="btn bg-black/90 px-4 py-2 w-full font-light rounded-md hover:bg-black/50"
        aria-label="Close help section"
      >
        CLOSE
      </button>
    </div>
  );
}
