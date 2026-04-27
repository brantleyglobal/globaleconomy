"use client";

import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { Transaction } from "~~/components/dashboard/transactions/transactions";
import { PurchaseTable } from "./tabs/purchaseTable";
import { GBDoTable } from "./tabs/GBDoTable";
import { XchangeCardList } from "./tabs/xchangeTable";
import { mergeXchange, XchangeEvent, XchangeCard } from "./utils/mergeXchange";
import { VaultTable, SmartVaultRecord, DepositRecord } from "./tabs/vaultTable";
import { InfraTable, InfrastructureRecord } from "./tabs/infraTable";
import { TransferTable } from "./tabs/transfersTable"
import { PartnerTable } from "./tabs/partnerTable"
import deployments from "~~/lib/contracts/deployments.json";

const tabs = [
  "PRODUCT PURCHASES",
  "GBDo PURCHASES",
  "TRANSFERS",
  "XCHANGE CONTRACTS",
  "VAULT WITHDRAWALS",
  "INFRASTRUCTURE WITHDRAWALS",
  "PARTNERS"
] as const;

type TabKey = keyof DataState;

type DataState = {
  "PRODUCT PURCHASES": Transaction[];
  "GBDo PURCHASES": Transaction[];
  "TRANSFERS": Transaction[];
  "XCHANGE CONTRACTS": XchangeCard[];
  "PARTNERS": Transaction[];

  // These tabs show BOTH deposits + withdrawals
  "VAULT WITHDRAWALS": {
    deposits: DepositRecord[];
    withdrawals: SmartVaultRecord[];
  };

  "INFRASTRUCTURE WITHDRAWALS": {
    deposits: DepositRecord[];
    withdrawals: InfrastructureRecord[];
  };
};

