"use client";

import type { Transaction } from "~~/components/dashboard/transactions/transactions";
import { SharedColumns } from "./sharedColumns";
import { useAccount } from "wagmi";

export type InfrastructureRecord = {
  quarters: number;
  startquarter: number;
  unlockquarter: number;
  completed: boolean;
  autopay: boolean;
  dividendamount: number;
  payoutamount: number[]; //40-stage payout array
};

export interface InfraTableProps {
  deposits: Transaction[];
  withdrawals: InfrastructureRecord[];
  selectedYear: number;
  onYearChange: (year: number | null) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize?: number;
}

function getDefaultYear(grouped: Record<number, InfrastructureRecord[]>) {
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

function quarterIndexToDate(qi: number): Date {
  const year = Math.floor(qi / 4);
  const quarter = qi % 4 || 4; // handle exact multiples
  const month = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9

  return new Date(year, month, 1); // first day of quarter
}

function quarterIndexToYear(qi: number) {
  return Math.floor((qi - 1) / 4);
}

function formatQuarter(qi: number) {
  const year = quarterIndexToYear(qi);
  const quarter = quarterIndexToQuarter(qi);
  return `${year} Q${quarter}`;
}

function buildPayoutTimeline(tx: InfrastructureRecord) {
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

export const InfraTable = ({
  deposits,
  withdrawals,
  selectedYear,
  onYearChange,
  page,
  setPage,
  pageSize = 10
}: InfraTableProps) => {

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

  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const day = now.getDate();

  const currentQuarterIndex = year * 4 + quarter ;

  // If current page is out of range for deposits, reset to page 1
  if (page > 1 && yearDeposits.length <= (page - 1) * pageSize) {
    setPage(1);
  }

  // If current page is out of range for withdrawals, reset to page 1
  if (page > 1 && yearWithdrawals.length <= (page - 1) * pageSize) {
    setPage(1);
  }

  // paginate
  const paginatedDeposits = paginate(yearDeposits, page, pageSize);
  const paginatedWithdrawals = paginate(yearWithdrawals, page, 1);

  const noDepositData =
    deposits.length === 0;

  const noWithdrawalData =
    withdrawals.length === 0;

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Venture Overview</h2>

        <div className="flex items-center gap-3">
          <label htmlFor="infra-year" className="text-sm text-gray-400">Year</label>
          <select
            id="infra-year"
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
        <section aria-labelledby="infra-deposits" className="space-y-3">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 id="infra-deposits" className="text-lg font-semibold">Venture Deposits</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/5 text-gray-200">
                {yearDeposits.length} deposits
              </span>
            </div>

            {noDepositData ? (
              <div className="text-gray-400 text-center py-6">No Venture Deposits found.</div>
            ) : (
              <div className="space-y-3">
                {paginatedDeposits.map((tx, idx) => {
                  const amount = (tx as any).depositamount ?? (tx as any).amount ?? 0;
                  const method = (tx as any).paymentmethod ?? "";
                  const venture = (tx as any).venture ?? "";
                  const ts = new Date(tx.timestamp).toLocaleString();

                  return (
                    <article key={`${tx.timestamp}-${idx}`} className="p-3 bg-base-200 rounded-md">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                        <div>
                          <div className="text-xs text-gray-400">Amount</div>
                          <div className="text-sm font-semibold text-gray-200">{amount} {method}</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-400">Venture</div>
                          <div className="text-sm font-medium text-gray-200">{venture}</div>
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
            )}
          </div>
        </section>

        {/* Withdrawals column */}
        <section aria-labelledby="infra-withdrawals" className="space-y-3">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 id="infra-withdrawals" className="text-lg font-semibold">Venture Withdrawals</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/5 text-gray-200">
                {yearWithdrawals.length} active
              </span>
            </div>

            {noWithdrawalData ? (
              <div className="text-gray-400 text-center py-6">No Venture Withdrawals found.</div>
            ) : (
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
                      <div className="font-semibold mb-2 text-sm">Payout Stages</div>
                      <div className="bg-white/3 rounded-md overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-400">
                              <th className="px-3 py-2">Stage</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tx.payoutamount.map((amt, i) => (
                              <tr key={i} className="border-t border-white/5">
                                <td className="px-3 py-2 text-gray-200">Stage {i + 1}</td>
                                <td className="px-3 py-2 text-right text-gray-200">{amt > 0 ? amt : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};