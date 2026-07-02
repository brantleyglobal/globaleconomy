"use client";

import React, { useState } from "react";

interface OSTarget {
  os: string;
  size: string;
  url: string;
}

interface ResourceItem {
  title: string;
  description: string;
  fileType: string;
  downloadUrl?: string;
  osTargets?: OSTarget[];
}

interface ResourceCategory {
  id: string;
  label: string;
  items: ResourceItem[];
}

// The four initial pillars of your resources tab with your active GitHub release variants
const STARTING_RESOURCES: ResourceCategory[] = [
  {
    id: "legal",
    label: "Legal & Frameworks",
    items: [
      {
        title: "Terms & Conditions",
        description: "The primary legal agreement governing platform interaction, digital asset handling, fractional infrastructure custody, and user obligations within the ecosystem.",
        fileType: "PDF",
        downloadUrl: "/legal/Terms-Conditions.pdf",
      },
      {
        title: "Privacy Policy",
        description: "Detailed disclosure regarding on-chain public data mapping, off-chain identity encryption, telemetry data management, and data protection compliance protocols.",
        fileType: "PDF",
        downloadUrl: "/legal/Privacy-Policy.pdf",
      },
      {
        title: "Refund Policy",
        description: "Refund and Return policy regarding on-chain public data mapping, off-chain identity encryption, telemetry data management, and data protection compliance protocols.",
        fileType: "PDF",
        downloadUrl: "/legal/Refunds-Returns.pdf",
      },
    ],
  },
  {
    id: "investment",
    label: "Investment Governance",
    items: [
      {
        title: "Investment Policy Statement",
        description: "Official documentation covering tradeable, redeemable asset-backed token mechanics, revenue distribution structures, compliance overhead, and quarterly return governance.",
        fileType: "PDF",
        downloadUrl: "/legal/Investor-Overview.pdf",
      },
    ],
  },
  {
    id: "software",
    label: "Ecosystem Software",
    items: [
      {
        title: "Platform Node & Gateway client",
        description: "Production-ready binary for secure interaction with our Besu EVM Network. Includes local RPC configurations and secure wallet connectivity modules.",
        fileType: "Release v1.0.0",
        // ◄ Removed top-level fileSize
        osTargets: [
          { os: "macOS", size: "52.4 MB", url: "https://github.com/brantleyglobal/globalsync-partner/releases/download/v1.0.0/GlobalSync-1.0.0-arm64.dmg" },
          { os: "Windows", size: "45.1 MB", url: "https://github.com/brantleyglobal/globalsync-partner/releases/download/v1.0.0/GlobalSync-Setup-1.0.0.exe" },
          { os: "Linux", size: "38.7 MB", url: "https://github.com/brantleyglobal/globalsync-partner/releases/download/v1.0.0/GlobalSync_1.0.0_amd64.deb" },
          { os: "RHEL / Fedora", size: "39.2 MB", url: "https://github.com/brantleyglobal/globalsync-partner/releases/download/v1.0.0/GlobalSync-1.0.0.x86_64.rpm" }
        ]
      },
    ],
  },
];

export default function DownloadsLayout() {
  const [activeTab, setActiveTab] = useState("all");

  const filteredResources = activeTab === "all" 
    ? STARTING_RESOURCES 
    : STARTING_RESOURCES.filter(cat => cat.id === activeTab);

  return (
    <main className="bg-black w-full text-white font-sans min-h-screen">
      {/* Section 1: Minimal Hero */}
      <section className="h-[300px] flex flex-col items-center justify-center text-center relative border-b border-white/5">
        <h1 className="text-2xl sm:text-4xl font-light tracking-wide mb-4 text-primary uppercase">
          RESOURCES & DOWNLOADS
        </h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-xl px-6 leading-relaxed font-light">
          Access the foundational legal structures, investment rules, and network software powering the distributed energy grid.
        </p>
      </section>

      {/* Section 2: Filter & File Matrix */}
      <section className="bg-gradient-to-b from-black via-white/5 to-black px-6 py-12 md:px-16">
        <div className="max-w-5xl mx-auto">
          
          {/* Tabs Navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-12 border-b border-white/10 pb-6">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 text-xs uppercase tracking-wider transition rounded-md font-light ${
                activeTab === "all" ? "bg-white text-black font-normal" : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              All Resources
            </button>
            {STARTING_RESOURCES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-4 py-2 text-xs uppercase tracking-wider transition rounded-md font-light ${
                  activeTab === cat.id ? "bg-white text-black font-normal" : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Core Content Layout */}
          <div className="space-y-16">
            {filteredResources.map((category) => (
              <div key={category.id} className="space-y-6">
                <h2 className="text-xl font-light tracking-wide text-gray-300 border-l-2 border-secondary pl-3 uppercase">
                  {category.label}
                </h2>
                
                {/* Maintained your preferred original 2-column grid layout here */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {category.items.map((item, idx) => (
                    /* Passing via spread operator resolves the union type compilation mismatch error safely */
                    <DownloadCard key={idx} {...item} />
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Section 3: Bottom Footnote Context */}
      <section className="bg-black px-6 py-16 md:px-16 text-center border-t border-white/5">
        <div className="max-w-2xl mx-auto space-y-4">
          <h3 className="text-lg font-light tracking-wide text-gray-200">Regulatory & Verification Updates</h3>
          <p className="text-xs text-gray-400 leading-relaxed text-justify sm:text-center font-light">
            These documents are subject to periodic updates alongside changes to international real-world asset security laws and physical electrical infrastructure rollouts. Version controls and hash tracking are pinned directly on-chain via the Besu network dashboard for complete auditability.
          </p>
        </div>
      </section>
    </main>
  );
}

function DownloadCard({ title, description, fileType, downloadUrl, osTargets }: ResourceItem) {
  return (
    <div className="bg-white/10 p-6 rounded shadow border border-white/5 hover:border-white/20 transition-all flex flex-col justify-between group">
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-base font-medium text-white group-hover:text-primary transition-colors">
            {title}
          </h3>
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300 tracking-wider font-mono shrink-0">
            {fileType}
          </span>
        </div>
        <p className="text-xs text-gray-400 text-justify leading-relaxed font-light">
          {description}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
        
        {osTargets ? (
          <div className="flex flex-wrap gap-2">
            {osTargets.map((target, idx) => (
              <a
                key={idx}
                href={target.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 text-[11px] font-light text-white bg-white/5 border border-white/10 hover:border-secondary hover:text-secondary transition-all rounded font-mono"
              >
                {target.os}
              </a>
            ))}
          </div>
        ) : (
          <a
            href={downloadUrl}
            download
            className="flex items-center gap-2 text-xs font-light text-primary hover:text-white transition-colors"
          >
            <span>Download</span>
            <svg
              className="w-4 h-4 transform group-hover:translate-y-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}