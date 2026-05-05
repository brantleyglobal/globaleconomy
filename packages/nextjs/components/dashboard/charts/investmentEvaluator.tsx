import { ethers } from "ethers";
import React, { useState, useEffect } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import type { ProjectData } from "~~/types/charts";
import { dividendTokens } from "~~/components/constants/tokens";
import Dominionabi from "~~/lib/contracts/abi/Dividend.json";

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

async function getEffectiveSupply(provider) { //NEED HELP HERE
  const tokens = dividendTokens.filter(t => !["GBDx", "COPx", "GLB", "TGUSA", "TGMX", "CREs", "CREh"].includes(t.symbol));

  if (!provider) {
    throw new Error("No provider available");
  }

  const signer = await provider.getSigner();
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const day = now.getDate();
  const currentQuarter = year * 4 + quarter;

  let globalSupply = 0;
  for (const token in tokens) {
    
    const contract = new ethers.Contract(token, Dominionabi.abi, signer);
    const unlockQuarter = await contract.unlockQuarter!();
    const committedQuarters = await contract.committedQuarters!();
    const startQuarter = unlockQuarter - committedQuarters;

    if (unlockQuarter >= currentQuarter && currentQuarter > startQuarter) {
      const supply = await contract.viewSupply!();
      const multiplier = getMultiplierForTerm(committedQuarters);
      const effectiveSupply = ((supply / 1e18) * multiplier) / 100
      globalSupply += effectiveSupply;
    }
  }

  return globalSupply;
}

async function getVentureData (provider, token, investment) { //NEED HELP HERE
  const tokens = dividendTokens.filter(t => !["GBDx", "COPx", "GLB", "TGUSA", "TGMX", "CREs", "CREh"].includes(t.symbol));

  if (!provider) {
    throw new Error("No provider available");
  }

  const signer = await provider.getSigner();    
  const contract = new ethers.Contract(token, Dominionabi.abi, signer);
  const redeemPeriod = await contract.redeemPeriod!();
  const supply = await contract.viewSupply!();
  const rate = await contract.annualRate!();
  const quarterlyRate = rate / 4;

  const principal = investment / redeemPeriod;
  const interestSlice  = ((principal * quarterlyRate) / 10000);

  const projected = (principal + interestSlice);


  return projected;
}

