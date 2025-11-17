"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { Transaction } from "~~/components/transactions/transactions";
import { PurchaseTable } from "./tabs/purchaseTable";
import { GBDoTable } from "./tabs/GBDoTable";
import { XchangeTable } from "./tabs/xchangeTable";
import { XchangeDepositTable } from "./tabs/xchangeDepositTable";
import { XchangeRefundTable } from "./tabs/xchangeRefundTable";
import { VaultTable } from "./tabs/vaultTable";
import { TransferTable } from "./tabs/transfersTable"
import { DividendTable } from "./tabs/dividendTable"

const tabs = ["PRODUCT PURCHASES", "GBDo PURCHASES", "XCHANGE CONTRACTS",  "XCHANGE DEPOSITS", "XCHANGE REFUNDS", "TRANSFERS", "VAULT DEPOSITS", "DIVIDEND PAYOUTS"];

type TabKey = "PRODUCT PURCHASES" | "GBDo PURCHASES" | "XCHANGE CONTRACTS" | "XCHANGE DEPOSITS" | "XCHANGE REFUNDS" | "TRANSFERS" | "VAULT DEPOSITS" | "DIVIDEND PAYOUTS";

export const TransactionTabs = () => {
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("PRODUCT PURCHASES");
  const [data, setData] = useState<Record<TabKey, Transaction[]>>({
    "GBDo PURCHASES": [],
    "PRODUCT PURCHASES": [],
    "XCHANGE CONTRACTS": [],
    "XCHANGE DEPOSITS": [],
    "XCHANGE REFUNDS": [],
    TRANSFERS: [],
    "VAULT DEPOSITS": [],
    "DIVIDEND PAYOUTS": [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && userAddress) {
      fetchData(activeTab);
    }
  }, [activeTab, userAddress, isConnected]);

  useEffect(() => {
    const getAddress = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setUserAddress(accounts[0]);
            setIsConnected(true);
          } else {
            setUserAddress(null);
            setIsConnected(false);
          }

          // Listen for account changes
          window.ethereum.on?.("accountsChanged", (accounts: string[]) => {
            const newAccount = accounts.length > 0 ? accounts[0] : null;
            setUserAddress(newAccount);
            setIsConnected(!!newAccount);
          });
        } catch (err) {
          console.error("Failed to get wallet address:", err);
        }
      }
    };

    getAddress();
  }, []);

  const fetchData = async (tab: TabKey) => {
    setLoading(true);
    setError(null);

    try {
      const endpointMap = {
        "PRODUCT PURCHASES": "getPurchase",
        "GBDo PURCHASES": "getAcquisition",
        "XCHANGE CONTRACTS": "getSwap",
        "XCHANGE DEPOSITS": "getSwap",
        "XCHANGE REFUNDS": "getSwap",
        TRANSFERS: "getTransfer",
        "VAULT DEPOSITS": "getVault",
        "DIVIDEND PAYOUTS": "getRedemption",
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
        "PRODUCT PURCHASES": "purchases",
        "GBDo PURCHASES": "acquistions",
        "XCHANGE CONTRACTS": "swaps",
        "XCHANGE DEPOSITS": "swaps",
        "XCHANGE REFUNDS": "swaps",
        TRANSFERS: "transfers",
        "VAULT DEPOSITS": "vault",
        "DIVIDEND PAYOUTS": "redemptions",
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
      case "PRODUCT PURCHASES": return <PurchaseTable transactions={data["PRODUCT PURCHASES"]} />;
      case "GBDo PURCHASES": return <GBDoTable transactions={data["GBDo PURCHASES"]} />;
      case "XCHANGE CONTRACTS": return <XchangeTable transactions={data["XCHANGE CONTRACTS"]} />;
      case "XCHANGE DEPOSITS": return <XchangeDepositTable transactions={data["XCHANGE DEPOSITS"]} />;
      case "XCHANGE REFUNDS": return <XchangeRefundTable transactions={data["XCHANGE REFUNDS"]} />;
      case "TRANSFERS": return <TransferTable transactions={data.TRANSFERS} />;
      case "VAULT DEPOSITS": return <VaultTable transactions={data["VAULT DEPOSITS"]} />;
      case "DIVIDEND PAYOUTS": return <DividendTable transactions={data["DIVIDEND PAYOUTS"]} />;
      default: return null;
    }

  };

  return (
    <div className="py-2">
      {/* Mobile Dropdown */}
      <div className="md:hidden mb-4">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabKey)}
          className="select rounded-md bg-base-300  w-full text-info-600 mb-4 outline-none hover:bg-white/10 border-none focus:ring-0 focus:outline-none"
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
