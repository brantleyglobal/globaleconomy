import React from "react";
import { Doughnut } from "react-chartjs-2";
import type { ProjectData } from "~~/types/charts";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  ChartType,
  Chart
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = ["#4ade80", "#60a5fa", "#facc15", "#f87171", "#a78bfa", "#34d399"];

export function PoolCompositionChart({ pools }: { pools: ProjectData[] }) {
  // Build numeric data with safe defaults
  const currentValues = pools.map(p => Number(p.currentValue ?? 0));
  const projectedValues = pools.map(p => Number(p.projectedValue ?? 0));

  const totalCurrent = currentValues.reduce((s, v) => s + v, 0);
  const totalProjected = projectedValues.reduce((s, v) => s + v, 0);
  const currencyImage = "/globalw.png";

  // Fallback slice if everything is zero or no pools
  const labels =
    (totalCurrent > 0 || totalProjected > 0) && pools.length > 0
      ? pools.map(p => p.symbol)
      : ["No data"];

  const colors =
    pools.length > 0
      ? pools.map((_, i) => COLORS[i % COLORS.length])
      : ["#374151"]; // neutral gray

  const chartData = {
    labels,
    datasets: [
      {
        label: "Current",
        data: totalCurrent > 0 ? currentValues : [1],
        backgroundColor: colors,
        hoverBackgroundColor: colors,
        borderWidth: 0,
      },
      {
        label: "Projected",
        data: totalProjected > 0 ? projectedValues : [1],
        backgroundColor: colors.map(c => `${c}80`), // lighter shade for projected
        hoverBackgroundColor: colors.map(c => `${c}A0`),
        borderWidth: 0,
      },
    ],
  };

  const chartOptions: ChartOptions<"doughnut"> = {
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 50,
          boxWidth: 20,
          font: { size: 12 },
          generateLabels: (chart) => {
            const labels = chart.data.labels ?? [];
            return labels.map((label, i) => ({
              text: String(label),
              fontColor: "#ffffff",
              fillStyle: COLORS[i % COLORS.length],
              strokeStyle: COLORS[i % COLORS.length],
              hidden: false,
              index: i,
            }));
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const datasetLabel = context.dataset.label || "";
            const label = context.label || "";
            const raw = context.raw;
            const value = Number(raw) || 0;
            return `${datasetLabel} - ${label}: $${value.toLocaleString()}`;
          },
        },
      },
    },
    cutout: "70%",
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="bg-white/5 rounded-lg py-4 px-6 shadow-md">
      <h2 className="text-xl font-light mb-8">PORTFOLIO OVERVIEW</h2>
      
      {/* Donut Chart with guaranteed height */}
      <div className="h-80 mt-6 mb-2">
        <Doughnut data={chartData} options={chartOptions} />
      </div>

      {/* Compact Table */}
<table className="w-full text-sm mt-8 mb-6 border-collapse">
  <thead>
    <tr className="border-b border-white/10">
      <th className="text-left font-light py-2">POOL</th>
      <th className="text-right font-light py-1">CURRENT</th>
      <th className="text-right font-light py-1">PROJECTED</th>
      <th className="text-right font-light py-1">SHARE</th>
    </tr>
  </thead>
  <tbody>
    {pools.map((pool, i) => (
      <tr key={pool.symbol} className="border-b border-white/5">
        <td className="flex items-center gap-2 py-1">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
          />
          {pool.symbol}
        </td>
        <td className="text-right py-1">
          {(pool.currentValue ?? 0).toLocaleString()} GBDo
        </td>
        <td className="text-right py-1">
          {(pool.projectedValue ?? 0).toLocaleString()} GBDo
        </td>
        <td className="text-right py-1">
          {pool.userShare ?? 0}%
        </td>
      </tr>
    ))}
  </tbody>
</table>

      {/* Disclaimer */}
      <p className="text-sm text-justify text-gray-400 mt-10 mb-4">
        This chart and table show how your investments are distributed across different pools,
        comparing current pool values with projected growth. The table below provides detailed figures for your share.
      </p>
      <p className="mt-4 mb-8 text-xs text-gray-400">
        Projected values are estimates. Last updated: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}