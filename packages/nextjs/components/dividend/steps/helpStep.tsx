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
        How to Use Redemption Center
      </h2>
      <p id={`${id}-desc`} className="mb-4 text-xs text-justify leading-relaxed">
        Your confirmation email will contain exact details. If you have questions or concerns, contact an admin at brantley-global.com/help.
        You can always access this help by clicking the help "Icon' button. There are also chain interaction details located on the "VERIFICATION PAGE" @ brantley-global.com/verifcations.
      </p>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">New PayouT Address</h3>
        <ul className="list-disc list-inside text-xs text-justify space-y-1">
          <li>Selection: Choose "CHANGE PAYOUT ADDRESS" in the initial step.</li>
          <li>New PayoutAddress.
            <ul className="list-decimal list-inside ml-4 space-y-1">
              <li>The most recent wallet address used to claim your redemptions must be used to update your existing address.</li>
              <li>Double-check entered address before proceeding.</li>
            </ul>
          </li>
        </ul>
      </div>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Redemptions</h3>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Selection: Choose "PROCESS REDEMPTION" or "Refund" from the initial options.</li>
          <li>Fill out the redemption form with appropriate details.</li>
          <li>Refer to the contract creation confirmation email for exact contract detail.</li>
          <li>Verify transaction information before confirming. If you have not recieved an email, refer to the DASHBOARD for transaction information.</li>
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