export const TransactionTabs = () => {
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const vaultWithdrawalAbi = [
    "function getUserWithdrawals(address user) view returns (tuple(address user, address token, uint8 quartersCommitted, uint16 startQuarter, uint16 unlockQuarter, bool finalize, bool autoPay, uint256 userDividendAmount, uint256 convertedDividendAmount, uint256[8] termSupplyPerStage, uint256[8] poolBalancePerStage, address[8] payoutSetter, uint256[8] amountout, bytes32[8] payoutTxHash)[])"
  ];

  const infraWithdrawalAbi = [
    "function getUserWithdrawals(address user) view returns (tuple(address user, address token, uint8 quartersCommitted, uint16 startQuarter, uint16 unlockQuarter, bool finalize, bool autoPay, uint256 timestamp, uint256 userDividendAmount, uint256 convertedDividendAmount, uint256 termTotalSupply, address[39] payoutSetter, uint256[39] amountout, bytes32[39] payoutTxHash)[])"
  ];

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("PRODUCT PURCHASES");
  const [data, setData] = useState<DataState>({
    "PRODUCT PURCHASES": [],
    "GBDo PURCHASES": [],
    "TRANSFERS": [],
    "XCHANGE CONTRACTS": [],
    "PARTNERS": [],

    "VAULT WITHDRAWALS": {
      deposits: [],
      withdrawals: []
    },

    "INFRASTRUCTURE WITHDRAWALS": {
      deposits: [],
      withdrawals: []
    }
  });

  const isTransactionTab = (
    tab: TabKey
  ): tab is
    | "PRODUCT PURCHASES"
    | "GBDo PURCHASES"
    | "XCHANGE CONTRACTS"
    | "TRANSFERS"
    | "PARTNERS" => {
    return (
      tab === "PRODUCT PURCHASES" ||
      tab === "GBDo PURCHASES" ||
      tab === "XCHANGE CONTRACTS" ||
      tab === "TRANSFERS" ||
      tab === "PARTNERS"
    );
  };

  const isDbTransactionTab = (
    tab: TabKey
  ): tab is
    | "PRODUCT PURCHASES"
    | "GBDo PURCHASES"
    | "XCHANGE CONTRACTS"
    | "TRANSFERS"
    | "PARTNERS" => {
    return (
      tab === "PRODUCT PURCHASES" ||
      tab === "GBDo PURCHASES" ||
      tab === "XCHANGE CONTRACTS" ||
      tab === "TRANSFERS" ||
      tab === "PARTNERS"
    );
  };

  let paginatedXchange: XchangeCard[] | null = null;
  let paginatedTx: Transaction[] | null = null;

  if (activeTab === "XCHANGE CONTRACTS") {
    paginatedXchange = data["XCHANGE CONTRACTS"].slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  } else if (isTransactionTab(activeTab)) {
    paginatedTx = data[activeTab].slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdrawalTabs = [
    "VAULT WITHDRAWALS",
    "INFRASTRUCTURE WITHDRAWALS"
  ];

  const depositTabs = [
    "VAULT_DEPOSITS",
    "INFRA_DEPOSITS"
  ];

  const dbTabs = [
    "PRODUCT PURCHASES",
    "GBDo PURCHASES",
    "XCHANGE CONTRACTS",
    "TRANSFERS",
    "PARTNERS",
    ...depositTabs
  ] as const;

  const endpointMap = {
    "PRODUCT PURCHASES": "getPurchase",
    "GBDo PURCHASES": "getAcquisition",
    "XCHANGE CONTRACTS": "getSwap",
    "TRANSFERS": "getTransfer",
    "PARTNERS": "getPurchase",
    "VAULT WITHDRAWALS": "getVault",
    "INFRASTRUCTURE WITHDRAWALS": "getRegion",
  } as const;

  const responseKeyMap = {
    "PRODUCT PURCHASES": "purchases",
    "GBDo PURCHASES": "acquisitions",
    "XCHANGE CONTRACTS": "swaps",
    "TRANSFERS": "transfers",
    "PARTNERS": "purchases",
    "VAULT WITHDRAWALS": "vault",
    "INFRASTRUCTURE WITHDRAWALS": "infra",
  } as const;

  const subtypeMap: Partial<Record<TabKey, string>> = {
    "XCHANGE CONTRACTS": "contract",
    "PARTNERS": "affiliates",
  };

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

  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Xchange requires year + month
    if (activeTab === "XCHANGE CONTRACTS") {
      if (!selectedYear) setSelectedYear(currentYear);
      if (!selectedMonth) setSelectedMonth(currentMonth);
      return;
    }

    // Withdrawals require year only
    if (withdrawalTabs.includes(activeTab)) {
      if (!selectedYear) setSelectedYear(currentYear);
      return;
    }

    // Deposits require year only
    if (depositTabs.includes(activeTab)) {
      if (!selectedYear) setSelectedYear(currentYear);
      return;
    }

  }, [activeTab]);

  useEffect(() => {
    // Leaving XCHANGE → reset year + month
    if (activeTab !== "XCHANGE CONTRACTS") {
      setSelectedMonth(null);
    }

    // Leaving any year-based tab → reset year
    if (
      !withdrawalTabs.includes(activeTab) &&
      !depositTabs.includes(activeTab)
    ) {
      setSelectedYear(null);
    }

  }, [activeTab]);

  const fetchVaultWithdrawals = async () => {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_DEX_RPC_URL);

    const contract = new ethers.Contract(
      deployments.SmartVault,
      vaultWithdrawalAbi,
      provider
    );

    let raw: any[] = [];

    try {
      const result = await contract.getUserWithdrawals(userAddress);

      // Normalize to array
      raw = Array.isArray(result) ? result : result ? [result] : [];
    } catch (err) {
      console.error("RPC error:", err);
      raw = []; // fallback to empty
    }

    // Format safely
    const formatted: SmartVaultRecord[] = raw.map((w: any) => ({
      quarters: Number(w.quartersCommitted ?? 0),
      startquarter: Number(w.startQuarter ?? 0),
      unlockquarter: Number(w.unlockQuarter ?? 0),
      completed: Boolean(w.finalize),
      autopay: Boolean(w.autoPay),
      timestamp: Number(w.timestamp ?? 0),
      dividendamount: Number(w.userDividendAmount ?? 0) / 1e18,
      payoutamount: Array.isArray(w.amountout)
        ? w.amountout.map((v: any) => Number(v ?? 0) / 1e18)
        : []
    }));

    setData(prev => ({
      ...prev,
      "VAULT WITHDRAWALS": {
        ...prev["VAULT WITHDRAWALS"],
        withdrawals: formatted
      }
    }));
    return formatted;

  };

  const fetchInfraWithdrawals = async () => {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_DEX_RPC_URL);

    const contract = new ethers.Contract(
      deployments.RegionInfrastructure,
      infraWithdrawalAbi,
      provider
    );

    let raw: any[] = [];

    try {
      const result = await contract.getUserWithdrawals(userAddress);

      // Normalize to array
      raw = Array.isArray(result) ? result : result ? [result] : [];
    } catch (err) {
      console.error("RPC error:", err);
      raw = []; // fallback to empty
    }

    // Format safely
    const formatted: InfrastructureRecord[] = raw.map((w: any) => ({
      quarters: Number(w.quartersCommitted ?? 0),
      startquarter: Number(w.startQuarter ?? 0),
      unlockquarter: Number(w.unlockQuarter ?? 0),
      completed: Boolean(w.finalize),
      autopay: Boolean(w.autoPay),
      timestamp: Number(w.timestamp ?? 0),
      dividendamount: Number(w.userDividendAmount ?? 0) / 1e18,
      payoutamount: Array.isArray(w.amountout)
        ? w.amountout.map((v: any) => Number(v ?? 0) / 1e18)
        : []
    }));

    setData(prev => ({
      ...prev,
      "INFRASTRUCTURE WITHDRAWALS": {
        ...prev["INFRASTRUCTURE WITHDRAWALS"],
        withdrawals: formatted
      }
    }));
    return formatted;

  };

  async function fetchDeposits(tab: "VAULT WITHDRAWALS" | "INFRASTRUCTURE WITHDRAWALS") {
    const method = endpointMap[tab];
    const responseKey = responseKeyMap[tab];

    let page = 1;
    let all: DepositRecord[] = [];

    while (true) {
      const res = await fetch("https://gateway.brantley-global.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method,
          params: { useraddress: userAddress, page, pageSize: 10 },
          id: `dep-${tab}-${page}`,
        }),
      });

      const json = await res.json();
      const items = json.result?.[responseKey] ?? [];

      if (!items.length) break;

      all.push(...items);
      page++;
    }

    return all;
  }

  const fetchData = async (tab: TabKey) => {
    setLoading(true);
    setError(null);

    try{

      if (tab === "VAULT WITHDRAWALS") {
        const deposits = await fetchDeposits("VAULT WITHDRAWALS");
        const withdrawals = await fetchVaultWithdrawals();

        setData(prev => ({
          ...prev,
          "VAULT WITHDRAWALS": { deposits, withdrawals }
        }));

        return;
      }

      if (tab === "INFRASTRUCTURE WITHDRAWALS") {
        const deposits = await fetchDeposits("INFRASTRUCTURE WITHDRAWALS");
        const withdrawals = await fetchInfraWithdrawals();

        setData(prev => ({
          ...prev,
          "INFRASTRUCTURE WITHDRAWALS": { deposits, withdrawals }
        }));

        return;
      }

      if (!isTransactionTab(tab)) {
        return; // prevents TypeScript from thinking tab could be a withdrawal tab
      }

      if (!isDbTransactionTab(tab)) {
        // This prevents TypeScript from thinking tab could be a withdrawal tab
        return;
      }


      /*const endpointMap = {
        "PRODUCT PURCHASES": "getPurchase",
        "GBDo PURCHASES": "getAcquisition",
        "XCHANGE CONTRACTS": "getSwap",
        "TRANSFERS": "getTransfer",
        "PARTNERS": "getPurchase",
        "VAULT WITHDRAWALS": "getVault",
        "INFRASTRUCTURE WITHDRAWALS": "getRegion",
      } as const;

      // Optional subtype mapping if the backend expects it for getSwap
      const subtypeMap: Partial<Record<TabKey, string>> = {
        "XCHANGE CONTRACTS": "contract",
        "PARTNERS": "affiliates"
      };

      const responseKeyMap: Record<TabKey, string> = {
        "PRODUCT PURCHASES": "purchases",
        "GBDo PURCHASES": "acquisitions",
        "XCHANGE CONTRACTS": "swaps",
        "TRANSFERS": "transfers",
        "PARTNERS": "purchases",

        // These now correctly map to deposit arrays returned by the DB
        "VAULT WITHDRAWALS": "vault",
        "INFRASTRUCTURE WITHDRAWALS": "infra",
      };*/

      const method = endpointMap[tab];
      const responseKey = responseKeyMap[tab];
      const subtype = subtypeMap[tab]; // may be undefined

      const pageSize = 10; // increase so you don’t get just one
      let page = 1;
      let all: any[] = [];
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

      if (tab === "XCHANGE CONTRACTS") {
        const merged = mergeXchange(all as XchangeEvent[]);
        setData(prev => ({ ...prev, [tab]: merged }));
        return;
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

    switch (activeTab) {
      case "PRODUCT PURCHASES":
      case "GBDo PURCHASES":
      case "TRANSFERS":
      case "PARTNERS":
      case "XCHANGE CONTRACTS": {
        
        const txData = data[activeTab] as Transaction[];

        const paginated = txData.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize
        );

        if (activeTab === "PRODUCT PURCHASES")
          return <PurchaseTable transactions={paginated} />;

        if (activeTab === "GBDo PURCHASES")
          return <GBDoTable transactions={paginated} />;

        if (activeTab === "TRANSFERS")
          return <TransferTable transactions={paginated} />;

        if (activeTab === "PARTNERS")
          return <PartnerTable transactions={paginated} />;

        if (activeTab === "XCHANGE CONTRACTS" && paginatedXchange) {

          return (
            <XchangeCardList
              cards={paginatedXchange}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onYearChange={setSelectedYear}
              onMonthChange={setSelectedMonth}
              page={currentPage}
              setPage={setCurrentPage}
            />
          );
        }

        break;
      }

      case "VAULT WITHDRAWALS":
        return (
          <VaultTable
            deposits={data["VAULT WITHDRAWALS"].deposits}
            withdrawals={data["VAULT WITHDRAWALS"].withdrawals}
            selectedYear={selectedYear ?? new Date().getFullYear()}
            onYearChange={setSelectedYear}
            page={currentPage}
            setPage={setCurrentPage}
          />

        );

      case "INFRASTRUCTURE WITHDRAWALS":
        return (
          <InfraTable
            deposits={data["INFRASTRUCTURE WITHDRAWALS"].deposits}
            withdrawals={data["INFRASTRUCTURE WITHDRAWALS"].withdrawals}
            selectedYear={selectedYear ?? new Date().getFullYear()}
            onYearChange={setSelectedYear}
            page={currentPage}
            setPage={setCurrentPage}
          />
        );

      default:
        return null;
    }

  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const rawData = data[activeTab];
  const needsPagination = !["VAULT WITHDRAWALS", "INFRASTRUCTURE WITHDRAWALS"].includes(activeTab);

  const paginatedData =
    needsPagination && Array.isArray(rawData)
      ? rawData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      : rawData;

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
          Page {currentPage} of {needsPagination
            ? Math.max(1, Math.ceil((Array.isArray(rawData) ? rawData.length : 0) / pageSize)
)
            : 1}
        </span>

        <button
          disabled={needsPagination
            ? currentPage >= Math.ceil((Array.isArray(rawData) ? rawData.length : 0) / pageSize)
            : true}
          onClick={() => setCurrentPage(p => p + 1)}
          className="px-2 py-1 text-xs bg-base-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};