export function InvestmentEvaluator({ projects }: { projects: ProjectData[] }) {
  const [selected, setSelected] = useState<ProjectData | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState(0);
  const [amount, setAmount] = useState(0);

  // Safe defaults
  const investment = amount ?? 0;
  const term = selectedQuarter ?? 0;
  const minPoolValue = investment;
  const maxPoolValue = selected?.projectedValue ?? 0;
  //const remaining = Math.max(maxPoolValue - investment, 0);
  const projectedRemaining = Math.max(maxPoolValue - investment, 0);
  const [provider, setProvider] = useState<EthereumProvider | null>(null);
  const [walletName, setWalletName] = useState<string>("");

  useEffect(() => {
  if (typeof window === "undefined") return;
  const ethereum = (window as any).ethereum;
  const xdefi = (window as any).xfi;

  if (ethereum?.isMetaMask) {
      setWalletName("MetaMask");
      setProvider(ethereum);
    } else if (ethereum?.isBraveWallet) {
      setWalletName("Brave Wallet");
      setProvider(ethereum);
    } else if (ethereum) {
      setWalletName("Injected Wallet");
      setProvider(ethereum);
    }

    if (xdefi) {
      setWalletName("XDEFI Wallet");
      setProvider(xdefi.ethereum);
    }
  }, []);

  let minProjectedEarnings = 0;
  let maxProjectedEarnings = 0;
  let projectedEarnings;

  if (selected?.symbol === "SVT") {
    // SmartVault: apply multiplier based on chosen term
    const multiplier = getMultiplierForTerm(term);
    const effectiveSupply = getEffectiveSupply(provider);
    const effectiveStake = investment * (multiplier / 100);

    minProjectedEarnings =
      (minPoolValue * effectiveStake) / effectiveSupply / 100;

    maxProjectedEarnings =
      (maxPoolValue * effectiveStake) / effectiveSupply / 100;

  } else {
    // Other projects: simple amortized interest
    projectedEarnings = getVentureData(provider, token, investment);
  }

  const hasData = investment > 0 || minPoolValue > 0;

  const chartData = {
    labels: hasData
      ? ["Your Investment", "Projected Pool"]
      : ["No data"],
    datasets: [
      {
        data: hasData ? [investment,  projectedRemaining] : [1],
        backgroundColor: hasData
          ? ["#4ade80", "#60a5fa", "#facc15"]
          : ["#374151"],
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
            padding: 40,   // adds space between chart and legend
        },
      },
    },
    cutout: "70%", // donut thickness
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="bg-white/1 backdrop-blur-md rounded-xl px-6 py-4 shadow-lg flex flex-col h-full">

      {/* Chart */}
      <div className="h-65 mt-8 mb-2">
        <Doughnut data={chartData} options={chartOptions} />
      </div>

      <h2 className="text-xl text-primary font-light mt-8 mb-8">INVESTMENT EVALUATOR</h2>

      {/* Project Selector */}
      <select
        className="select rounded-md bg-black w-full text-info-600 outline-none hover:bg-white/10 text-white/50 border-none focus:ring-0 focus:outline-none"
        value={selected?.symbol ?? ""}
        onChange={e => {
          const proj = projects.find(p => p.symbol === e.target.value);
          if (proj) setSelected(proj);
        }}
      >
        <option value="" hidden className="text-gray-400">
          Select Investment
        </option>
        {projects.map(p => (
          <option key={p.symbol} value={p.symbol}>
            {p.name} • {p.symbol}
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
      <div className="bg-black/30 rounded-lg p-4 space-y-2 text-sm mt-4">
        <p className="flex justify-between">
          <span className="text-xs">INVESTMENT</span>
          {selected?.projectedValue ? (
            <span className="inline-flex items-center text-xs">
              {investment.toLocaleString()} GBDo
            </span>
          ) : (
            <span className="inline-flex items-center text-xs">
              Unavailable
            </span>
          )}
        </p>

        <p className="flex justify-between text-green-400">
          <span className="text-xs">PROJECTED EARNINGS</span> //Venture Vault Only
          {selected?.projectedValue ? (
            <span className="inline-flex items-center text-xs">
              {projectedEarnings!.toLocaleString()} GBDo
            </span>
          ) : (
            <span className="inline-flex items-center text-xs">
              Unavailable
            </span>
          )}
        </p>

        <p className="flex justify-between">
          <span className="text-xs">PROJECTED POOL MIN</span> //Smart Vault Only
          {selected?.projectedValue ? (
            <span>
              {minPoolValue.toLocaleString()} GBDo
            </span>
          ) : (
            <span className="inline-flex items-center text-xs">
              Unavailable
            </span>
          )}
        </p>
        <p className="flex justify-between">
          <span className="text-xs">PROJECTED POOL MAX</span> //Smart Vault Only
          {selected?.projectedValue ? (
            <span className="inline-flex items-center text-xs">
              {maxPoolValue.toLocaleString()} GBDo
            </span>
          ) : (
            <span className="inline-flex items-center text-xs">
              Unavailable
            </span>
          )}
        </p>

        <p className="flex justify-between mb-1">
          <span className="text-xs">CONTRACT TERM</span>
          {selected?.termLength ? (
            <span className="inline-flex items-center text-xs">
              {selected.termLength!.toLocaleString()}
            </span>
          ):( 
          <span className="inline-flex items-center text-xs">
            Unavailable
          </span>
          )}
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mt-auto">
        <p className="text-sm text-justify text-gray-400 mb-6 mt-10">
          Use this tool to estimate potential returns based on your investment amount and each project's
          growth assumptions. For SmartVault contracts, projections factor in the number of quarters you
          commit and the corresponding multiplier. For held real estate, ROI projections are calculated
          on an annual basis to reflect long‑term property performance.
        </p>
        <p className="mt-4 text-xs text-gray-400">
          Projections are estimates based on current pool data and may vary with market conditions.
        </p>
      </div>
    </div>
  );
}