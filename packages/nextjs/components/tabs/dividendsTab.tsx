"use client";

import React from "react";

// Phases of the lifecycle
const phases = [
  "Unlock Trigger",
];

// Original investor records
const investors = [
  {
    name: "Investor A",
    deposit: 5000,
    multiplier: 1.0,
    quarters: 1,
    status: "Unlock Trigger",
    redeemedToDate: 800,
    startQuarter: "Q102"
  },
  {
    name: "Investor B",
    deposit: 10000,
    multiplier: 1.5,
    quarters: 2,
    status: "Unlock Trigger",
    redeemedToDate: 0,
    startQuarter: "Q101"
  },
  {
    name: "Investor C",
    deposit: 7000,
    multiplier: 1.2,
    quarters: 2,
    status: "",
    redeemedToDate: 0,
    startQuarter: "Q102"
  },
  {
    name: "Investor D",
    deposit: 8000,
    multiplier: 1.4,
    quarters: 3,
    status: "",
    redeemedToDate: 0,
    startQuarter: "Q102"
  }
];

const poolAmount = 19000;
const currentQuarter = "Q102";

// Unlock calculator
const getUnlockQuarter = (start: string, quarters: number): string => {
  const base = parseInt(start.slice(1));
  const unlock = base + quarters - 1;
  return `Q${unlock}`;
};

const isUnlockingNow = (unlockQuarter: string): boolean => {
  return unlockQuarter === currentQuarter;
};

// Enriched investor logic
const enrichedInvestors = (() => {
  const data = investors.map((inv) => {
    const unlockQuarter = getUnlockQuarter(inv.startQuarter, inv.quarters);
    const unlocksNow = isUnlockingNow(unlockQuarter);

    return { ...inv, unlockQuarter, unlocksNow };
  });

  const totalUnlocking = data.filter(i => i.unlocksNow).reduce((sum, i) => sum + i.deposit, 0);
  const dividendPool = poolAmount - totalUnlocking;

  const eligible = data.filter(i => i.unlocksNow || i.unlockQuarter > currentQuarter);
  const totalWeight = eligible.reduce((sum, i) => sum + i.deposit * i.multiplier, 0);

  return data.map(i => {
    const weight = eligible.includes(i) ? (i.deposit * i.multiplier) / totalWeight : 0;
    const dividend = Math.round(dividendPool * weight);
    const redemption = i.unlocksNow ? i.deposit + dividend : dividend;

    return {
      ...i,
      poolShare: (weight * 100).toFixed(2) + "%",
      dividend,
      redemption
    };
  });
})();

// Helper totals
const totalPool = investors.reduce((sum, inv) => sum + inv.deposit, 0);
const totalRedeemed = investors.reduce((sum, inv) => sum + inv.redeemedToDate, 0);

export default function DividendOverview() {
  return (
    <div className="space-y-6 px-4">
      <h2 className="text-white text-3xl font-light">DIVIDEND LIFECYCLE</h2>

      <p className="text-zinc-300 max-w-3xl text-sm">
        All committed investments participate in the quarterly dividend pool. 
        Profits are allocated based on each user’s multiplier and duration commitment, and unlocked at the end of their cycle. 
        There are no tiers—just transparent logic and predictable value flow.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm text-zinc-400">
        <div className="space-y-2">
          <strong>Quarterly Pooling</strong>
          <ul className="list-disc pl-5 space-y-1">
            <li>Net profits logged at quarter start.</li>
            <li>Verified deposits timestamped per investor.</li>
            <li>Pool locks ahead of snapshot phase.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <strong>Snapshot Allocation</strong>
          <ul className="list-disc pl-5 space-y-1">
            <li>Investors matched to pool balance.</li>
            <li>Multiplier + duration = final weight.</li>
            <li>Snapshot occurs 5 days pre-unlock.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <strong>Unlock Trigger</strong>
          <ul className="list-disc pl-5 space-y-1">
            <li>Triggered when commitment ends.</li>
            <li>Principal + dividends unlock together.</li>
            <li>System alerts sent 48 hrs in advance.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <strong>Redemption & Rollover</strong>
          <ul className="list-disc pl-5 space-y-1">
            <li>Withdraw or reinvest flexibly.</li>
            <li>Unclaimed dividends remain accessible.</li>
            <li>Dashboard reflects all stale balances.</li>
          </ul>
        </div>
      </div>

      {/* Investor Lifecycle Table */}
      <section className="space-y-6 mt-10">
        <h2 className="text-xl font-light">INVESTOR LOGIC – Q102 Calculated Pro Forma</h2>

        <div className="overflow-x-auto rounded-box shadow">
          <table className="table table-zebra w-full text-sm bg-base-100">
            <thead className="bg-base-300 text-base-content">
              <tr>
                <th>Investor</th>
                <th>Deposit</th>
                <th>Multiplier</th>
                <th>Status</th>
                <th>Pool Share</th>
                <th>Dividend</th>
                <th>Q102 Redemption</th>
              </tr>
            </thead>
            <tbody>
              {enrichedInvestors.map((inv, i) => (
                <tr key={i} className="hover:bg-base-300">
                  <td className="font-semibold">{inv.name}</td>
                  <td>${inv.deposit.toLocaleString()}</td>
                  <td>{inv.multiplier.toFixed(1)}x</td>
                  <td>{inv.status || "-"}</td>
                  <td>{inv.poolShare}</td>
                  <td>${inv.dividend.toLocaleString()}</td>
                  <td>${inv.redemption.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Totals */}
      <div className="grid grid-cols-2 max-w-md gap-4 text-sm text-zinc-300">
        <div className="bg-white/5 rounded px-4 py-3">
          <strong className="block text-white text-xs">Total Pool Deposit</strong>
          <div className="text-lg font-bold">${poolAmount.toLocaleString()}</div>
        </div>
      </div>

      <p className="text-zinc-400 text-xs max-w-3xl pt-2">
        ✓ indicates current lifecycle status. Dividends and pool shares are auto-calculated based on unlock eligibility and multiplier weighting.
      </p>
    </div>
  );
}
