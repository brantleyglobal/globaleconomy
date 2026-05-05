"use client";

import { useEffect, useState } from "react";
import type { Transaction } from "~~/components/dashboard/transactions/transactions";
import { formatAmount } from "~~/components/dashboard/transactions/transactions";

export type SmartVaultRecord = {
  quarters: number;
  startquarter: number;
  unlockquarter: number;
  completed: boolean;
  autopay: boolean;
  dividendamount: number;
  payoutamount: number[]; // 8-stage payout array
};

export interface VaultTableProps {
  deposits: Transaction[];
  withdrawals: SmartVaultRecord[];
  selectedYear: number;
  onYearChange: (year: number | null) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize?: number;
}

function getDefaultYear(grouped: Record<number, SmartVaultRecord[]>) {
  const currentYear = new Date().getFullYear();

  if (grouped[currentYear]) return currentYear;

  // fallback to most recent year with data
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);
  return years[0] ?? currentYear;
}

function getActiveYear(
  selectedYear: number | null,
  years: number[]
) {
  const currentYear = new Date().getFullYear();

  // 1. User-selected year
  if (selectedYear && years.includes(selectedYear)) {
    return selectedYear;
  }

  // 2. Current year has data
  if (years.includes(currentYear)) {
    return currentYear;
  }

  // 3. Most recent year with data
  if (years.length > 0) {
    return years[0];
  }

  console.log("1:", selectedYear);
  console.log("2:",years);

  // 4. No data at all
  return null;
}

function getYearsFromRecords(
  deposits: { timestamp: string }[]
) {
  const years = new Set<number>();

  deposits.forEach(d => {
    years.add(new Date(d.timestamp).getFullYear());
  });

  return Array.from(years).sort((a, b) => b - a);
}

function quarterIndexToQuarter(qi: number) {
  return ((qi - 1) % 4) + 1;
}

function quarterIndexToYear(qi: number) {
  return Math.floor((qi - 1) / 4);
}

function formatQuarter(qi: number) {
  const year = quarterIndexToYear(qi);
  const quarter = quarterIndexToQuarter(qi);
  return `${year} Q${quarter}`;
}

function buildPayoutTimeline(tx: SmartVaultRecord) {
  const timeline = [];

  for (let i = 0; i < tx.quarters; i++) {
    const qi = tx.startquarter + i;        // correct quarter index
    const label = formatQuarter(qi);       // "2025 Q2"
    const amount = tx.payoutamount[i] ?? 0;

    timeline.push({
      qi,
      label,
      amount,
    });
  }

  return timeline;
}

function paginate<T>(list: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
}

