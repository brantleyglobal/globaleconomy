import React, { useState, useEffect } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import type { ProjectData } from "~~/types/charts";

ChartJS.register(ArcElement, Tooltip, Legend);

function getMultiplierForTerm(term: number): number {
  switch (term) {
    case 2: return 110;
    case 3: return 115;
    case 4: return 120;
    case 5: return 130;
    case 6: return 140;
    case 7: return 150;
    case 8: return 160;
    default: return 100; // fallback
  }
}

export function InvestmentEvaluator({ projects }: { projects: ProjectData[] }) {
  const [selected, setSelected] = useState<ProjectData | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState(0);
  const [amount, setAmount] = useState(0);
  const currencyImage = "/globalw.png";

  useEffect(() => {
    if (projects.length > 0 && !selected) {
      setSelected(projects[0]);
    }
  }, [projects]);

  // Safe defaults
  const investment = amount ?? 0;
  const term = selectedQuarter ?? 0;
  const poolValue = selected?.currentValue ?? 0;
  const projectedPoolValue = selected?.projectedValue ?? 0;
  const remaining = Math.max(poolValue - investment, 0);
  const projectedRemaining = Math.max(projectedPoolValue - investment, 0);

  let projectedEarnings = 0;

  if (selected?.symbol === "SVT") {
    // SmartVault: apply multiplier based on chosen term
    const multiplier = getMultiplierForTerm(term);
    projectedEarnings =
      investment * (multiplier / 100) * (1 + (selected?.projectedGrowthRate ?? 0) * term);
  } else {
    // Other projects: simple growth
    projectedEarnings =
      investment * (1 + (selected?.projectedGrowthRate ?? 0));
  }

  const hasData = investment > 0 || poolValue > 0;

  const chartData = {
    labels: hasData
      ? ["Your Investment", "Projected Pool"]
      : ["No data"],
    datasets: [
      {
        data: hasData ? [investment,  projectedRemaining] : [1],
        backgroundColor: hasData
          ? ["#4ade80", "#1f2937", "#facc15"]
          : ["#374151"],
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
            padding: 20,   // adds space between chart and legend
        },
      },
    },
    cutout: "70%", // donut thickness
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 shadow-lg">
      <h2 className="text-xl font-light mb-8">INVESTMENT EVALUATOR</h2>

      {/* Project Selector */}
      <label className="block text-sm mb-2">SELECT PROJECT</label>
      <select
        className="select rounded-md bg-black w-full text-info-600 outline-none hover:bg-white/10 border-none focus:ring-0 focus:outline-none"
        value={selected?.symbol ?? ""}
        onChange={e => {
          const proj = projects.find(p => p.symbol === e.target.value);
          if (proj) setSelected(proj);
        }}
      >
        {projects.map(p => (
          <option key={p.symbol} value={p.symbol}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Investment Input */}
      <input
        type="text"
        inputMode="decimal"
        pattern="[0-9]*"
        className="input w-full mt-2 bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
        placeholder="Enter Investment Amount"
        value={amount || ""}
        onChange={e => setAmount(Number(e.target.value))}
      />

      {/* Term Selector – only for SmartVault */}
      {selected?.symbol === "SVT" && (
        <select
          className="input w-full mt-2 bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white/50 placeholder:text-white/50 hover:bg-secondary/5"
          value={selectedQuarter || ""}
          onChange={e => setSelectedQuarter(Number(e.target.value))}
        >
          <option value="">Select Investment Duration | Number of Quarters</option>
          {[2, 3, 4, 5, 6, 7, 8].map(q => (
            <option key={q} value={q}>
              {q} Quarter{q > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      )}

      {/* Results */}
      <div className="bg-black/30 rounded-lg p-4 space-y-2 text-sm mt-4 mb-8">
        <p className="flex justify-between">
          Investment: &nbsp;
          {selected?.projectedValue ? (
            <span className="inline-flex items-center">
              {investment.toLocaleString()} GBDo
            </span>
          ) : (
            " Data unavailable"
          )}
        </p>

        <p className="flex justify-between text-green-400">
          Projected Earnings:&nbsp;
          {selected?.projectedValue ? (
            <span className="inline-flex items-center text-">
              {projectedEarnings.toLocaleString()} GBDo
            </span>
          ) : (
            " Data unavailable"
          )}
        </p>

        <p className="flex justify-between">
          <span>Estimated Yield:</span>
          <span>{((selected?.projectedGrowthRate ?? 0) * 100).toFixed(1)}%</span>
        </p>
        <p className="flex justify-between">
          Projected Pool Size: &nbsp;
          {selected?.projectedValue ? (
            <span className="inline-flex items-center">
              {projectedPoolValue.toLocaleString()} GBDo
            </span>
          ) : (
            " Data unavailable"
          )}
        </p>

        <p className="flex justify-between mb-2">
          Contract Term: 
          {selected?.termLength
            ? `   ${selected.termLength!.toLocaleString()}`
            : " Data unavailable"}
        </p>
      </div>

      {/* Chart */}
      <div className="h-48">
        <Doughnut data={chartData} options={chartOptions} />
      </div>

      {/* Disclaimer */}
      <p className="text-sm text-justify text-gray-400 mb-6">
        Use this tool to estimate potential returns based on your investment amount and each project's
        growth assumptions. For SmartVault contracts, projections factor in the number of quarters you
        commit and the corresponding multiplier. For held real estate, ROI projections are calculated
        on an annual basis to reflect long‑term property performance.
      </p>
      <p className="mt-4 text-xs text-gray-400">
        Projections are estimates based on current pool data and may vary with market conditions.
      </p>
    </div>
  );
}