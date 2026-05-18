"use client";

import type { Transaction } from "~~/components/dashboard/transactions/transactions";
import { formatAmount } from "~~/components/dashboard/transactions/transactions";
import { SharedColumns } from "./sharedColumns";

export const GBDoTable = ({ transactions }: { transactions: Transaction[] }) => {
  if (!transactions.length) {
    return (
      <div className="text-zinc-400 text-sm mt-4">
        No purchase transactions found.
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
            <th>Amount In</th>
            <th>GBDo Out</th>
            <th>Timestamp</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.timestamp} className="hover:bg-base-300 h-6">
              <td>{tx.paymentmethod}</td>
              <td className="truncate max-w-[120px]">{tx.useraddress}</td>
              <td>{formatAmount(tx.amountin)}</td>
              <td>{formatAmount(tx.amountout)}</td>
              <td className="font-light">{tx.asset}</td>
              <SharedColumns tx={tx} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