function Pager({
  page,
  setPage,
  total,
  pageSize,
  ariaPrefix = ""
}: {
  page: number;
  setPage: (p: number) => void;
  total: number;
  pageSize: number;
  ariaPrefix?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-center gap-3 mt-3">
      <button
        aria-label={`${ariaPrefix} previous page`}
        disabled={page === 1}
        onClick={() => setPage(Math.max(1, page - 1))}
        className="px-2 py-1 text-xs bg-base-200 rounded disabled:opacity-50"
      >
        Prev
      </button>

      <span className="text-xs text-gray-400">
        Page {page} of {pageCount}
      </span>

      <button
        aria-label={`${ariaPrefix} next page`}
        disabled={page >= pageCount}
        onClick={() => setPage(Math.min(pageCount, page + 1))}
        className="px-2 py-1 text-xs bg-base-200 rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

export const VaultTable = ({
  deposits,
  withdrawals,
  selectedYear,
  onYearChange,
  page,
  setPage,
  pageSize = 5
}: VaultTableProps) => {

  const mappedWithdrawals = withdrawals.map(w => {
    const startYear = quarterIndexToYear(w.startquarter);
    const endYear   = quarterIndexToYear(w.unlockquarter);

    return {
      ...w,
      startYear,
      endYear
    };
  });

  const fallbackYear = new Date().getFullYear();
   console.log("4:", fallbackYear);


  const years = getYearsFromRecords(deposits);
  const activeYear = getActiveYear(selectedYear, years);

  // filter
  const yearDeposits = deposits.filter(d =>
    new Date(d.timestamp).getFullYear() === activeYear
  );

  const yearWithdrawals =
  activeYear === null
    ? []
    : mappedWithdrawals.filter(w =>
        activeYear >= w.startYear && activeYear <= w.endYear
      );

  // LOCAL pager state for each card
  const [pageDeposits, setPageDeposits] = useState(1);
  const [pageWithdrawals, setPageWithdrawals] = useState(1);

  // Reset child pages when year or underlying data changes
  useEffect(() => setPageDeposits(1), [activeYear, deposits]);
  useEffect(() => setPageWithdrawals(1), [activeYear, withdrawals]);

  // Defensive clamping if data shrinks
  useEffect(() => {
    const depositsPageCount = Math.max(1, Math.ceil(yearDeposits.length / pageSize));
    if (pageDeposits > depositsPageCount) setPageDeposits(1);
  }, [yearDeposits, pageSize, pageDeposits]);

  useEffect(() => {
    const withdrawalsPageCount = Math.max(1, Math.ceil(yearWithdrawals.length / 1));
    if (pageWithdrawals > withdrawalsPageCount) setPageWithdrawals(1);
  }, [yearWithdrawals, pageWithdrawals]);

  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const day = now.getDate();

  const currentQuarterIndex = year * 4 + quarter ;

  /*let cycleIndex = currentQuarterIndex - tx.startquarter;

  // clamp negative values
  if (cycleIndex < 0) cycleIndex = 0;*/

  // If current page is out of range for deposits, reset to page 1
  if (page > 1 && yearDeposits.length <= (page - 1) * pageSize) {
    setPage(1);
  }

  // If current page is out of range for withdrawals, reset to page 1
  if (page > 1 && yearWithdrawals.length <= (page - 1) * pageSize) {
    setPage(1);
  }
  
  // paginate
  const paginatedDeposits = paginate(yearDeposits, pageDeposits, pageSize);
  const paginatedWithdrawals = paginate(yearWithdrawals, pageWithdrawals, 1);


  const noDepositData =
    deposits.length === 0;

  const noWithdrawalData =
    withdrawals.length === 0;

  return (
    <div className="space-y-6">
      {/* Header / Year selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Smart Vault Overview</h2>

        <div className="flex items-center gap-3">
          <label htmlFor="vault-year" className="text-sm text-gray-400">Year</label>
          <select
            id="vault-year"
            value={activeYear ?? ""}
            onChange={e => {
              const val = e.target.value === "" ? null : Number(e.target.value);
              onYearChange(val);
              setPage(1);
            }}
            className="select select-sm bg-base-200 text-white"
            aria-label="Select year"
          >
            {years.length === 0 && <option value="">No years</option>}
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposits column */}
        <section aria-labelledby="vault-deposits" className="space-y-3">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 id="vault-deposits" className="text-lg font-semibold">Smart Vault Deposits</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/5 text-gray-200">
                {yearDeposits.length} deposits
              </span>
            </div>

            {noDepositData ? (
              <div className="text-gray-400 text-center py-6">No Smart Vault Deposits found.</div>
            ) : (
              <>
              <div className="space-y-3">
                {paginatedDeposits.map((tx, idx) => {
                  const amount = formatAmount(tx.depositamount) ?? "";
                  const method = (tx as any).paymentmethod ?? "";
                  const committed = (tx as any).committedquarters ?? (tx as any).quarters ?? 0;
                  const ts = new Date(tx.timestamp).toLocaleString();

                  return (
                    <article key={`${tx.timestamp}-${idx}`} className="p-3 bg-base-200 rounded-md">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                        <div>
                          <div className="text-xs text-gray-400">Amount</div>
                          <div className="text-sm font-semibold text-gray-200">{amount} {method}</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-400">Committed Quarters</div>
                          <div className="text-sm font-medium text-gray-200">{committed}</div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs text-gray-400">Timestamp</div>
                          <div className="text-sm text-gray-200">{ts}</div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {/* Deposits pager (local) */}
              <Pager
                page={pageDeposits}
                setPage={setPageDeposits}
                total={yearDeposits.length}
                pageSize={pageSize}
                ariaPrefix="Deposits"
              />
              </>
            )}
          </div>
        </section>

        {/* Withdrawals column */}
        <section aria-labelledby="vault-withdrawals" className="space-y-3">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 id="vault-withdrawals" className="text-lg font-semibold">Smart Vault Withdrawals</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/5 text-gray-200">
                {yearWithdrawals.length} active
              </span>
            </div>

            {noWithdrawalData ? (
              <div className="text-gray-400 text-center py-6">No Smart Vault Withdrawals found.</div>
            ) : (
              <>
              <div className="space-y-3">
                {paginatedWithdrawals.map((tx, idx) => (
                  <article key={`${tx.startquarter}-${idx}`} className="p-3 bg-base-200 rounded-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-200">{formatQuarter(tx.startquarter)}</div>
                        <div className="text-xs text-gray-400">Start Quarter</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tx.completed ? "bg-green-600 text-white" : "bg-white/5 text-gray-200"}`}>
                          {tx.completed ? "Completed" : "In progress"}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tx.autopay ? "bg-green-600 text-white" : "bg-white/5 text-gray-200"}`}>
                          {tx.autopay ? "AutoPay" : "Manual"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex justify-between text-sm">
                        <div className="text-gray-400">Start Quarter Index</div>
                        <div className="text-gray-200 font-medium">{tx.startquarter}</div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <div className="text-gray-400">Unlock Quarter Index</div>
                        <div className="text-gray-200 font-medium">{tx.unlockquarter}</div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <div className="text-gray-400">Quarters Committed</div>
                        <div className="text-gray-200 font-medium">{tx.quarters}</div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <div className="text-gray-400">Dividend Amount</div>
                        <div className="text-gray-200 font-medium">{tx.dividendamount}</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="font-semibold mb-2 text-sm">Payout Timeline</div>
                      <div className="bg-white/3 rounded-md overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-400">
                              <th className="px-3 py-2">Quarter</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {buildPayoutTimeline(tx).map((p) => (
                              <tr key={p.qi} className="border-t border-white/5">
                                <td className="px-3 py-2 text-gray-200">{p.label}</td>
                                <td className="px-3 py-2 text-right text-gray-200">{p.amount > 0 ? p.amount : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {/* Withdrawals pager */}
              <Pager
                page={pageWithdrawals}
                setPage={setPageWithdrawals}
                total={yearWithdrawals.length}
                pageSize={1}
                ariaPrefix="Withdrawals"
              />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}