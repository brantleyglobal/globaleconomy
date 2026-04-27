import React from "react"

interface XchangeCard {
  id: number;
  timestamp: number;
  createdBy: string;
  partyA: string;
  partyB: string;
  deposits: { amount: number; token: string; timestamp: number }[];
  refunds: { amount: number; token: string; timestamp: number }[];
}

interface XchangeCardListProps {
  cards: XchangeCard[];
  selectedYear: number | null;
  selectedMonth: number | null;
  onYearChange: (year: number | null) => void;
  onMonthChange: (month: number | null) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize?: number;
}

type GroupedCards = Record<number, Record<number, XchangeCard[]>>;

function groupByYearMonth(cards: XchangeCard[]): GroupedCards {
  const groups: GroupedCards = {};

  for (const card of cards) {
    const d = new Date(card.timestamp * 1000);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    if (!groups[year]) groups[year] = {};
    if (!groups[year][month]) groups[year][month] = [];

    groups[year][month].push(card);
  }

  return groups;
}

function getDefaultMonth(grouped: GroupedCards, selectedYear: number): number | null {
  const months = grouped[selectedYear]
    ? Object.keys(grouped[selectedYear]).map(Number).sort((a, b) => b - a)
    : [];

  return months.length > 0 ? months[0] : 0;
}

export const XchangeCardList = ({
  cards,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  page,
  setPage,
  pageSize = 10
}: XchangeCardListProps) => {

  // Group cards by year → month
  const grouped = groupByYearMonth(cards);

  const years = Object.keys(grouped)
  .map(Number)
  .sort((a, b) => b - a);

  const activeYear = selectedYear ?? years[0];

  const months =
    activeYear && grouped[activeYear]
        ? Object.keys(grouped[activeYear]).map(Number).sort((a, b) => b - a)
        : [];

  const activeMonth = selectedMonth ?? getDefaultMonth(grouped, activeYear);

  const monthCards =
    activeMonth !== null && grouped[activeYear]?.[activeMonth]
        ? grouped[activeYear][activeMonth]
        : [];

  const paginated = monthCards.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="space-y-6">

      {/* Filters */}
      <div className="flex gap-2 justify-end">
        {/* Year */}
        <select
            value={activeYear}
            onChange={e => {
                onYearChange(Number(e.target.value))
                setPage(1);
            }}
            className="select select-sm bg-base-200 text-white"
            >
            {years.map(y => (
                <option key={y} value={y}>{y}</option>
            ))}
        </select>

        {/* Month */}
        <select
            value={activeMonth !== null ? String(activeMonth) : ""}
            onChange={e => {
                const val = e.target.value;
                onMonthChange(val === "" ? null : Number(val));
                setPage(1);
            }}
            className="select select-sm bg-base-200 text-white"
            >
            {months.map(m => (
                <option key={m} value={String(m)}>
                {new Date(0, m - 1).toLocaleString("default", { month: "long" })}
                </option>
            ))}
        </select>

      </div>

      {/* Cards */}
      <div className="space-y-4">
        {paginated.map(card => (
          <div key={card.id} className="p-4 bg-white/5 rounded-lg border border-white/10">

            <h3 className="text-lg font-semibold mb-2">
              Xchange Contract #{card.id}
            </h3>

            <div className="text-sm text-gray-300">
              Created: {new Date(card.timestamp * 1000).toLocaleString()}
            </div>

            <div className="mt-2 space-y-1">
              <div><span className="font-semibold">Created By:</span> {card.createdBy}</div>
              <div><span className="font-semibold">Party A:</span> {card.partyA}</div>
              <div><span className="font-semibold">Party B:</span> {card.partyB}</div>
            </div>

            {/* Deposits */}
            <div className="mt-4">
              <h4 className="font-semibold mb-1">Deposits</h4>
              {card.deposits.length === 0 && (
                <div className="text-gray-400 text-sm">None</div>
              )}
              {card.deposits.map((d, i) => (
                <div key={i} className="text-sm text-gray-300">
                  {d.amount} {d.token} — {new Date(d.timestamp * 1000).toLocaleString()}
                </div>
              ))}
            </div>

            {/* Refunds */}
            <div className="mt-4">
              <h4 className="font-semibold mb-1">Refunds</h4>
              {card.refunds.length === 0 && (
                <div className="text-gray-400 text-sm">None</div>
              )}
              {card.refunds.map((r, i) => (
                <div key={i} className="text-sm text-gray-300">
                  {r.amount} {r.token} — {new Date(r.timestamp * 1000).toLocaleString()}
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};