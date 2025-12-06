import React, { useState, useEffect } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import type { ProjectData } from "~~/types/charts";
import { hashTypedData } from "viem";

ChartJS.register(ArcElement, Tooltip, Legend);

export function ProjectDetails({ projects }: { projects: ProjectData[] }) {
  const [selected, setSelected] = useState<ProjectData | null>(null);

  const current = selected ?? {
    name: "",
    symbol: "",
    currentValue: 0,
    projectedValue: 0,
    termLength: 0,
    userShare: 0,
    nextDistribution: "Unavailable",
    projectedGrowthRate: 0,
    userBalance: 0,
  };

  const projectedEarnings = (selected?.userBalance ?? 0) * (1 + (selected?.projectedGrowthRate ?? 0));

  /*useEffect(() => {
    if (projects.length > 0 && !selected) {
      setSelected(projects[0]);
    }
  }, [projects]);*/

  const hasData = current.currentValue > 0 || current.projectedValue > 0;

  const chartData = {
    labels: hasData
      ? ["Current Pool", "Projected Pool"]
      : ["No data"],
    datasets: [
      {
        data: hasData ? [current.currentValue, current.projectedValue] : [1],
        backgroundColor: hasData
          ? ["#60a5fa", "#4ade80"]
          : ["#374151"],
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
    <div className="bg-white/1 backdrop-blur-md rounded-xl px-6 py-4 shadow-lg flex flex-col h-full">

      {/* Donut Chart */}
      <div className="h-65 mt-6 mb-2">
        <Doughnut data={chartData} options={chartOptions} />
      </div>

      <h2 className="text-xl font-light mt-8 mb-8 text-primary">PROJECT DETAILS</h2>

      {/* Project Selector */}
      <select
        className="select rounded-md bg-black w-full text-info-600 outline-none hover:bg-white/10 border-none text-white/50 focus:ring-0 focus:outline-none"
        value={selected?.symbol ?? ""}   // safe default
        onChange={e => {
          const proj = projects.find(p => p.symbol === e.target.value);
          if (proj) setSelected(proj);
        }}
      >
        <option value="" disabled hidden className="text-gray-100">
          Select Investment
        </option>
        {projects.map(p => (
          <option key={p.symbol} value={p.symbol}>
            {p.name} • {p.symbol}
          </option>
        ))}
      </select>

      {/* Details */}
      <div className="bg-black/30 rounded-lg p-4 space-y-2 text-sm mt-4">
        <p className="flex justify-between">
          <span className="text-xs">CURRENT POOL</span>
          {selected?.currentValue !== undefined && selected?.currentValue !== null ?  (
            <span className="inline-flex items-center text-xs">
              {selected?.currentValue.toLocaleString()} GBDo
            </span>
          ) : (
            <span className="inline-flex items-center text-xs">
              Unavailable
            </span>
          )}
        </p>
        <p className="flex justify-between">
          <span className="text-xs">PROJECTED POOL</span>
          {selected?.projectedValue ? (
            <span className="inline-flex items-center text-xs">
              {selected.projectedValue.toLocaleString()} GBDo
            </span>
          ) : (
            <span className="inline-flex items-center text-xs">
              Unavailable
            </span>
          )}
        </p>
        <p className="flex justify-between">
          <span className="text-xs">YOUR SHARE</span>
          {selected?.userShare !== undefined && selected?.userShare !== null ? (
            <span className="inline-flex items-center text-xs">
              {selected.userShare.toLocaleString()}%
            </span>
          ) : (
            <span className="inline-flex items-center text-xs">
              Unavailable
            </span>
          )}
        </p>
        <p className="flex justify-between text-green-400">
          <span className="text-xs">PROJECTED EARNINGS</span>
          <span className="inline-flex items-center text-xs">
            {projectedEarnings.toLocaleString()} GBDo
          </span>
        </p>
        <p className="flex justify-between">
          <span className="text-xs">CONTRACT TERM</span>
          {selected?.termLength ? (
            <span className="inline-flex items-center text-xs">
              {selected.termLength!.toLocaleString()}
            </span>
          ) : (
            <span className="inline-flex items-center text-xs">
              Unavailable
            </span>
          )}
        </p>
        <p className="flex justify-between mb-1">
          <span className="text-xs">NEXT DISTRIBUTION</span>
          {selected?.nextDistribution !== undefined && selected?.nextDistribution !== null ? (
            <span className="inline-flex items-center text-xs">
              {selected.nextDistribution.toLocaleString()}
            </span>
          ):(
            <span className="inline-flex items-center text-xs">
              Unavailable
            </span>
          )}
        </p>
      </div>

      {/* Trust Signal */}
      <div className="mt-auto">
        <p className="text-sm text-justify text-gray-400 mt-10 mb-6">
          This section provides a breakdown of the selected project, including current pool size,
          projected growth, your share, and contract term. The donut chart compares present values
          with projected outcomes. For SmartVault contracts, projections factor in committed quarters
          and multipliers, while for held real estate investments ROI projections are calculated on
          an annual basis to reflect long‑term property performance.
        </p>
        <p className="mt-4 text-xs text-gray-400">
          Values are based on current pool data. Last updated:{" "}
          {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}