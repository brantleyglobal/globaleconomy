

export type InfrastructureRecord = {
  quarters: number;
  startquarter: number;
  unlockquarter: number;
  completed: boolean;
  autopay: boolean;
  timestamp: number;
  dividendamount: number;
  payoutamount: number[]; // 8-stage payout array
};

export type DepositRecord = {
  amount: number;
  timestamp: number;
  token?: string;
  note?: string;
};

export interface InfraTableProps {
  deposits: DepositRecord[];
  withdrawals: InfrastructureRecord[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize?: number;
}

function groupByYear(records: InfrastructureRecord[]) {
  return records.reduce((acc, r) => {
    const year = new Date(r.timestamp * 1000).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(r);
    return acc;
  }, {} as Record<number, InfrastructureRecord[]>);
}

function getDefaultYear(grouped: Record<number, InfrastructureRecord[]>) {
  const currentYear = new Date().getFullYear();

  if (grouped[currentYear]) return currentYear;

  // fallback to most recent year with data
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);
  return years[0] ?? currentYear;
}

function getActiveYear(
  selectedYear: number | undefined,
  years: number[],
  fallbackYear: number
) {
  // If user selected a valid year, use it
  if (selectedYear && years.includes(selectedYear)) {
    return selectedYear;
  }

  // If we have real years from data, use the most recent one
  if (years.length > 0) {
    return years[0];
  }

  // Only fallback when there is no data at all
  return fallbackYear;
}

function getYearsFromRecords(
  deposits: { timestamp: number }[],
  withdrawals: { timestamp: number }[]
) {
  const years = new Set<number>();

  deposits.forEach(d =>
    years.add(new Date(d.timestamp * 1000).getFullYear())
  );

  withdrawals.forEach(w =>
    years.add(new Date(w.timestamp * 1000).getFullYear())
  );

  return Array.from(years).sort((a, b) => b - a);
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

  // Combine timestamps for year selector
  //const grouped = groupByYear(withdrawals);

  const fallbackYear = new Date().getFullYear();

  const years = getYearsFromRecords(deposits, withdrawals);
  const activeYear = getActiveYear(selectedYear, years, fallbackYear);

  // filter
  const yearDeposits = deposits.filter(
    d => new Date(d.timestamp * 1000).getFullYear() === activeYear
  );

  const yearWithdrawals = withdrawals.filter(
    w => new Date(w.timestamp * 1000).getFullYear() === activeYear
  );

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
  const paginatedWithdrawals = paginate(yearWithdrawals, page, pageSize);

  return (
    <div className="space-y-6">

      {/* Year Selector */}
      <div className="flex justify-end">
        <select
          value={activeYear}
          onChange={e => {
            onYearChange(Number(e.target.value));
            setPage(1);
          }}
          className="select select-sm bg-base-200 text-white"
        >
          {years.map(y => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

      </div>

      {/* -------------------- */}
      {/* DEPOSITS CARD        */}
      {/* -------------------- */}
      <div className="bg-white/5 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Smart Vault Deposits</h2>

        {paginatedDeposits.length === 0 && (
          <div className="text-gray-400">No deposits found for {activeYear}.</div>
        )}

        <div className="space-y-3">
          {paginatedDeposits.map((tx, i) => (
            <div key={i} className="p-3 bg-base-200 rounded-md">
              <div className="font-semibold">
                {tx.amount} {tx.token}
              </div>
              <div className="text-sm text-gray-400">
                {new Date(tx.timestamp * 1000).toLocaleString()}
              </div>
              {tx.note && (
                <div className="text-xs text-gray-500 mt-1">{tx.note}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* -------------------- */}
      {/* WITHDRAWALS CARD     */}
      {/* -------------------- */}
      <div className="bg-white/5 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Smart Vault Withdrawals</h2>

        {paginatedWithdrawals.length === 0 && (
          <div className="text-gray-400">No withdrawals found for {activeYear}.</div>
        )}

        <div className="space-y-3">
          {paginatedWithdrawals.map((tx, i) => (
            <div key={i} className="p-3 bg-base-200 rounded-md">

              {/* Timestamp */}
              <div className="font-semibold">
                {new Date(tx.timestamp * 1000).toLocaleString()}
              </div>

              {/* Quarter Info */}
              <div className="text-sm text-gray-400 mt-1">
                Start Quarter: {tx.startquarter}
              </div>
              <div className="text-sm text-gray-400">
                Unlock Quarter: {tx.unlockquarter}
              </div>
              <div className="text-sm text-gray-400">
                Quarters Committed: {tx.quarters}
              </div>

              {/* Status */}
              <div className="text-sm text-gray-400 mt-1">
                Completed: {tx.completed ? "Yes" : "No"}
              </div>
              <div className="text-sm text-gray-400">
                AutoPay: {tx.autopay ? "Enabled" : "Disabled"}
              </div>

              {/* Dividend */}
              <div className="text-sm text-gray-400 mt-1">
                Dividend Amount: {tx.dividendamount}
              </div>

              {/* Payout Stages */}
              <div className="mt-3">
                <div className="font-semibold mb-1">Payout Amounts:</div>
                <div className="space-y-1">
                  {tx.payoutamount.map((amt, idx) => (
                    <div key={idx} className="text-xs text-gray-500">
                      Stage {idx + 1}: {amt}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
};