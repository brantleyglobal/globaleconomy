// components/WhitepaperLayout.tsx
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";

const tabData = [
  {
    id: "ecosystem",
    title: "ECOSYSTEM",
    component: dynamic(() => import("~~/components/tabs/ecoSystemTab"), { ssr: false }),
  },
  {
    id: "smartAssets",
    title: "SMART ASSETS",
    component: dynamic(() => import("~~/components/tabs/smartAssetsTab"), { ssr: false }),
  },
  {
    id: "dividends",
    title: "DIVIDENDS",
    component: dynamic(() => import("~~/components/tabs/dividendsTab"), { ssr: false }),
  },
  {
    id: "governance",
    title: "GOVERNANCE",
    component: dynamic(() => import("~~/components/tabs/governanceTab"), { ssr: false }),
  },
  {
    id: "architecture",
    title: "ARCHITECTURE",
    component: dynamic(() => import("~~/components/tabs/architectureTab"), { ssr: false }),
  },
  {
    id: "currency",
    title: "CURRENCY RATES",
    component: dynamic(() => import("~~/components/tabs/currencyTab"), { ssr: false }),
  },
];

export default function WhitepaperLayout() {
  const [activeTab, setActiveTab] = useState(tabData[0].id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const CurrentTab = tabData.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="relative bg-black text-white min-h-screen">
      {/* Mobile Navigation Drawer */}
      <button onClick={() => setMobileOpen(true)} className="md:hidden p-4">
        <Bars3Icon className="w-6 h-6 text-white" />
      </button>
      {mobileOpen && (
        <aside className="fixed z-50 top-0 right-0 h-screen w-64 bg-zinc-900 shadow-lg px-4 py-6">
          <button onClick={() => setMobileOpen(false)} className="mb-4 text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
          {tabData.map(({ id, title }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setMobileOpen(false); }}
              className="block text-sm text-zinc-300 mb-1"
            >
              {title}
            </button>
          ))}
        </aside>
      )}

      {/* Sidebar Navigation */}
      <div className="hidden md:block fixed left-0 top-20 bottom-20 w-56 h-full bg-zinc-950 p-2 border-r border-zinc-800">
        <h2 className="mb-6 text-lg font-light tracking-wide">WHITEPAPER</h2>
        {tabData.map(({ id, title }) => (
          <div key={id} className="relative mb-3">
            <button
              onClick={() => setActiveTab(id)}
              className={clsx(
                "text-sm px-2 py-1 block w-full text-left rounded-md transition-colors",
                activeTab === id
                  ? "text-white font-bold bg-zinc-800"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {title}
            </button>
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <main className="ml-0 md:ml-56 px-1 py-4 transition-all">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          {CurrentTab && React.createElement(CurrentTab)}
        </motion.div>
      </main>
    </div>
  );
}
