"use client";

import type { Transaction } from "~~/types/transactions";
import { SharedColumns } from "./sharedColumns";

export const PurchaseTable = ({ transactions }: { transactions: Transaction[] }) => {
  if (!transactions.length) {
    return (
      <div className="text-zinc-400 text-sm mt-4">
        No purchase transactions found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-box shadow bg-base-100">
      <table className="table table-zebra w-full text-sm font-light">
        <thead className="bg-base-300 text-base-content">
          <tr>
            <th>Currency</th>
            <th>Account</th>
            <th>Amount</th>
            <th>Asset</th>
            <th>Quantity</th>
            <th>Timestamp</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.timestamp} className="hover:bg-base-300">
              <td>{tx.paymentmethod}</td>
              <td className="truncate max-w-[120px]">{tx.useraddress}</td>
              <td>{tx.amount}</td>
              <td className="font-light">{tx.asset}</td>
              <td>{tx.quantity}</td>
              <SharedColumns tx={tx} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
