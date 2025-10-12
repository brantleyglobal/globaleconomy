"use client";

import type { Transaction } from "~~/components/transactions/transactions";
import { SharedColumns } from "./sharedColumns";
import { useAccount } from "wagmi";

export const XchangeTable = ({ transactions }: { transactions: Transaction[] }) => {
  const { address: connectedAddress } = useAccount();

  const filteredTransactions = transactions.filter(tx => Boolean(tx.newcontract));

  if (!filteredTransactions.length) {
    return (
      <div className="text-zinc-400 text-sm mt-4">
        No new contract Xchange transactions found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-box shadow bg-base-100">
      <table className="table table-zebra w-full text-sm font-light">
        <thead className="bg-base-300 text-base-content">
          <tr>
            <th>Currency</th>          {/* Initiator token */}
            <th>Account</th>           {/* Initiator address */}
            <th>Amount</th>            {/* Initiator amount */}
            <th>Currency</th>          {/* Counterparty token */}
            <th>Account</th>           {/* Counterparty address */}
            <th>Amount</th>            {/* Counterparty amount */}
            <th>Creator Address</th>   {/* User address */}
            <th>Service</th>           {/* Service token */}
            <th>Xchange ID</th>
            <th>Timestamp</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions.map(tx => {
            let tokens: string[] = [];
            try {
              tokens = JSON.parse(tx.paymentmethod);
            } catch (e) {
              console.error("Failed to parse paymentmethod JSON for tx:", tx, e);
            }

            const initiatorToken = tokens[0] ?? "";
            const counterpartyToken = tokens[1] ?? "";
            const serviceToken = tokens[2] ?? "";

            return (
              <tr key={tx.timestamp} className="hover:bg-base-300">
                <td>{initiatorToken}</td>
                <td className="truncate max-w-[120px]">
                  {tx.initiator}
                  {connectedAddress?.toLowerCase() === tx.initiator?.toLowerCase() && " (You)"}
                </td>
                <td>{tx.amounta}</td>

                <td>{counterpartyToken}</td>
                <td className="truncate max-w-[120px]">
                  {tx.counterparty}
                  {connectedAddress?.toLowerCase() === tx.counterparty?.toLowerCase() && " (You)"}
                </td>
                <td>{tx.amountb}</td>

                <td className="truncate max-w-[120px]">
                  {tx.useraddress}
                  {connectedAddress?.toLowerCase() === tx.useraddress?.toLowerCase() && " (You)"}
                </td>

                <td>{serviceToken}</td>

                <td className="truncate max-w-[120px]">{tx.contractaddress}</td>

                <SharedColumns tx={tx} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
