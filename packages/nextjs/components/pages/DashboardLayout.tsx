"use client";

import { useAccount } from "wagmi";
import { TokenBalancesPanel } from "~~/components/balances/tokenBalancesPanel";
import { TransactionTabs } from "~~/components/transactions/transactionTabs";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 p-4">
        {/* Transactions */}
        <div className="lg:col-span-4 bg-white/5 rounded-lg p-4">
          <TransactionTabs />
        </div>

        {/* Balances */}
        <div className="lg:col-span-1 bg-white/5 rounded-lg p-4 mt-1 lg:mt-0">
        <TokenBalancesPanel />
        </div>
      </div>
    </div>
  );
}
