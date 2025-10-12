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
        <h3 className="font-semibold mb-2">New Xchange Contract Creation</h3>
        <ul className="list-disc list-inside text-xs text-justify space-y-1">
          <li>Selection: Choose "New Contract" in the initial step.</li>
          <li>Initiant.
            <ul className="list-decimal list-inside ml-4 space-y-1">
              <li>The contract creator is not required to be the depositing party to create the contract.</li>
              <li>If the contract creator (connected wallet) address does not match.</li>
              <li>If the contract creator's address matches the depositing party's address, a deposit will also be initiated after contract creation. There will be a total of "2" transactions and each transaction has an approval and confirmation.</li>
              <li>If you fail to enter the depositing party's info correctly, you will unable to deposit funds or complete a created contract. A new contract must be created</li>
              <li>Double-check entered amounts before proceeding.</li>
            </ul>
          </li>
          <li>Counterparty.
            <ul className="list-decimal list-inside ml-4 space-y-1">
              <li>If you fail to enter the depositing party's info correctly, you will unable to deposit funds or complete a created contract. A new contract must be created</li>
              <li>Double-check entered amounts before proceeding.</li>
            </ul>
          </li>
          <li>Review and confirm all details before submitting any transaction.</li>
        </ul>
      </div>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Xchange Contract Deposits & Refunds</h3>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Selection: Choose "Deposit" or "Refund" from the initial options.</li>
          <li>Fill out the deposit/refund form with appropriate details.</li>
          <li>Refer to the contract creation confirmation email for exact contract detail.</li>
          <li>Verify transaction information before confirming.</li>
          <li>Track your asset exchanges and requests carefully.</li>
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
