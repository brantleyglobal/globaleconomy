"use client";

import React from "react";

export default function ArchitectureTab() {
  return (
    <div className="mx-4 space-y-10 bg-base-200 text-base-content">
      
      {/* Architecture Header */}
      <section className="space-y-2">
        <h1 className="text-3xl font-light">SYSTEM ARCHITECTURE</h1>
        <p className="text-sm max-w-3xl leading-relaxed">
          The ecosystem blends smart contract governance, QBFT consensus, and off-chain redundancy. 
          Execution authority is reserved for blockchain-enforced logic — while redundant infra 
          ensures insight, resilience, and performance without compromising finality.
        </p>
      </section>

      {/* Layer Overview */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Layered Governance Model</h2>
        <div className="overflow-x-auto rounded-box shadow">
          <table className="table table-zebra w-full text-sm bg-base-100">
            <thead className="bg-base-300 text-base-content">
              <tr>
                <th>Layer</th>
                <th>Governance Role</th>
                <th>Resilience Role</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-base-300">
                <td>Blockchain (Besu + QBFT)</td>
                <td>Validator consensus, proposal execution, slashing</td>
                <td>Permanent audit log, finality enforcement</td>
              </tr>
              <tr className="hover:bg-base-300">
                <td>Smart Contracts</td>
                <td>Access control, upgrade triggers, rotation rules</td>
                <td>Immutable state tracking, permission enforcement</td>
              </tr>
              <tr className="hover:bg-base-300">
                <td>Off-chain Indexers / DBs</td>
                <td>Proposal metadata, vote previews, health snapshots</td>
                <td>Failover-ready logs, performance metrics</td>
              </tr>
              <tr className="hover:bg-base-300">
                <td>Frontend UI & Dashboards</td>
                <td>Proposal interaction, system visibility</td>
                <td>Telemetry, validator status, emergency triggers</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Execution Paths */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Execution Paths</h2>
        <p className="text-sm text-base-content/80 max-w-3xl">
          Governance decisions originate through off-chain logic or user dashboards, then pass 
          through validator consensus and are enforced via smart contracts. Off-chain infra logs 
          metadata and visualizes state, but cannot mutate governance outcomes.
        </p>
      </section>

      {/* Redundancy Insights */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Redundancy Insights</h2>
        <p className="text-sm text-base-content/80 max-w-3xl">
          Indexers reduce load on node RPC calls, while mirrored databases allow analytics at 
          scale. Read-heavy systems help visualize uptime, slashing threats, and voting behavior — 
          but on-chain records remain the truth layer.
        </p>
      </section>

      {/* Audit Anchors */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Audit Anchors</h2>
        <p className="text-sm text-base-content/80 max-w-3xl">
          Contract events, finalized blocks, and validator slashing logic are logged permanently. 
          Proposal trails are cross-referenced with off-chain records for transparency — ensuring 
          partner trust and integrity across the stack.
        </p>
      </section>
    </div>
  );
}
