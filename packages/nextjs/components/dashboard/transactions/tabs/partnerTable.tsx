"use client";

import type { Transaction } from "~~/components/dashboard/transactions/transactions";
import { formatAmount } from "~~/components/dashboard/transactions/transactions";
import { SharedColumns } from "./sharedColumns";

export const PartnerTable = ({ transactions }: { transactions: Transaction[] }) => {
  // Filter out transactions where affiliate is null, undefined, or empty string
  const partnerTransactions = transactions.filter(
    (tx) => tx.affiliate && tx.affiliate.trim() !== ""
  );

  if (!partnerTransactions.length) {
    return (
      <div className="text-zinc-400 text-sm mt-4">
        No partner transactions found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-box shadow bg-base-100">
      <table className="table table-zebra w-full text-xs font-light">
        <thead className="bg-base-300 text-base-content">
          <tr>
            <th>Currency</th>
            <th>Account</th>
            <th>Amount</th>
            <th>Asset</th>
            <th>Quantity</th>
            <th>Commission</th>
            <th>Payout</th>
            <th>Quantity</th>
            <th>Timestamp</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {partnerTransactions.map((tx) => (
            <tr key={tx.timestamp} className="hover:bg-base-300 h-4">
              <td>{tx.paymentmethod}</td>
              <td className="truncate max-w-[120px]">{tx.affiliate}</td>
              <td>{formatAmount(tx.amount)}</td>
              <td className="font-light">{tx.asset}</td>
              <td>{tx.quantity}</td>
              <td>{formatAmount(tx.commission)}</td>
              <td>{tx.payout}</td>
              <SharedColumns tx={tx} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};