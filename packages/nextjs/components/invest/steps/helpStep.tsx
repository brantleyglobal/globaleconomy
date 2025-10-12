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
        How to Use AssetXchange
      </h2>
      <p id={`${id}-desc`} className="mb-4 text-xs text-justify leading-relaxed">
        This help section guides you through the steps required to create a new contract,
        make a deposit, or request a refund on AssetXchange. There is 10 GBDO (approx. 10.50usd) service fee to create a contract.
        Fees are none refundable as they are for contract creation. This fee is only collected upon contract creation.
        Your confirmation email will contain exact details for all parties. If the values are incorrect, contact the contract creation party to resolve.
        You can always access this help by clicking the help "Icon' button.
      </p>
      <div className="mb-4">
        <div className="mb-4">
        <h3 className="font-semibold mb-2">Speculative Pair Trading</h3>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Selection: Choose "Speculative" from the initial options.</li>
          <li>You will be redirected to the Trading Dashboard.</li>
          <li>You trade the same as any currency pair by choosing the available pair to GBDo.</li>
          <li>There is a .25% fee to enter and exit all trades. Plan accordingly</li>
          <li>Track your assets from the Trading Dashboard at any time.</li>
        </ul>
      </div>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Regional Ventures Trading</h3>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Selection: Choose "Regional Assets" from the initial options.</li>
          <li>You will be redirected to the Trading Dashboard.</li>
          <li>You trade the same as any currency pair by choosing the available pair to GBDo.</li>
          <li>There is a .25% fee to enter and exit all trades. Plan accordingly</li>
          <li>Track your assets from the Trading Dashboard at any time.</li>
        </ul>
      </div>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Speculative Pair Trading</h3>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Selection: Choose "Speculative" from the initial options.</li>
          <li>You will be redirected to the Trading Dashboard.</li>
          <li>You trade the same as any currency pair by choosing the available pair to GBDo.</li>
          <li>There is a .25% fee to enter and exit all trades. Plan accordingly</li>
          <li>Track your assets from the Trading Dashboard at any time.</li>
        </ul>
      </div>
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
