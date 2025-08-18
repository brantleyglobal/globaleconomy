"use client";

import { useAccount } from "wagmi";
import { TokenBalancesPanel } from "~~/components/balances/tokenBalancesPanel";
import { TransactionTabs } from "~~/components/transactions/transactionTabs";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-4">
        {/* Transactions */}
        <div className="lg:col-span-4">
          <TransactionTabs />
        </div>

        {/* Balances */}
        <TokenBalancesPanel />
      </div>
    </div>
  );
}
