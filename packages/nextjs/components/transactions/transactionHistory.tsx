// TransactionHistory.tsx
"use client";

import React, { useState } from "react";
import { Modal } from "~~/components/common/modal";

export function TransactionHistory({ transactions }) {
  const [activeEscrow, setActiveEscrow] = useState(null);
  const [activePayout, setActivePayout] = useState(null);

  return (
    <div className="col-span-4">
      <h2 className="text-xl font-light mb-4">TRANSACTIONS</h2>
      <div className="overflow-x-auto bg-base-100">
        <table className="table w-full text-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Token</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Txn</th>
              <th>Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.hash}>
                <td>{tx.timestamp}</td>
                <td>{tx.type}</td>
                <td>{tx.token}</td>
                <td>{tx.amount}</td>
                <td>{tx.status}</td>
                <td>
                  <a href={tx.link} target="_blank" className="link">
                    View
                  </a>
                </td>
                <td>
                  {tx.type === "Purchase" && tx.status === "Escrowed" && (
                    <span
                      className="badge badge-warning cursor-pointer"
                      onClick={() => setActiveEscrow(tx)}
                    >
                      Held in Escrow
                    </span>
                  )}
                  {tx.type === "Payout" && tx.status === "Settled" && (
                    <span
                      className="badge badge-success cursor-pointer"
                      onClick={() => setActivePayout(tx)}
                    >
                      View Payout
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Escrow Modal */}
      {activeEscrow && (
        <Modal
          onClose={() => setActiveEscrow(null)}
          title="Escrow Status"
        >
          <div className="space-y-2 text-sm">
            <p>
              <strong>Escrowed Amount:</strong> {activeEscrow.amount}{" "}
              {activeEscrow.token}
            </p>
            <p>
              <strong>Status:</strong> {activeEscrow.status}
            </p>
            <p>
              <strong>Purchase ID:</strong> {activeEscrow.hash}
            </p>
            <p>
              <strong>Contract:</strong>{" "}
              <a
                href={`https://localhost/address/${activeEscrow.contractAddress}`}
                className="link"
                target="_blank"
              >
                View Contract
              </a>
            </p>
            <p className="text-warning">
              Funds are locked in escrow until fulfillment or dispute resolution.
            </p>
          </div>
        </Modal>
      )}

      {/* Payout Modal */}
      {activePayout && (
        <Modal
          onClose={() => setActivePayout(null)}
          title="Dividend Payout"
        >
          <div className="space-y-2 text-sm">
            <p>
              <strong>Payout:</strong> {activePayout.amount}{" "}
              {activePayout.token}
            </p>
            <p>
              <strong>Status:</strong> {activePayout.status}
            </p>
            <p>
              <strong>Linked Investment:</strong> {activePayout.investmentId}
            </p>
            <p>
              <strong>Contract:</strong>{" "}
              <a
                href={`https://localhost/address/${activePayout.contractAddress}`} //Node   
                className="link"
                target="_blank"
              >
                View Investment Contract
              </a>
            </p>
            <p className="text-success">
              Dividend payout processed upon investment maturity.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
