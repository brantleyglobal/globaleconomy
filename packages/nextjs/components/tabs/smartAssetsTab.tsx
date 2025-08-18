"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

type LifecycleStep = {
  label: string;
  abi?: string;
};

type SmartAsset = {
  id: string;
  title: string;
  description: string;
  lifecycle: LifecycleStep[];
  summary: string;
};

const smartAssets: SmartAsset[] = [
  {
    id: "acquisition",
    title: "CURRENCY ACQUISITION",
    description:
      "User acquisition flow enables on-ramp token access for staking, transaction, and ecosystem activation.",
    lifecycle: [
      { label: "Initiate Purchase", abi: "buyNativeToken(paymentMethod, amount)" },
      { label: "Allocate Wallet", abi: "allocateToWallet(user, amount)" },
      { label: "Token Ready", abi: "grantMintAllowance(user)" }
    ],
    summary:
      "Users purchase ecosystem currency through on-ramp integrations. Minting allowances are granted once verified."
  },
  {
    id: "finite-participation",
    title: "COMPANY INVESTMENT – Quarter Based Participation",
    description:
      "Lock periods drive multiplier-based quarterly payouts with capped redemption logic.",
    lifecycle: [
      { label: "Commit Quarters", abi: "deposit(amount, committedQuarters)" },
      { label: "Eligibility Check" },
      { label: "Multiplier Applied" },
      { label: "Profit Locked", abi: "addProfit(amount)" },
      { label: "Distribute", abi: "distribute(profitAmount)" }
    ],
    summary:
      "Investors commit funds for a defined period and receive elevated returns based on profit performance. Logic enforces lock rules and payout thresholds."
  },
  {
    id: "real-estate",
    title: "REAL ESTATE PROJECT – Term-Bound Investment",
    description:
      "Phase-driven activation and milestone-based returns structured within fixed terms.",
    lifecycle: [
      { label: "Review Terms" },
      { label: "Activate Milestone", abi: "lockRealEstateAsset(assetId, term)" },
      { label: "Execute Phase" },
      { label: "Distribute Yield", abi: "claimYield(assetId)" },
      { label: "Terminate Asset", abi: "releaseAsset(assetId)" }
    ],
    summary:
      "Partners activate phases across a real estate timeline. Payouts are earned on completion and assets conclude automatically at term end."
  },
  {
    id: "esg-purchase",
    title: "PRODUCT PURCHASE – ESG-Linked Incentive Model",
    description:
      "SKU-specific emissions tracking enables carbon reward incentives tied to consumer purchases.",
    lifecycle: [
      { label: "Register Product SKU", abi: "registerSKU(skuId, metadata)" },
      { label: "Attach Purchase", abi: "attachPurchase(user, skuId)" },
      { label: "Verify Emission Claim", abi: "verifyEmission(skuId)" },
      { label: "Compute Offset", abi: "computeOffsetReward(user)" },
      { label: "Claim Incentive", abi: "claimIncentive(user)" }
    ],
    summary:
      "Consumers earn ESG rewards when purchasing low-emission SKUs. Each step verifies impact and delivers transparent carbon offsets."
  }
];

export default function SmartAssetsTab() {
  const [activeAsset, setActiveAsset] = useState<string | null>(null);
  const [scrollAsset, setScrollAsset] = useState<string>("acquisition");

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("id");
            if (id) setScrollAsset(id);
          }
        });
      },
      { threshold: 0.6 }
    );

    smartAssets.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative space-y-4 mx-4">
      <h1 className="text-3xl font-light">SMART ASSETS</h1>
      {/* Sticky Mini Tabs */}
      <nav className="sticky top-0 z-30 bg-black border-b border-zinc-800 px-4 py-0 flex gap-4 overflow-x-auto">
        {smartAssets.map(({ id, title }) => (
          <a
            key={id}
            href={`#${id}`}
            className={clsx(
              "text-sm font-medium whitespace-nowrap transition-colors",
              scrollAsset === id ? "text-white font-bold" : "text-zinc-400 hover:text-white"
            )}
          >
            {title.split("–")[0].trim()}
          </a>
        ))}
      </nav>

      {/* Section Tiles */}
      <div className="flex flex-col space-y-10">
        {smartAssets.map((asset, index) => {
          const isActive = activeAsset === asset.id;
          const tileDelay = 0.4;

          return (
            <section key={index} id={asset.id} className="scroll-mt-32">
              <motion.div
                onClick={() => setActiveAsset(isActive ? null : asset.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.3 }}
                className="bg-white/5 p-6 rounded-lg cursor-pointer hover:ring-1 hover:ring-secondary transition"
              >
                <div className="space-y-2">
                  <h3 className="text-white text-xl font-light">{asset.title}</h3>
                  <p className="text-zinc-400 text-sm">{asset.description}</p>
                </div>

                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                      {/* Column 1: Lifecycle */}
                      <div>
                        <h4 className="text-white text-sm font-semibold mb-2">LIFECYCLE SEQUENCE</h4>
                        <div className="flex flex-wrap gap-3">
                          {asset.lifecycle.map((step, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.6 + tileDelay, duration: 0.4 }}
                              className="px-4 py-2 bg-white/10 rounded-md text-xs text-zinc-200 font-medium shadow-sm"
                            >
                              {step.label}
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Column 2: ABI */}
                      <div>
                        <h4 className="text-white text-sm font-semibold mb-2">CONTRACT FUNCTION SUMMARY</h4>
                        <div className="space-y-2">
                          {asset.lifecycle.map((step, i) =>
                            step.abi ? (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.6 + tileDelay + 0.3, duration: 0.4 }}
                                className="bg-black/20 p-2 rounded text-green-300 text-xs font-mono shadow-inner"
                              >
                                {step.abi}
                              </motion.div>
                            ) : null
                          )}
                        </div>
                      </div>

                      {/* Column 3: Summary */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: asset.lifecycle.length * 0.6 + tileDelay + 0.6,
                          duration: 0.5
                        }}
                      >
                        <h4 className="text-white text-sm font-semibold mb-2">PLAIN SUMMARY</h4>
                        <div className="bg-white/10 rounded-md p-4 text-zinc-300 text-sm leading-snug">
                          {asset.summary}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
