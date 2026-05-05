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
        How to Use Faucet
      </h2>
      <p id={`${id}-desc`} className="mb-4 text-xs text-justify leading-relaxed">
        This help section guides you through the steps to process a Transfer.
        All transfers conducted on on this platform have 2 separate transactions.
        The first being the the transfer conducted for the asset you are attempting to transfer.
        The second transfer is to log the transfer to brantley-global's ledger. The second transfer does "not" move assets,
        it is simply there for record keeping purposes. The user has the option to track transfers "only" on the chain of 
        the asset transferred at their sole discretion by declining the second transction. While brantley-global's database 
        will maintain a record of all transactions for a period not less than 3 year, recording your tansaction to brantley-global's 
        ledger will maintain an immutable record indefinately. You can always access this help feature by clicking the help "Icon' button.
      </p>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Transfer</h3>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Transfer Details: Enter details specific to the Transaction.</li>
          <li>Select the asset you wish to transfer.</li>
          <li>Copy and paste the address you wish to transfer assets to.</li>
          <li>Enter the amount you wish to transfer</li>
          <li>Click "Confirm" and you will receive a confimation of each transaction as they are completed.</li>
          <li>Track your transfers from the Dashboard at any time via the "TRANSFERS" tab.</li>
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
