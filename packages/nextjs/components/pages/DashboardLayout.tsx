"use client";

import { ethers } from "ethers";
import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { TokenBalancesPanel } from "~~/components/dashboard/balances/tokenBalancesPanel";
import { TransactionTabs } from "~~/components/dashboard/transactions/transactionTabs";
import deployments from "~~/lib/contracts/deployments.json";
import { generateDividendTokens } from "~~/components/constants/tokens";
import type { ProjectData } from "~~/types/charts";

async function normalizeValue(contract: ethers.Contract, rawValue: any): Promise<number> {
  try {
    const decimals: number = await contract.decimals().catch(() => 18); // default to 18
    // ethers v6 returns bigint for rawValue, so convert directly
    return Number(rawValue) / Math.pow(10, decimals);
  } catch {
    return 0;
  }
}

function formatQuarterCode(code: number | bigint): string {
  const str = code.toString().padStart(5, "0"); // ensure 5 digits
  const yearTwoDigits = str.slice(0, 2);
  const quarter = str.slice(2, 3);
  // const day = str.slice(3); // optional if you want day info

  const yearFull = 2000 + parseInt(yearTwoDigits, 10);
  return `Q${quarter} ${yearFull}`;
}

async function fetchProjectData(userAddress: string): Promise<ProjectData[]> {
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_DEX_RPC_URL);

  const poolAbi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function viewSupply() view returns (uint256)",
    "function unlockQuarter() view returns (uint16)",
  ];

  const projectsConfig = [
    { name: "THE GLOBE", symbol: "GLB", termLength: 12, address: deployments.Globe, projectedValue: 100000000 },
    { name: "BG CLEAN REAL ESTATE (SELL)", symbol: "CREs", termLength: 4, address: deployments.BGSellRE, projectedValue: 5000000 },
    { name: "BG CLEAN REAL ESTATE (HOLD)", symbol: "CREh", termLength: 4, address: deployments.BGHoldRE, projectedValue: 5000000 },
    { name: "CLEAN GRID", symbol: "CGRi", termLength: 12, address: deployments.BGGrid, projectedValue: 10000000 },
    { name: "TRANS-GREENTECH REFINERY & DEPOT US", symbol: "TGUSA", termLength: 12, address: deployments.TGUsRenewable, projectedValue: 500000000 },
    { name: "TRANS-GREENTECH REFINERY & DEPOT MX", symbol: "TGMX", termLength: 12, address: deployments.TGMxRenewable, projectedValue: 500000000 },
  ];

  const projects: ProjectData[] = [];

  for (const proj of projectsConfig) {
    const contract = new ethers.Contract(proj.address, poolAbi, provider);

    const [balanceRaw, supplyRaw, nextQuarter] = await Promise.all([
      contract.balanceOf!(userAddress),
      contract.viewSupply!(),
      contract.unlockQuarter!(),
    ]);

    const balance = await normalizeValue(contract, balanceRaw);
    const currentValue = await normalizeValue(contract, supplyRaw);
    const nextQuarterNum = Number(nextQuarter);
    const nextQuarterStr = nextQuarterNum === 0 ? "Unavailable" : formatQuarterCode(nextQuarterNum);

    const userShare = Number(currentValue) > 0
    ? (Number(balance) / Number(currentValue)) * 100
    : 0;

    projects.push({
      name: proj.name,
      symbol: proj.symbol,
      currentValue: Number(currentValue) || 0,
      projectedValue: proj.projectedValue ?? 0,
      termLength: proj.termLength ?? 0,
      userShare: userShare ?? 0,
      nextDistribution: nextQuarterStr, // ensure string
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
    "function committedQuarters() view returns (uint16)" // include if it exists
  ];

  const smartVault = new ethers.Contract(deployments.SmartVault, smartVaultAbi, provider);
  const tokens = generateDividendTokens();

  let currentValue = 0n;
  try {
    currentValue = await smartVault.getRedemptionSupply();
  } catch {}

  // Batch all balanceOf calls in parallel
  const balanceCalls = tokens.map(token => {
    const tokenContract = new ethers.Contract(token.address, dividendTokenAbi, provider);
    return tokenContract.balanceOf(userAddress).then(raw => ({
      token,
      tokenContract,
      raw
    }));
  });

  const balances = await Promise.all(balanceCalls);

  // Find the first token with a non‑zero balance
  const held = balances.find(b => b.raw !== 0n);

  if (held) {
    const balance = await normalizeValue(held.tokenContract, held.raw);

    // Batch the other calls for that token
    const [multiplierRaw, nextQuarterRaw, committedQuartersRaw] = await Promise.all([
      smartVault.multiplier(held.token.address),
      held.tokenContract.unlockQuarter(),
      held.tokenContract.committedQuarters?.() // only if ABI has it
    ]);

    const multiplier = Number(multiplierRaw);
    const committedQuarters = committedQuartersRaw ? Number(committedQuartersRaw) : undefined;
    const nextQuarterNum = Number(nextQuarterRaw);
    const nextQuarterStr = nextQuarterNum === 0 ? "Unavailable" : formatQuarterCode(nextQuarterNum);

    const weightedBalance = Number(balance) * multiplier;
    const weightedSupply = 1 * multiplier;
    const userShare = weightedSupply > 0 ? (weightedBalance / weightedSupply) * 100 : 0;

    return {
      name: "SMART VAULT",
      symbol: "SVT",
      currentValue: Number(currentValue),
      projectedValue: 10000000,
      userShare,
      nextDistribution: nextQuarterStr,
      termLength: committedQuarters,
      userBalance: Number(balance),
    };
  }

  // No holdings
  return {
    name: "SMART VAULT",
    symbol: "SVT",
    currentValue: Number(currentValue),
    projectedValue: 10000000,
    userShare: 0,
    nextDistribution: "Unavailable",
    termLength: undefined,
    userBalance: 0,
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
    <div className="min-h-screen w-full bg-black text-white">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 p-4">
        
        {/* Row 1: Transactions + Balances */}
        <div className="lg:col-span-4 bg-white/5 rounded-lg p-4">
          <TransactionTabs />
        </div>
        <div className="lg:col-span-1 bg-white/5 rounded-lg p-4">
          <TokenBalancesPanel />
        </div>
      </div>
    </div>
  );
}