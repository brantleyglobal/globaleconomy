"use client";

import { ethers } from "ethers";
import React, { useState, useEffect  } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Bars3Icon, XMarkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import deployments from "~~/lib/contracts/deployments.json";
import crypto from "crypto-js";

interface DeploymentArtifact {
  address: string;
  abi: any[];
  bytecode?: string;
}

type ContractName = keyof typeof contracts;

const contracts = {
  AcquisitionGateway: deployments.AcquisitionGateway,
  GlobalSwap: deployments.GlobalSwap,
  GlobalSwapFactory: deployments.GlobalSwapFactory,
  AssetPurchase: deployments.AssetPurchase,
  SmartVault: deployments.SmartVault,
  RegionInfrastructure: deployments.RegionInfrastructure,
};

const contractTabs = [
  { id: "AcquisitionGateway", label: "GLOBAL DOLLAR ACQUISITION" },
  { id: "AssetPurchase", label: "ASSET PURCHASE" },
  { id: "SmartVault", label: "SMART VAULT" },
  { id: "RegionInfrastructure", label: "REGION DEVELOPMENT" },
  { id: "GlobalSwap", label: "ASSET XCHANGE" },
  { id: "GlobalSwapFactory", label: "ASSET XCHANGE FACTORY" },
];


// Curated user-facing functions per contract
const userFunctions: Record<string, string[]> = {
  GlobalSwap: [
    "deposit()",
    "refund()",
    "partyA()",
    "partyB()",
    "tokenA()",
    "tokenB()",
    "amountA()",
    "amountB()",
    "partyADeposited()",
    "partyBDeposited()",
    "completed()",
  ],
  GlobalSwapFactory: ["createSwap(address stable, address partyA, address partyB, address tokenA, uint256 amountA, address tokenB, uint256 amountB)"],
  AssetPurchase: [
    "purchase(address buyer, address stable, uint32 productId, uint256 amount, uint32 quantity, uint256 rate, uint8 region) **Admin Only**",
    "getPurchasesInRange(uint256 startTs, uint256 endTs)",
  ],
  AcquisitionGateway: [
    "acquisition(address user, address token, uint256 amountin, uint256 amountout, uint256 rate, bytes32 depositHash) **Admin Only**",
    "liquidate (address payoutToken, uint256 amount, uint256 timeStamp)",
    "getPurchasesInRange(uint256 startTs, uint256 endTs) **Admin Only**"
  ],
  SmartVault: [
    "deposit(address user, address token, uint256 amount, uint8 committedQuarters, uint16 injectedTime, uint256 rate, bytes32 depositHash) **Admin Only**",
    "(address dividendToken, uint256 _holderBalance)",
    "withdraw(address dividendToken, uint256 holderBalance)",
    "changePayoutToken(address newToken)",
    "changePayoutAddress(address newUser)",
    "autoPay()",
    "getWithdrawInRange(uint256 startTs, uint256 endTs) **Admin Only**",
    "getDepositsInRange(uint256 startTs, uint256 endTs) **Admin Only**",
  ],
  RegionInfrastructure: [
    "deposit(address user, address token, address venture, uint256 amount, uint16 injectedTime, uint256 rate, bytes32 depositHash) **Admin Only**",
    "(address dividendToken, uint256 _holderBalance)",
    "withdraw(address dividendToken, uint256 holderBalance)",
    "changePayoutToken(address newToken)",
    "changePayoutAddress(address newUser)",
    "autoPay()",
    "getWithdrawInRange(uint256 startTs, uint256 endTs) **Admin Only**",
    "getDepositsInRange(uint256 startTs, uint256 endTs) **Admin Only**",
  ],
};

