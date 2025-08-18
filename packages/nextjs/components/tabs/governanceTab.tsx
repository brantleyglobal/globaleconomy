"use client";

import React from "react";

const validators = [
  { address: "0xA1...B9", uptime: "99.7%", status: "Active", block: 1391248 },
  { address: "0xF2...C3", uptime: "98.9%", status: "Active", block: 1391248 },
  { address: "0xD4...E1", uptime: "97.5%", status: "Standby", block: 1391240 },
];

export default function GovernanceTab() {
  return (
    <div className="space-y-10 mx-4 bg-base-200 text-base-content">
      
      {/* Governance Overview */}
      <section className="space-y-2">
        <h1 className="text-3xl font-light">GOVERNANCE SYSTEM</h1>
        <p className="text-sm leading-relaxed max-w-3xl">
          Our governance logic is anchored to Hyperledger Besu's QBFT protocol, with validators 
          enforcing outcomes via smart contracts. Proposal lifecycle, rotation, and finality 
          mechanisms are executed on-chain. Off-chain systems provide indexed access, high-speed telemetry, 
          and redundancy — ensuring performance without compromising state integrity.
        </p>
      </section>

      {/* Lifecycle */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Governance Lifecycle</h2>
        <ul className="list-disc list-inside text-sm text-base-content/80 space-y-1">
          <li>Proposal metadata stored and queued off-chain.</li>
          <li>Validator consensus triggers on-chain execution.</li>
          <li>Finality recorded through smart contract events.</li>
          <li>Uptime, health, and slashing evidence tracked externally.</li>
        </ul>
      </section>

      {/* Validator Set */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Current Validator Set</h2>
        <div className="overflow-x-auto rounded-box shadow">
          <table className="table table-zebra w-full text-sm bg-base-100">
            <thead className="bg-base-300 text-base-content">
              <tr>
                <th className="px-4 py-2 text-left">Address</th>
                <th className="px-4 py-2 text-left">Uptime</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Block</th>
              </tr>
            </thead>
            <tbody>
              {validators.map((val, idx) => (
                <tr key={idx} className="hover:bg-base-300">
                  <td className="px-4 py-2 font-mono">{val.address}</td>
                  <td className="px-4 py-2">{val.uptime}</td>
                  <td className="px-4 py-2">{val.status}</td>
                  <td className="px-4 py-2">{val.block.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Redundancy Layer */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Redundancy Layer</h2>
        <p className="text-sm text-base-content/80 max-w-3xl">
          While contracts enforce validator actions, our off-chain infrastructure maintains mirrored 
          data for fast queries, health checks, and proposal history. Indexers relieve chain RPC load 
          and enable responsive governance analytics without diluting authority.
        </p>
      </section>

      {/* Contract Anchors */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Contract Anchors</h2>
        <p className="text-sm text-base-content/80 max-w-3xl">
          Governance anchors reside in upgradeable contracts handling validator permissions, 
          multi-signature verifications, and proposal resolution logic. State changes are permanently 
          logged for audit, with minimal trusted roles.
        </p>
      </section>

      {/* Finality & Safety */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Finality & Safety</h2>
        <p className="text-sm text-base-content/80 max-w-3xl">
          QBFT achieves sub-second finality under optimal conditions. Redundant systems monitor validator 
          liveness and offer failover signals. Chain events are immutable — off-chain logs are optimized for insight.
        </p>
      </section>
    </div>
  );
}
