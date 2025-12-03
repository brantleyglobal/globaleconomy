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

export function ProjectDetails({ projects }: { projects: ProjectData[] }) {
  const [selected, setSelected] = useState<ProjectData | null>(null);
  const currencyImage = "/globalw.png";
  const projectedEarnings = (selected?.userBalance) ?? 0 * (1 + (selected?.projectedGrowthRate ?? 0));

  useEffect(() => {
    if (projects.length > 0 && !selected) {
      setSelected(projects[0]);
    }
  }, [projects]);

  if (!selected) {
    return <p className="text-gray-400">Loading project details…</p>;
  }

  const chartData = {
    labels: ["Current Pool", "Projected Pool", "Contract Term"],
    datasets: [
      {
        data: [
          selected?.currentValue ?? 0,
          selected?.projectedValue ?? 0,
          selected?.termLength ?? 0
        ],
        backgroundColor: ["#60a5fa", "#4ade80"],
        hoverBackgroundColor: ["#3b82f6", "#22c55e"],
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
            padding: 50,   // adds space between chart and legend
            boxWidth: 20,

        },
      },
    },
    cutout: "70%",
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl px-6 py-4 shadow-lg">
      <h2 className="text-xl font-light mb-6">PROJECT DETAILS</h2>
      
      {/* Project Selector */}
      <select
        className="select rounded-md mt-6 bg-black w-full text-info-600 outline-none hover:bg-white/10 border-none focus:ring-0 focus:outline-none"
        value={selected.symbol}
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

      {/* Donut Chart */}
      <div className="h-65 mt-6 mb-2">
        <Doughnut data={chartData} options={chartOptions} />
      </div>

      {/* Details */}
      <div className="space-y-3 text-sm mt-6 mb-4">
        <p>
          Current Pool Size: &nbsp;
          {selected?.currentValue ? (
            <span className="inline-flex items-center">
              {selected?.currentValue.toLocaleString()} GBDo
            </span>
          ) : (
            " Data unavailable"
          )}
        </p>
        <p>
          Projected Pool Size: &nbsp;
          {selected?.projectedValue ? (
            <span className="inline-flex items-center">
              {selected.projectedValue.toLocaleString()} GBDo
            </span>
          ) : (
            " Data unavailable"
          )}
        </p>
        <p>Your Share: {selected?.userShare ?? 0}%</p>
        <p>
          Projected Earnings:&nbsp;
          {selected?.userShare ? (
            <span className="inline-flex items-center">
              {projectedEarnings.toLocaleString()} GBDo
            </span>
          ) : (
            " Data unavailable"
          )}
        </p>
        <p>Contract Term: 
          {selected?.termLength
            ? `   ${selected.termLength!.toLocaleString()}`
            : " Data unavailable"}
        </p>
        <p>Next Distribution: {selected?.nextDistribution ?? "Data unavailable"}</p>
      </div>

      {/* Trust Signal */}
      <p className="text-sm text-justify text-gray-400 mt-8 mb-6">
        This section provides a breakdown of the selected project, including current pool size,
        projected growth, your share, and contract term. The donut chart compares present values
        with projected outcomes. For SmartVault contracts, projections factor in committed quarters
        and multipliers, while for held real estate investments ROI projections are calculated on
        an annual basis to reflect long‑term property performance.
      </p>
      <p className="mt-4 mb-4 text-xs text-gray-400">
        Values are based on current pool data. Last updated:{" "}
        {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}