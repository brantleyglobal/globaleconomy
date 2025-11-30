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
        How to Use Smart Vault Investing
      </h2>
      <p id={`${id}-desc`} className="mb-4 text-xs text-justify leading-relaxed">
        This help section guides you through the steps required to invest and collect proceeds from an Smart Vault Investment,
        make a deposit, or request a refund on AssetXchange. There is a .25% fee ($.50 minimum) that is to be deducted from depositors upon completion your investment term.
        Fees are none refundable and are collected from each depositor equally prior to the distribution of payouts. 
        Your confirmation email will contain exact details. If the values are incorrect, contact the admin via email submission on the 
        contact page @ brantley-global.com/help to resolve. The first transaction must be conducted on your depositing asset's chain/network, once completed and confirmed a second transaction will be approved and conducted. 
        Associated tokens are minted, transferred to your wallet, and the entire transaction is recorded to brantley-global's ledger and database. 
        You can always access this help section by clicking the help "Icon' button. There are also chain interaction details located on the "VERIFICATION PAGE" @ brantley-global.com/verifcations.
      </p>
      <div className="mb-4">
        {/*<div className="mb-4">
        <h3 className="font-semibold mb-2">Speculative Pair Trading</h3>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Selection: Choose "Speculative" from the initial options.</li>
          <li>You will be redirected to the Trading Dashboard.</li>
          <li>You trade the same as any currency pair by choosing the available pair to GBDo.</li>
          <li>There is a .25% fee to enter and exit all trades. Plan accordingly</li>
          <li>Track your assets from the Trading Dashboard at any time.</li>
        </ul>
        </div>*/}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Term Investing</h3>
          <ul className="list-disc list-inside text-xs space-y-1">
            <li>Selection: Choose "Term Investing" from the initial options.</li>
            <li>Select the currency you would like to invest.</li>
            <li>Select the number of quarters you would like to invest. Terms are in annual quarters (3 months equals a quarter) with a 2 quarter minimum.</li>
            <li>Enter the amount you wish to invest.</li>
            <li>There is a .25% fee to enter and exit all trades. Plan accordingly</li>
            <li>Track your assets from the Transactions Dashboard at any time.</li>
          </ul>
        </div>
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Regional Ventures Investing</h3>
          <ul className="list-disc list-inside text-xs space-y-1">
            <li>Selection: Choose "Regional Investing" from the initial options.</li>
            <li>Select the venture you would like to invest in. Please be mindful of the terms outlined in the description and downloadable pdf.</li>
            <li>Select the currency you would like to invest.</li>
            <li>Enter the amount you wish to invest.</li>
            <li>There is a .25% fee to enter and exit all investments. Plan accordingly</li>
            <li>Track your assets from the Transactions Dashboard at any time.</li>
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
