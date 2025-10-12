"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const lifecycleSteps = [
  { label: "Start Exchange", abi: "createSwap(stable, counterparty(address), tokenA, amountA, tokenB, amountB)" },
  { label: "Counterparty Deposit", abi: "joinSwap()" },
  { label: "Auto Confirm", abi: "_confirmSwap()" },
  { label: "Refund Option", abi: "refund()" }
];

export default function AssetXchangeTab() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-4 px-6 py-0 max-w-full mx-auto">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-light text-white"
      >
        ASSETXCHANGE
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-zinc-400 text-base leading-relaxed text-justify"
      >
        AssetXchange enables digital asset exchannging between users to include asset-backed ERC-20 tokens offered on this 
        platform and any ERC-20 token (requests may be made to add additional tradeable tokens). Users initiate a contract by
        defining terms and paying the platform fee of <span className="text-green-900 font-semibold">10GBDo</span>. Once the
        counterparty deposits, the swap is auto-confirmed. Refunds are available if the counterparty fails to deposit
        or the initiator cancels.
      </motion.p>


      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="bg-white/5 p-6 rounded-lg shadow-md space-y-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-white text-xl font-light">LIFECYCLE SEQUENCE</h2>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-zinc-300 hover:text-white transition"
          >
            {showDetails ? "Hide Details" : "Show Details"}
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {lifecycleSteps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.3, duration: 0.4 }}
              className="px-4 py-2 bg-white/10 rounded-md text-xs text-zinc-200 font-medium shadow-sm"
            >
              {step.label}
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-4 space-y-2"
            >
              {lifecycleSteps.map((step, i) =>
                step.abi ? (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.3 + 0.2, duration: 0.4 }}
                    className="bg-black/20 p-2 rounded text-green-900 text-xs font-mono shadow-inner"
                  >
                    {step.abi}
                  </motion.div>
                ) : null
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: lifecycleSteps.length * 0.3 + 0.6, duration: 0.5 }}
        className="bg-white/10 rounded-md p-6 text-zinc-300 text-sm text-justify leading-snug"
      >
        <h3 className="text-white text-lg font-light mb-2">PLAIN SUMMARY</h3>
        <p>
          Users launch an assetXchange contract with defined assets and amounts. Once both parties deposit, the
          contract auto-confirms and executes the exchange. If the counterparty fails to deposit or the initiator
          opts to eixt the contract, the user can submit a refund request and immediately retrieve their funds. 
          All logic is embedded and signaled at contract initiation. Contract addresses are unique, immutable, and 
          are generated once per request is always accessible for reference.
        </p>
      </motion.div>
    </div>
  );
}