export default function VerificationLayout() {
  const [activeContract, setActiveContract] = useState<ContractName>(
    Object.keys(contracts)[0] as ContractName
  );

  const [mobileOpen, setMobileOpen] = useState(false);
  const [abiData, setAbiData] = useState<Record<string, any>>({});

  const provider = new ethers.JsonRpcProvider("https://rpc.brantley-global.com");

  const CurrentContract: ContractName = activeContract;
  const address = contracts[CurrentContract];
  const currentTab = contractTabs.find(tab => tab.id === activeContract);
  const currentLabel = currentTab?.label || activeContract;

  useEffect(() => {
    const loadArtifact = async () => {
      try {
        const res = await fetch(`/abi/${CurrentContract}.json`);
        if (!res.ok) {
          throw new Error(`Failed to load artifact: ${res.status}`);
        }
        const artifact = await res.json();
        setAbiData(prev => ({
          ...prev,
          [CurrentContract]: {
            ...(prev[CurrentContract] || {}),
            abi: artifact.abi,
            compiledBytecode: artifact.deployedBytecode, // <-- only runtime code
            abiHash: crypto.SHA256(JSON.stringify(artifact.abi)).toString(),
          },
        }));
      } catch (err) {
        console.error("Failed to load artifact:", err);
      }
    };
    loadArtifact();
  }, [CurrentContract]);

  async function getImplementationCode(provider: ethers.JsonRpcProvider, proxyAddress: string) {
    // EIP‑1967 implementation slot
    const implSlot =
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

    // Read raw storage value at that slot
    const raw = await provider.getStorage(proxyAddress, implSlot);

    // Last 20 bytes = implementation address
    const implAddress = ethers.getAddress("0x" + raw.slice(26));

    // Fetch runtime code at implementation
    const implCode = await provider.getCode(implAddress);

    return { implAddress, implCode };
  }


  return (
    <div className="relative bg-black w-full text-white min-h-screen">
      {/* Mobile Navigation Drawer */}
      <button onClick={() => setMobileOpen(true)} className="md:hidden p-4">
        <Bars3Icon className="w-6 h-6 text-white" />
      </button>
      {mobileOpen && (
        <aside className="fixed z-50 top-0 right-0 h-screen w-64 bg-zinc-900 shadow-lg px-4 py-6">
          <button onClick={() => setMobileOpen(false)} className="mb-4 text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
          {contractTabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setActiveContract(label as ContractName); setMobileOpen(false); }}
              className="block text-sm text-zinc-300 mb-1"
            >
              {label}
            </button>
          ))}
        </aside>
      )}

      {/* Sidebar Navigation */}
      <div className="hidden md:block fixed left-0 top-20 bottom-20 w-70 h-full bg-zinc-950 p-2 border-r border-zinc-800">
        <h2 className="mb-6 text-lg font-light tracking-wide">CONTRACT VERIFICATION</h2>
        {contractTabs.map(({ id, label }) => (
          <div key={id} className="relative mb-3">
            <button
              onClick={() => setActiveContract(id as ContractName)}
              className={clsx(
                "text-sm px-2 py-1 block w-full text-left rounded-md transition-colors",
                activeContract === id
                  ? "text-white font-bold bg-zinc-800"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {label}
            </button>
          </div>
        ))}
      </div>

      {/* Contract Content */}
      <main className="ml-0 md:ml-70 px-4 py-6 transition-all">
        <motion.div
          key={activeContract}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-light text-primary">{currentLabel}</h2>
          <p className="text-xs font-mono text-gray-400">CONTRACT ADDRESS: {address}</p>

          {/* Info */}
          <section className="bg-white/5 rounded-lg p-4 hover:ring-1 hover:ring-secondary transition">
            <h3 className="text-white text-xl font-light mb-2">INFO</h3>
            <p className="text-sm text-gray-300 mb-2">
              Verify manually with <code className="text-zinc-200">eth_getCode</code>:
            </p>
              <pre className="bg-black/70 p-3 text-xs rounded-md overflow-x-auto">
{`curl -X POST http://rpc.brantley-global.com:8545 \\
-H "Content-Type: application/json" \\
--data '{"jsonrpc":"2.0","method":"eth_getCode","params":["${address}","latest"],"id":1}'`}
            </pre>
          </section>

          {/* Verification */}
          <section className="bg-white/5 rounded-lg p-4 hover:ring-1 hover:ring-secondary transition">
            <h3 className="text-white text-xl font-light mb-2">VERIFICATION</h3>

            {/* Fetch on-chain bytecode */}
            <div className="mb-4">
              <button
                onClick={async () => {
                  try {
                    const compiled = abiData[CurrentContract]?.compiledBytecode;
                    let matchStatus = "Not verified yet";

                    if (CurrentContract === "GlobalSwap" || CurrentContract === "GlobalSwapFactory") {
                      // Non‑proxy contracts
                      const code = await provider.getCode(address);
                      if (compiled) {
                        matchStatus = code === compiled ? "MATCH" : "MISMATCH";
                      }
                      setAbiData(prev => ({
                        ...prev,
                        [CurrentContract]: {
                          ...(prev[CurrentContract] || {}),
                          onChainBytecode: code,
                          matchStatus,
                        },
                      }));
                    } else {
                      // Proxy contracts
                      const proxyCode = await provider.getCode(address);
                      const { implAddress, implCode } = await getImplementationCode(provider, address);
                      if (compiled) {
                        matchStatus = implCode === compiled ? "MATCH" : "MISMATCH";
                      }
                      setAbiData(prev => ({
                        ...prev,
                        [CurrentContract]: {
                          ...(prev[CurrentContract] || {}),
                          proxyBytecode: proxyCode,
                          implementationAddress: implAddress,
                          onChainBytecode: implCode,
                          matchStatus,
                        },
                      }));
                    }
                  } catch (err) {
                    console.error("Failed to fetch bytecode:", err);
                  }
                }}
                className="px-3 py-1 mt-2 mb-2 text-sm rounded-md bg-white/10 hover:bg-white/20 transition-colors text-zinc-200">
                Fetch On-chain Bytecode
              </button>
                <pre className="bg-black/70 p-3 text-xs rounded-md overflow-x-auto mt-2">
                {abiData[CurrentContract]?.onChainBytecode || "No bytecode fetched yet"}
              </pre>
            </div>

            {/* Compiled bytecode from artifact */}
            <div className="mb-4">
              <h4 className="text-white text-xl font-light mb-2">COMPILED BYTECODE (ARTIFACT)</h4>
                <pre className="bg-black/70 p-3 text-xs rounded-md overflow-x-auto">
                {abiData[CurrentContract]?.compiledBytecode || "No compiled bytecode loaded"}
              </pre>
            </div>

            {/* ABI JSON (expandable) */}
            <div className="mb-4">
              <h4 className="text-white text-xl font-light mb-2">ABI</h4>
              {abiData[CurrentContract]?.abi ? (
                <div>
                  <pre
                    className={clsx(
                      "bg-black/70 p-3 text-xs rounded-md overflow-x-auto",
                      abiData[CurrentContract]?.expanded
                        ? "max-h-[600px] overflow-y-auto"
                        : "max-h-64 overflow-y-auto"
                    )}
                  >
                    {JSON.stringify(abiData[CurrentContract].abi, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Loading artifact...</p>
              )}
            </div>

            {/* ABI Hash */}
            <div>
              <h4 className="text-white text-xl font-light mb-2">ABI HASH (SHA-256)</h4>
              <pre className="bg-black/70 p-3 text-xs rounded-md overflow-x-auto">
                {abiData[CurrentContract]?.abiHash || "No hash computed yet"}
              </pre>
            </div>
          </section>
          {/* Functions */}
          <section className="bg-white/5 rounded-lg p-4 hover:ring-1 hover:ring-secondary transition">
            <h3 className="text-white text-xl font-light mb-2">USER FUNCTIONS</h3>
            <div className="bg-black/70 p-3 rounded-md text-xs">
              <pre>{userFunctions[CurrentContract]?.join("\n\n")}</pre>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}