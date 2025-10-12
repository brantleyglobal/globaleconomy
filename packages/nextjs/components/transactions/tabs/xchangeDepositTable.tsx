"use client";

import type { Transaction } from "~~/components/transactions/transactions";
import { SharedColumns } from "./sharedColumns";
import { useAccount } from "wagmi";

export const XchangeDepositTable = ({ transactions }: { transactions: Transaction[] }) => {
  const { address: connectedAddress } = useAccount();

  // Filter out transactions where newcontract or refund is true
  const filteredTransactions = transactions.filter(tx => !tx.newcontract && !tx.refund);

  if (!filteredTransactions.length) {
    return (
      <div className="text-zinc-400 text-sm mt-4">
        No Xchange deposits transactions found.
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
            <th>Xchange ID</th>
            <th>Timestamp</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions.map(tx => (
            <tr key={tx.timestamp} className="hover:bg-base-300">
              <td>{tx.paymentmethod}</td>
              <td className="truncate max-w-[120px]">
                {tx.useraddress}
                {connectedAddress?.toLowerCase() === tx.useraddress?.toLowerCase() && " (You)"}
              </td>
              <td>{tx.amounta}</td>
              <td className="truncate max-w-[120px]">{tx.contractaddress}</td>
              <SharedColumns tx={tx} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};