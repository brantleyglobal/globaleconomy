"use client";

import type { Transaction } from "~~/components/transactions/transactions";
import { SharedColumns } from "./sharedColumns";
import { useAccount } from "wagmi";

export const TransferTable = ({ transactions }: { transactions: Transaction[] }) => {
  const { address: connectedAddress } = useAccount();

  if (!transactions.length) {
    return (
      <div className="text-zinc-400 text-sm mt-4">
        No transfer transactions found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-box shadow bg-base-100">
      <table className="table table-zebra w-full text-sm font-light">
        <thead className="bg-base-300 text-base-content">
          <tr>
            <th>Currency</th>
            <th>Sender</th>
            <th>Recipient</th>
            <th>Amount</th>
            <th>Timestamp</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.timestamp} className="hover:bg-base-300">
              <td>{tx.token}</td>
              <td className="truncate max-w-[120px]">
                {tx.sender}
                {connectedAddress?.toLowerCase() === tx.sender?.toLowerCase() && " (You)"}
              </td>
              <td className="truncate max-w-[120px]">
                {tx.recipient}
                {connectedAddress?.toLowerCase() === tx.recipient?.toLowerCase() && " (You)"}
              </td>
              <td>{tx.amount}</td>
              <SharedColumns tx={tx} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
