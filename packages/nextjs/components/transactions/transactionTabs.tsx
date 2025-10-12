"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { Transaction } from "~~/components/transactions/transactions";
import { PurchaseTable } from "./tabs/purchaseTable";
import { XchangeTable } from "./tabs/xchangeTable";
import { XchangeDepositTable } from "./tabs/xchangeDepositTable";
import { XchangeRefundTable } from "./tabs/xchangeRefundTable";
import { VaultTable } from "./tabs/vaultTable";
import { TransferTable } from "./tabs/transfersTable"
import { DividendTable } from "./tabs/dividendTable"

const tabs = ["PURCHASES", "ASSETXCHANGE",  "XDEPOSITS", "XREFUNDS", "TRANSFERS", "VAULT", "DIVIDENDS"];

type TabKey = "PURCHASES" | "ASSETXCHANGE" | "XDEPOSITS" | "XREFUNDS" | "TRANSFERS" | "VAULT" | "DIVIDENDS";

export const TransactionTabs = () => {
  const { address: userAddress, isConnected } = useAccount();

  const [activeTab, setActiveTab] = useState<TabKey>("PURCHASES");
  const [data, setData] = useState<Record<TabKey, Transaction[]>>({
    PURCHASES: [],
    ASSETXCHANGE: [],
    XDEPOSITS: [],
    XREFUNDS: [],
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
        ASSETXCHANGE: "getSwap",
        XDEPOSITS: "getSwap",
        XREFUNDS: "getSwap",
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

      const responseKeyMap: Record<TabKey, string> = {
        PURCHASES: "purchases",
        ASSETXCHANGE: "swaps",
        XDEPOSITS: "swaps",
        XREFUNDS: "swaps",
        TRANSFERS: "transfers",
        VAULT: "vault",
        DIVIDENDS: "redemptions",
      };

      const json = await res.json();
      console.log("API response:", json);
      const responseKey = responseKeyMap[tab];
      const result = json.result?.[responseKey] ?? [];
      console.log(`Data extracted for tab ${tab}:`, result);
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
      case "ASSETXCHANGE": return <XchangeTable transactions={data.ASSETXCHANGE} />;
      case "XDEPOSITS": return <XchangeDepositTable transactions={data.XDEPOSITS} />;
      case "XREFUNDS": return <XchangeRefundTable transactions={data.XREFUNDS} />;
      case "VAULT": return <VaultTable transactions={data.VAULT} />;
      case "DIVIDENDS": return <DividendTable transactions={data.DIVIDENDS} />;
      default: return null;
    }
  };

  return (
    <div className="p-4">
      {/* Mobile Dropdown */}
      <div className="md:hidden mb-4">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabKey)}
          className="select rounded-md bg-[#09120b] w-full text-info-600 mb-4 outline-none hover:bg-white/10 border-none focus:ring-0 focus:outline-none"
        >
          {tabs.map(tab => (
            <option key={tab} value={tab}>
              {tab}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden md:flex overflow-x-auto space-x-2 mb-4 pb-2 border-b border-base-300">
        {/*Desktop*/}
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
