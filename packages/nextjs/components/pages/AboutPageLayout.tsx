"use client";

import React from "react";
import Link from "next/link";

export default function AboutLayout() {
  return (
    <main className="bg-black text-white font-sans">
      {/* Section 1: Hero */}
      <section className="h-[350px] flex flex-col items-center justify-center text-center relative">
        <h1 className="text-5xl font-light tracking-wide mb-4">
          ENERGY GENERATION REDEFINED
        </h1>
        <p className="text-gray-400 text-lg">
          Clean power meets decentralized ownership.
        </p>
        <div className="absolute bottom-6 animate-bounce">
          <svg
            className="w-6 h-6 text-secondary"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* Section 2: Company Overview */}
      <section className="bg-white/10 px-6 py-12 md:px-16">
        <div className="max-w-5xl mx-auto space-y-6">
          <h2 className="text-4xl font-light mb-4">THE ECOSYSTEM</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-justify text-gray-300 text-sm leading-relaxed">
            <p>
              An infrastructure designed for a new economy—where sustainable energy
              integrates with digital transparency, and ownership exists both on-chain
              and in the physical world. This marketplace pairs clean technologies with
              programmable smart contracts, offering a seamless way to participate in
              global solutions.
            </p>
            <p>
              Participants gain exposure to real-world assets while earning quarterly
              returns, transacting with low fees, and navigating a composable
              marketplace tailored to future-forward portfolios. The objective is to
              reduce barriers, amplify transparency, and allow anyone to contribute to
              and benefit from a distributed energy grid that grows beyond geography.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Product Spotlight */}
      <section
        className="relative bg-black px-6 py-12 md:px-16"
        style={{
          backgroundImage: "url('/logo.png')",
          backgroundAttachment: "fixed",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-black/50 z-0"></div>
        <div className="relative z-10 max-w-5xl mx-auto">
          <h2 className="text-2xl font-light mb-8 text-white">THE FLAGSHIP</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <SpotlightBlock
              title="Clean Generator"
              description="A high-efficiency, low-emission power generation system built to convert ambient heat into usable energy. Engineered for versatile deployment—from remote regions to urban microgrids—with autonomous operational modes and integrated sensors."
            />
            <SpotlightBlock
              title="Digital Ownership"
              description="Assets are tokenized for full transparency. Token holders can monitor usage metrics, stake assets for rewards, and participate in decentralized liquidity mechanisms. Ownership is programmable—allowing customizable terms and fractional participation."
            />
          </div>
          <div className="mt-10 grid place-items-center">
            <SpotlightBlock
              title="Access to Infrastructure Investment"
              description="Energy infrastructure investment is now accessible at scale. Through tokenized contracts, individuals can engage with real-world assets that generate tangible impact and yield. Blockchain ensures provenance, while smart logic automates performance."
              className="w-full sm:w-2/3"
            />
          </div>
        </div>
      </section>

      {/* Section 4: Blockchain Architecture */}
      <section className="bg-white/10 px-6 py-12 md:px-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-light mb-6">BLOCKCHAIN ARCHITECTURE</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-justify">
            <ArchitectureBlock
              title="Besu EVM Network"
              description="A production-grade Ethereum Virtual Machine built for modular scalability and reliable consensus. Designed for regulated environments and enterprise-grade deployment, Besu offers flexibility in permissioning and auditability."
              bg="bg-white/10"
              text="text-white"
            />
            <ArchitectureBlock
              title="Stablecoin Compatibility"
              description="The platform facilitates seamless integration with stable digital assets optimized for infrastructure-grade applications. Stablecoins enable low-volatility exchange, treasury operations, and programmable payments aligned with DeFi strategies."
              bg="bg-black"
              text="text-gray-400"
              tokens={[
                "USD", "AED", "AUD", "BRL", "CHF", "CNY", "DAI", "EUR", "FDUSD",
                "FRAX", "GBP", "GUSD", "INR", "JPY", "KRW", "MXN", "PYUSD", "SGD", "TUSD",
                "USDP", "USDT", "ZAR", "ZARP", "BRL1", "NGNT", "GBPT", "INRX", "TRYX"
              ]}
            />
          </div>
        </div>
      </section>

      {/* Section 5: Investment CTA */}
      <section className="bg-white/10 px-6 py-14 text-center">
        <h2 className="text-2xl font-light mb-4">Quarterly Returns. Zero-Fee Access.</h2>
        <p className="text-sm text-gray-400 max-w-2xl mx-auto mb-6">
          Invest with flexible term structures, purchase utility-grade assets with near-zero fees,
          and help shape the clean energy landscape of tomorrow. Explore our vision.
        </p>
        <Link
          href="/whitepaper"
          className="px-4 py-2 text-sm font-light text-white bg-white/20 hover:bg-white/30 transition rounded shadow-sm"
        >
          View The Whitepaper
        </Link>
      </section>
    </main>
  );
}

function SpotlightBlock({ title, description, className = "" }: { title: string; description: string; className?: string }) {
  return (
    <div className={`bg-white/10 p-6 rounded shadow hover:shadow-lg transition-all ${className}`}>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-300 text-justify leading-relaxed">{description}</p>
    </div>
  );
}

function ArchitectureBlock({
  title,
  description,
  bg,
  text,
  tokens,
}: {
  title: string;
  description: string;
  bg: string;
  text: string;
  tokens?: string[];
}) {
  return (
    <div className={`${bg} p-5 rounded-md`}>
      <h3 className={`text-lg ${text} mb-2`}>{title}</h3>
      <p className={`text-sm ${text} leading-relaxed mb-4`}>{description}</p>
      {tokens && (
        <>
          <h4 className="text-lg text-white mb-2 mt-10 font-light">Supported Tokens</h4>
          <div className="grid grid-cols-8 gap-x-4 gap-y-2 text-secondary text-xs font-medium tracking-wide">
            {tokens.map((token) => (
              <span key={token}>{token}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
