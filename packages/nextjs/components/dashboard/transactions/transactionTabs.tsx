"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { Transaction } from "~~/components/dashboard/transactions/transactions";
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [activeTab, setActiveTab] = useState<TabKey>("PRODUCT PURCHASES");
  const [data, setData] = useState<Record<TabKey, Transaction[]>>({
    "GBDo PURCHASES": [],
    "PRODUCT PURCHASES": [],
    "XCHANGE CONTRACTS": [],
    "XCHANGE DEPOSITS": [],
    "XCHANGE REFUNDS": [],
    "TRANSFERS": [],
    "VAULT DEPOSITS": [],
    "DIVIDEND PAYOUTS": [],
  });

  const paginatedData = data[activeTab].slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
        "TRANSFERS": "getTransfer",
        "VAULT DEPOSITS": "getVault",
        "DIVIDEND PAYOUTS": "getRedemption",
      } as const;

      // Optional subtype mapping if the backend expects it for getSwap
      const subtypeMap: Partial<Record<TabKey, string>> = {
        "XCHANGE CONTRACTS": "contract",
        "XCHANGE DEPOSITS": "deposit",
        "XCHANGE REFUNDS": "refund",
      };

      const responseKeyMap: Record<TabKey, string> = {
        "PRODUCT PURCHASES": "purchases",
        "GBDo PURCHASES": "acquisitions",
        "XCHANGE CONTRACTS": "swaps",
        "XCHANGE DEPOSITS": "swaps",
        "XCHANGE REFUNDS": "swaps",
        "TRANSFERS": "transfers",
        "VAULT DEPOSITS": "vault",
        "DIVIDEND PAYOUTS": "redemptions",
      };

      const method = endpointMap[tab];
      const responseKey = responseKeyMap[tab];
      const subtype = subtypeMap[tab]; // may be undefined

      const pageSize = 10; // increase so you don’t get just one
      let page = 1;
      const all: Transaction[] = [];
      const maxPages = 20; // safety cap

      // Paginate until no more results
      // If your API returns total/pages, switch to that; this “empty page stops” pattern works broadly
      while (page <= maxPages) {
        
        const normalizedAddr = userAddress?.toLowerCase();

        const body = {
          jsonrpc: "2.0",
          method,
          params: {
            // send both versions so backend can bind them
            useraddress: userAddress,
            useraddressNormalized: normalizedAddr,
            page,
            pageSize,
            ...(subtype ? { type: subtype } : {}),
          },
          id: `tx-${tab}-${page}`,
        };

        const res = await fetch("https://gateway.brantley-global.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();

        if (json.error) {
          throw new Error(json.error.message || "RPC error");
        }

        const raw = json.result?.[responseKey];

        // Normalize to array in case backend returns a single object
        const pageItems: Transaction[] = Array.isArray(raw)
          ? raw
          : raw
          ? [raw]
          : [];

        // Stop if this page returned nothing
        if (pageItems.length === 0) break;

        all.push(...pageItems);

        // If fewer than pageSize, we reached the end
        if (pageItems.length < pageSize) break;

        page += 1;
      }

      setData(prev => ({ ...prev, [tab]: all }));
    } catch (err) {
      console.error("Transaction fetch failed:", err);
      setError("Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  const renderTable = () => {
    if (!isConnected || !userAddress) return <div className="text-gray-400">Connect your wallet to view transactions.</div>;
    if (loading) return <div className="text-gray-400">Loading...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    const paginatedData = data[activeTab].slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );

    switch (activeTab) {
      case "PRODUCT PURCHASES": return <PurchaseTable transactions={paginatedData} />;
      case "GBDo PURCHASES": return <GBDoTable transactions={paginatedData} />;
      case "XCHANGE CONTRACTS": return <XchangeTable transactions={paginatedData} />;
      case "XCHANGE DEPOSITS": return <XchangeDepositTable transactions={paginatedData} />;
      case "XCHANGE REFUNDS": return <XchangeRefundTable transactions={paginatedData} />;
      case "TRANSFERS": return <TransferTable transactions={paginatedData} />;
      case "VAULT DEPOSITS": return <VaultTable transactions={paginatedData} />;
      case "DIVIDEND PAYOUTS": return <DividendTable transactions={paginatedData} />;
      default: return null;
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs header */}
      <div className="md:hidden mb-4">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabKey)}
          className="select rounded-md bg-base-300 w-full text-info-600 mb-4 outline-none hover:bg-white/10 border-none focus:ring-0 focus:outline-none"
        >
          {tabs.map(tab => (
            <option key={tab} value={tab}>
              {tab}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden md:flex overflow-x-auto space-x-2 mb-4 pb-2 border-b border-base-300">
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
      {/* Scrollable table area */}
      <div className="flex-1 overflow-y-auto">
        {renderTable()}
      </div>
      <div className="flex justify-center space-x-2 mt-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => p - 1)}
          className="px-2 py-1 text-xs bg-base-200 rounded disabled:opacity-50"
        >
          Prev
        </button>

        <span className="text-xs text-gray-400">
          Page {currentPage} of {Math.max(1, Math.ceil(data[activeTab].length / pageSize))}
        </span>

        <button
          disabled={currentPage >= Math.ceil(data[activeTab].length / pageSize)}
          onClick={() => setCurrentPage(p => p + 1)}
          className="px-2 py-1 text-xs bg-base-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};
