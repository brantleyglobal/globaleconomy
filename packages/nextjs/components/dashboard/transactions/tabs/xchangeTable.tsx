"use client";

import React from "react";

interface XchangeCard {
  id: string;
  timestamp: number;
  createdBy: string;
  partyA: string;
  partyB: string;
  deposits: { amount: string; token: string; timestamp: number }[];
  refunds: { amount: string; token: string; timestamp: number }[];
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

  // 4. No data at all
  return null;
}

function groupByYearMonth(cards: XchangeCard[]): GroupedCards {
  const groups: GroupedCards = {};

  for (const card of cards) {
    const lastRefund = card.refunds.at(-1)?.timestamp;
    const lastDeposit = card.deposits.at(-1)?.timestamp;

    const effectiveTimestamp =
      lastRefund ??
      lastDeposit ??
      card.timestamp;

    const d = new Date(effectiveTimestamp);
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
  return months.length > 0 ? months[0] : null;
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

  const activeYear = getActiveYear(selectedYear, years);

  const months =
    activeYear && grouped[activeYear]
        ? Object.keys(grouped[activeYear]).map(Number).sort((a, b) => b - a)
        : [];

  const activeMonth = (() => {
    if (selectedMonth != null && months.includes(selectedMonth)) return selectedMonth;
    if (activeYear != null) return getDefaultMonth(grouped, activeYear);
    return null;
  })();

  React.useEffect(() => {
    if (activeYear !== selectedYear) onYearChange(activeYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeYear]);

  React.useEffect(() => {
    if (activeMonth !== selectedMonth) onMonthChange(activeMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonth]);

  const monthCards =
    activeYear !== null &&
    activeMonth !== null &&
    grouped[activeYear] &&
    grouped[activeYear][activeMonth]
      ? grouped[activeYear][activeMonth]
      : [];

  // helper to compute net balance and split events per party
  const computePartyData = React.useCallback((card: XchangeCard) => {
    const depositsA = card.deposits.filter(() => true).filter(d => true); // keep original
    const refundsA = card.refunds.filter(() => true).filter(r => true);

    // split deposits/refunds by token position is not guaranteed in shape,
    // so we infer party by timestamp proximity: assume deposits array contains both parties.
    // Better: if your data includes party on events, use that. For now we split by token index heuristic:
    // We'll group events by token string to show per-party lists if tokens differ; otherwise show by amounts.
    const byToken = (events: { amount: string; token: string; timestamp: number }[])=>
      events.reduce<Record<string, { amount: string; token: string; timestamp: number }[]>>((acc, ev) => {
        acc[ev.token] ??= [];
        acc[ev.token].push(ev);
        return acc;
      }, {});

    const depositGroups = byToken(card.deposits);
    const refundGroups = byToken(card.refunds);

    // compute totals per token
    const depositTotals = Object.fromEntries(
      Object.entries(depositGroups).map(([token, evs]) => [token, evs.reduce((s, e): any => s + e.amount, 0)])
    );
    const refundTotals = Object.fromEntries(
      Object.entries(refundGroups).map(([token, evs]) => [token, evs.reduce((s, e): any => s + e.amount, 0)])
    );

    // net per token
    const tokens = Array.from(new Set([...Object.keys(depositTotals), ...Object.keys(refundTotals)]));
    const netPerToken = tokens.map(token => ({
      token,
      net: (depositTotals[token] ?? "") - (refundTotals[token] ?? ""),
      deposits: depositGroups[token] ?? [],
      refunds: refundGroups[token] ?? [],
    }));

    return netPerToken;
  }, []);

  const paginated = monthCards.slice(
    (page - 1) * pageSize,
    page * pageSize
  );


  function hasParty(ev: any): ev is { amount: string; token: string; timestamp: number; party: "A" | "B" } {
    return ev && (ev.party === "A" || ev.party === "B");
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="xchange-year" className="text-sm text-gray-400">Year</label>
          <select
            id="xchange-year"
            value={activeYear ?? ""}
            onChange={e => {
              const val = e.target.value === "" ? null : Number(e.target.value);
              onYearChange(val);
              setPage(1);
            }}
            className="select select-sm bg-base-200 text-white"
            aria-label="Filter by year"
          >
            <option value="">All years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="xchange-month" className="text-sm text-gray-400">Month</label>
          <select
            id="xchange-month"
            value={activeMonth !== null ? String(activeMonth) : ""}
            onChange={e => {
              const val = e.target.value;
              onMonthChange(val === "" ? null : Number(val));
              setPage(1);
            }}
            className="select select-sm bg-base-200 text-white"
            aria-label="Filter by month"
          >
            <option value="">All months</option>
            {months.map(m => (
              <option key={m} value={String(m)}>
                {new Date(0, m - 1).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {paginated.length === 0 && (
          <div className="p-4 text-sm text-gray-400">No contracts for the selected period.</div>
        )}

        {paginated.map((card) => {
          const tokenNets = computePartyData(card);

          // safe filters: if events include party, split by party; otherwise show combined lists
          const depositsHaveParty = card.deposits.some(hasParty);
          const refundsHaveParty = card.refunds.some(hasParty);

          const depositsA = depositsHaveParty ? card.deposits.filter(hasParty).filter(d => d.party === "A") : [];
          const depositsB = depositsHaveParty ? card.deposits.filter(hasParty).filter(d => d.party === "B") : [];
          const refundsA = refundsHaveParty ? card.refunds.filter(hasParty).filter(r => r.party === "A") : [];
          const refundsB = refundsHaveParty ? card.refunds.filter(hasParty).filter(r => r.party === "B") : [];

          // fallback combined lists when party is not present
          const combinedDeposits = !depositsHaveParty ? card.deposits : [];
          const combinedRefunds = !refundsHaveParty ? card.refunds : [];

          return (
            <article key={card.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    Xchange Contract <span className="font-mono text-sm text-gray-300">#{card.id}</span>
                  </h3>
                  <div className="text-sm text-gray-300">Created: {new Date(card.timestamp).toLocaleString()}</div>
                </div>

                <div className="text-sm text-right text-gray-400">
                  <div><span className="font-semibold text-gray-200">Created By:</span> {card.createdBy}</div>
                  <div className="mt-1 flex gap-2 justify-end">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white/5 text-gray-200">
                      Deposits: {card.deposits.length}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white/5 text-gray-200">
                      Refunds: {card.refunds.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Party pairing grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Party A */}
                <section aria-labelledby={`party-a-${card.id}`} className="p-3 bg-white/3 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <h4 id={`party-a-${card.id}`} className="font-semibold">Party A</h4>
                    <div className="text-sm text-gray-300">Wallet Address: {card.partyA}</div>
                  </div>

                  {/* Net balances */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-400 mb-1">Net Balances</div>
                    {tokenNets.length === 0 ? (
                      <div className="text-sm text-gray-400">No activity</div>
                    ) : (
                      tokenNets.map(t => (
                        <div key={`A-net-${t.token}`} className="text-sm text-gray-300">
                          <span className="font-medium">{t.token}</span>: {t.net}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Deposits */}
                  <div className="mb-2">
                    <div className="text-xs text-gray-400 mb-1">Deposits</div>

                    {depositsHaveParty ? (
                      depositsA.length === 0 ? (
                        <div className="text-sm text-gray-400">None</div>
                      ) : (
                        depositsA.map(d => (
                          <div key={`A-dep-${d.timestamp}-${d.amount}-${d.token}`} className="text-sm text-gray-300"> //// NEEDS SCALING
                            <span className="font-medium">{d.amount}</span> {d.token}
                            <span className="text-xs text-gray-400 ml-2">— {new Date(d.timestamp).toLocaleString()}</span>
                          </div>
                        ))
                      )
                    ) : (
                      // fallback: show combined deposits if no party info
                      combinedDeposits.length === 0 ? (
                        <div className="text-sm text-gray-400">None</div>
                      ) : (
                        combinedDeposits.map(d => (
                          <div key={`dep-${d.timestamp}-${d.amount}-${d.token}`} className="text-sm text-gray-300">
                            <span className="font-medium">{d.amount}</span> {d.token}
                            <span className="text-xs text-gray-400 ml-2">— {new Date(d.timestamp).toLocaleString()}</span>
                          </div>
                        ))
                      )
                    )}
                  </div>

                  {/* Refunds (Party A) */}
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Refunds</div>

                    {refundsHaveParty ? (
                      refundsA.length === 0 ? (
                        <div className="text-sm text-gray-400">None</div>
                      ) : (
                        refundsA.map(r => (
                          <div key={`A-ref-${r.timestamp}-${r.amount}-${r.token}`} className="text-sm text-gray-300">
                            <span className="font-medium">{r.amount}</span> {r.token}
                            <span className="text-xs text-gray-400 ml-2">— {new Date(r.timestamp).toLocaleString()}</span>
                          </div>
                        ))
                      )
                    ) : (
                      combinedRefunds.length === 0 ? (
                        <div className="text-sm text-gray-400">None</div>
                      ) : (
                        combinedRefunds.map(r => (
                          <div key={`ref-${r.timestamp}-${r.amount}-${r.token}`} className="text-sm text-gray-300">
                            <span className="font-medium">{r.amount}</span> {r.token}
                            <span className="text-xs text-gray-400 ml-2">— {new Date(r.timestamp).toLocaleString()}</span>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </section>

                {/* Party B */}
                <section aria-labelledby={`party-b-${card.id}`} className="p-3 bg-white/3 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <h4 id={`party-b-${card.id}`} className="font-semibold">Party B</h4>
                    <div className="text-sm text-gray-300">Wallet Address: {card.partyB}</div>
                  </div>

                  {/* Net balances */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-400 mb-1">Net Balances</div>
                    {tokenNets.length === 0 ? (
                      <div className="text-sm text-gray-400">No activity</div>
                    ) : (
                      tokenNets.map(t => (
                        <div key={`B-net-${t.token}`} className="text-sm text-gray-300">
                          <span className="font-medium">{t.token}</span>: {t.net}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Deposits (Party B) */}
                  <div className="mb-2">
                    <div className="text-xs text-gray-400 mb-1">Deposits</div>

                    {depositsHaveParty ? (
                      depositsB.length === 0 ? (
                        <div className="text-sm text-gray-400">None</div>
                      ) : (
                        depositsB.map(d => (
                          <div key={`B-dep-${d.timestamp}-${d.amount}-${d.token}`} className="text-sm text-gray-300">
                            <span className="font-medium">{d.amount}</span> {d.token}
                            <span className="text-xs text-gray-400 ml-2">— {new Date(d.timestamp).toLocaleString()}</span>
                          </div>
                        ))
                      )
                    ) : (
                      combinedDeposits.length === 0 ? (
                        <div className="text-sm text-gray-400">None</div>
                      ) : (
                        combinedDeposits.map(d => (
                          <div key={`dep-${d.timestamp}-${d.amount}-${d.token}`} className="text-sm text-gray-300">
                            <span className="font-medium">{d.amount}</span> {d.token}
                            <span className="text-xs text-gray-400 ml-2">— {new Date(d.timestamp).toLocaleString()}</span>
                          </div>
                        ))
                      )
                    )}
                  </div>

                  {/* Refunds (Party B) */}
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Refunds</div>

                    {refundsHaveParty ? (
                      refundsB.length === 0 ? (
                        <div className="text-sm text-gray-400">None</div>
                      ) : (
                        refundsB.map(r => (
                          <div key={`B-ref-${r.timestamp}-${r.amount}-${r.token}`} className="text-sm text-gray-300">
                            <span className="font-medium">{r.amount}</span> {r.token}
                            <span className="text-xs text-gray-400 ml-2">— {new Date(r.timestamp).toLocaleString()}</span>
                          </div>
                        ))
                      )
                    ) : (
                      combinedRefunds.length === 0 ? (
                        <div className="text-sm text-gray-400">None</div>
                      ) : (
                        combinedRefunds.map(r => (
                          <div key={`ref-${r.timestamp}-${r.amount}-${r.token}`} className="text-sm text-gray-300">
                            <span className="font-medium">{r.amount}</span> {r.token}
                            <span className="text-xs text-gray-400 ml-2">— {new Date(r.timestamp).toLocaleString()}</span>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </section>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};