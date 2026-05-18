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
        This help section guides you through the steps to process a Refund.
        Enter your recipt hash received at the time of your purchase via email.
        All product purchases are subject to resock fees. Please refer to terms and conditions.
        All refunds for Dividend and Venture investments are only refundable before issuance of share tokens.
        If your reques for refund is requested after the issuance of share tokens, your request will be denied.
        If you now longer have access to the make your refund request via email @ brantley-global.com/help. 
        You can always access this help feature by clicking the help "Icon' button.
      </p>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Refund</h3>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Copy and paste the reciept number of the purchase you are requesting a refund for.</li>
          <li>Select Confirm.</li>
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
