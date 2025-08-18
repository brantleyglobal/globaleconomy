"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { Transaction } from "~~/types/transactions";
import { PurchaseTable } from "./tabs/purchaseTable";
import { SwapTable } from "./tabs/swapTable";
import { VaultTable } from "./tabs/vaultTable";
import { TransferTable } from "./tabs/transfersTable"
import { DividendTable } from "./tabs/dividendTable"

const tabs = ["PURCHASES", "SWAPS",  "TRANSFERS", "VAULT", "DIVIDENDS"];

type TabKey = "PURCHASES" | "SWAPS" | "TRANSFERS" | "VAULT" | "DIVIDENDS";

export const TransactionTabs = () => {
  const { address: userAddress, isConnected } = useAccount();

  const [activeTab, setActiveTab] = useState<TabKey>("PURCHASES");
  const [data, setData] = useState<Record<TabKey, Transaction[]>>({
    PURCHASES: [],
    SWAPS: [],
    TRANSFERS: [],
    VAULT: [],
    DIVIDENDS: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && userAddress) {
      fetchData(activeTab);
    }
  }, [activeTab, userAddress, isConnected]);

  const fetchData = async (tab: TabKey) => {
    setLoading(true);
    setError(null);

    try {
      const endpointMap = {
        PURCHASES: "getPurchase",
        SWAPS: "getSwap",
        TRANSFERS: "getTransfer",
        VAULT: "getVault",
        DIVIDENDS: "getRedemption",
      };

      const res = await fetch("https://gateway.brantley-global.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: endpointMap[tab],
          params: { useraddress: userAddress, page: 1, pageSize: 10 },
          id: 1,
        }),
      });

      const json = await res.json();
      const result = json.result?.[tab.toLowerCase()] ?? [];

      setData(prev => ({ ...prev, [tab]: result }));
    } catch (err) {
      console.error(err);
      setError("Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  const renderTable = () => {
    if (!isConnected || !userAddress) return <div className="text-gray-400">Connect your wallet to view transactions.</div>;
    if (loading) return <div className="text-gray-400">Loading...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    switch (activeTab) {
      case "PURCHASES": return <PurchaseTable transactions={data.PURCHASES} />;
      case "TRANSFERS": return <TransferTable transactions={data.TRANSFERS} />;
      case "SWAPS": return <SwapTable transactions={data.SWAPS} />;
      case "VAULT": return <VaultTable transactions={data.VAULT} />;
      case "DIVIDENDS": return <DividendTable transactions={data.DIVIDENDS} />;
      default: return null;
    }
  };

  return (
    <div className="p-4">
      <div className="flex overflow-x-auto space-x-2 mb-4 pb-2 border-b border-base-300">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as TabKey)}
            className={`relative px-4 py-1 rounded-md text-xs font-light transition-colors duration-200 ${
              activeTab === tab
                ? "bg-white/10 text-white shadow-md"
                : "bg-base-200 text-base-content hover:bg-base-300"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-1 bg-accent rounded-full mt-1" />
            )}
          </button>
        ))}
      </div>
      {renderTable()}
    </div>
  );
};
