"use client";

import { ethers } from "ethers";
import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { TokenBalancesPanel } from "~~/components/dashboard/balances/tokenBalancesPanel";
import { TransactionTabs } from "~~/components/dashboard/transactions/transactionTabs";
import { PoolCompositionChart } from "~~/components/dashboard/charts/compositionChart";
import { ProjectDetails } from "~~/components/dashboard/charts/depositDetails";
import { InvestmentEvaluator } from "~~/components/dashboard/charts/investmentEvaluator";
import deployments from "~~/lib/contracts/deployments.json";
import { generateDividendTokens } from "~~/components/constants/tokens";
import type { ProjectData } from "~~/types/charts";

async function fetchProjectData(userAddress: string): Promise<ProjectData[]> {
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_DEX_RPC_URL);

  const poolAbi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function viewSupply() view returns (uint256)",
    "function unlockQuarter() view returns (uint16)",
  ];

  const projectsConfig = [
    { name: "THE GLOBE", symbol: "GLB", termLength: 12, address: deployments.Globe, projectedValue: 100000000, projectedGrowthRate: 0.6 },
    { name: "BG CLEAN REAL ESTATE (SELL)", symbol: "CREs", termLength: 4, address: deployments.BGFFS, projectedValue: 5000000, projectedGrowthRate: 1.00 },
    { name: "BG CLEAN REAL ESTATE (HOLD)", symbol: "CREh", termLength: 4, address: deployments.BGFRS, projectedValue: 5000000, projectedGrowthRate: 0.05 },
    { name: "CLEAN GRID", symbol: "CGRi", termLength: 12, address: deployments.BGGRID, projectedValue: 10000000, projectedGrowthRate: 0.05 },
    { name: "TRANS-GREENTECH REFINERY & DEPOT US", symbol: "TGUSA", termLength: 12, address: deployments.TGUSA, projectedValue: 500000000, projectedGrowthRate: 0.7 },
    { name: "TRANS-GREENTECH REFINERY & DEPOT MX", symbol: "TGMX", termLength: 12, address: deployments.TGMX, projectedValue: 500000000, projectedGrowthRate: 0.7 },
  ];

  const projects: ProjectData[] = [];

  for (const proj of projectsConfig) {
    const contract = new ethers.Contract(proj.address, poolAbi, provider);

    let balance = 0, supply = 1, currentValue = 0, nextQuarter = "";

    try { balance = await contract.balanceOf(userAddress); } catch {}
    try { currentValue = await contract.viewSupply(); } catch {}
    try { nextQuarter = await contract.nextDistributionQuarter(); } catch {}

    const userShare = supply > 0 ? (Number(balance) / Number(supply)) * 100 : 0;

    projects.push({
      name: proj.name,
      symbol: proj.symbol,
      currentValue: Number(currentValue) || 0,
      projectedValue: proj.projectedValue ?? 0,
      termLength: proj.termLength ?? 0,
      userShare: userShare ?? 0,
      nextDistribution: nextQuarter || "Data unavailable",
      projectedGrowthRate: proj.projectedGrowthRate ?? 0,
      userBalance: Number(balance) || 0, 
    });

  }

  return projects;
}

async function fetchSmartVaultProject(userAddress: string): Promise<ProjectData | null> {
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_DEX_RPC_URL);

  const smartVaultAbi = [
    "function getRedemptionSupply() view returns (uint256)",
    "function multiplier(address token) view returns (uint8)",
  ];
  const dividendTokenAbi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function unlockQuarter() view returns (uint16)",
  ];

  const smartVault = new ethers.Contract(deployments.SmartVault, smartVaultAbi, provider);
  const tokens = generateDividendTokens();

  let multiplier = 1;
  let currentValue = 0;
  let committedQuarters;
  let balance = 0, supply = 1, nextQuarter = "Data unavailable";
  try { currentValue = await smartVault.getRedemptionSupply(); } catch {}

  // Find the first dividend token the user actually holds
  for (const token of tokens) {
    const tokenContract = new ethers.Contract(token.address, dividendTokenAbi, provider);

    try { multiplier = await smartVault.multiplier(token.address); } catch {}
    try { committedQuarters = await tokenContract.committedQuarters(token.address); } catch {}
    try { balance = await tokenContract.balanceOf(userAddress); } catch {}
    try { nextQuarter = await tokenContract.unlockQuarter(); } catch {}

    if (Number(balance) > 0) {
      const weightedBalance = Number(balance) * Number(multiplier);
      const weightedSupply = Number(supply) * Number(multiplier); // or sum across all tokens if needed
      const userShare = weightedSupply > 0 ? (weightedBalance / weightedSupply) * 100 : 0;

      return {
        name: "SMART VAULT",
        symbol: "SVT",
        currentValue: Number(currentValue),
        projectedValue: 10000000,
        userShare,
        nextDistribution: nextQuarter,
        projectedGrowthRate: 0.05,
        termLength: committedQuarters,
        userBalance: Number(balance) || 0, 
      };
    }
  }

  // If user holds no dividend tokens, still return SmartVault with defaults
  return {
    name: "SMART VAULT",
    symbol: "SVT",
    currentValue: Number(currentValue),
    projectedValue: 10000000,
    userShare: 0,
    nextDistribution: "Data unavailable",
    projectedGrowthRate: 0.05,
    termLength: committedQuarters,
    userBalance: Number(balance) || 0, 
  };
}

async function fetchAllProjects(userAddress: string): Promise<ProjectData[]> {
  const [mainProjects, smartVaultProject] = await Promise.all([
    fetchProjectData(userAddress),
    fetchSmartVaultProject(userAddress),
  ]);

  return smartVaultProject
    ? [...mainProjects, smartVaultProject]
    : mainProjects;
}

export default function DashboardPage() {
  const { address } = useAccount();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ProjectData | null>(null);

  useEffect(() => {
    if (projects.length > 0 && !selected) {
      setSelected(projects[0]);
    }
  }, [projects]);

  useEffect(() => {
    if (address) {
      setLoading(true);
      fetchAllProjects(address)
        .then(setProjects)
        .finally(() => setLoading(false));
    }
  }, [address]);
  
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 p-4">
        
        {/* Row 1: Transactions + Balances */}
        <div className="lg:col-span-4 bg-white/5 rounded-lg p-4">
          <TransactionTabs />
        </div>
        <div className="lg:col-span-1 bg-white/5 rounded-lg p-4">
          <TokenBalancesPanel />
        </div>

        {/* Row 2: Charts + Evaluator */}
        <div className="lg:col-span-5 grid grid-cols-1 lg:grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-lg p-4">
            <PoolCompositionChart pools={projects} />
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <ProjectDetails projects={projects} />
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <InvestmentEvaluator projects={projects} />
          </div>
        </div>
      </div>
    </div>
  );
}