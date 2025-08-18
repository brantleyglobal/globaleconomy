"use client";

import React from "react";

const redstoneFeeds: Record<string, string> = {
  USDC: "USDC", USDT: "USDT", DAI: "DAI", TUSD: "TUSD", FDUSD: "FDUSD", FRAX: "FRAX",
  PYUSD: "PYUSD", USDP: "USDP", EURC: "EUR", EURe: "EURe", GBPT: "GBP",
  ARSX: "ARS", INRX: "INR", TRYX: "TRY", NGNT: "NGN", ZARP: "ZAR", BRL1: "BRL",
  AUDT: "AUD", AUDD: "AUD", JPYC: "JPY", MMXN: "MXN", QCAD: "CAD", XCHF: "CHF",
  XSGD: "SGD", GUSD: "GUSD"
};

const rateGuards: Record<string, { min: number; max: number; fallback?: number }> = {
  USDC: { min: 0.98, max: 1.02, fallback: 1.00 }, USDT: { min: 0.98, max: 1.02, fallback: 1.00 },
  DAI: { min: 0.98, max: 1.02, fallback: 1.00 }, TUSD: { min: 0.98, max: 1.02, fallback: 1.00 },
  USDP: { min: 0.98, max: 1.02, fallback: 1.00 }, GUSD: { min: 0.98, max: 1.02, fallback: 1.00 },
  FDUSD: { min: 0.98, max: 1.02, fallback: 1.00 }, FRAX: { min: 0.97, max: 1.03, fallback: 1.00 },
  PYUSD: { min: 0.98, max: 1.02, fallback: 1.00 }, JPYC: { min: 0.0065, max: 0.0073 },
  EURC: { min: 1.08, max: 1.12 }, EURe: { min: 1.08, max: 1.12 }, GBPT: { min: 1.20, max: 1.30 },
  AUDT: { min: 0.65, max: 0.69 }, AUDD: { min: 0.65, max: 0.69 }, QCAD: { min: 0.72, max: 0.76 },
  XCHF: { min: 1.10, max: 1.14 }, ZARP: { min: 0.054, max: 0.064 }, BRL1: { min: 0.19, max: 0.21 },
  MMXN: { min: 0.058, max: 0.062 }, NGNT: { min: 0.00063, max: 0.00068 }, INRX: { min: 0.0118, max: 0.0124 },
  TRYX: { min: 0.030, max: 0.033 }, XSGD: { min: 0.74, max: 0.76 }
};

const primeFactor = 1.6;

const tokenRates = Object.keys(redstoneFeeds).map((token) => {
  const guard = rateGuards[token];
  const rawRate = 1.00; // default placeholder
  const guardedRate =
    guard && (rawRate < guard.min || rawRate > guard.max)
      ? guard.fallback ?? rawRate
      : rawRate;
  const scaledRate = guardedRate * primeFactor;
  const rateAgainstGBDO = scaledRate / primeFactor;
  const guardTriggered = rawRate !== guardedRate;
  const feedHealth = ""; // placeholder for future validation logic
  const network = "Ethereum";
  const updated = new Date().toISOString().slice(0, 16).replace("T", " UTC ");

  return {
    token,
    rawRate,
    guardedRate,
    scaledRate,
    rateAgainstGBDO,
    primeFactor,
    guardTriggered,
    feedHealth,
    network,
    updated,
  };
});

export default function CurrencyRatesTab() {
  return (
    <div className="space-y-10 mx-4 bg-base-200 text-base-content">
      {/* Overview */}
      <section className="space-y-2">
        <h1 className="text-3xl font-light">CURRENCY RATE SYSTEM</h1>
        <p className="text-sm leading-relaxed max-w-3xl">
          Rates are normalized to GBDO as a base unit of stability. Each token’s rate is calculated 
          using raw market data, adjusted via guards to mitigate volatility, and scaled by a PRIME_FACTOR 
          to ensure parity within price-weighted systems. Guard triggers automatically stabilize tokens 
          when feed anomalies or slippage thresholds are breached.
        </p>
      </section>

      {/* Rate Table */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Current Rate Snapshot</h2>
        <div className="overflow-x-auto rounded-box shadow">
          <table className="table table-zebra w-full text-sm bg-base-100">
            <thead className="bg-base-300 text-base-content">
              <tr>
                <th className="px-4 py-2">Token</th>
                <th className="px-4 py-2">Raw</th>
                <th className="px-4 py-2">Guarded</th>
                <th className="px-4 py-2">Scaled</th>
                <th className="px-4 py-2">vs GBDO</th>
                <th className="px-4 py-2">PRIME_FACTOR</th>
                <th className="px-4 py-2">Guard Triggered</th>
                <th className="px-4 py-2">Feed Health</th>
                <th className="px-4 py-2">Network</th>
                <th className="px-4 py-2">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {tokenRates.map((t, idx) => (
                <tr key={idx} className="hover:bg-base-300">
                  <td className="px-4 py-2 font-mono">{t.token}</td>
                  <td className="px-4 py-2">{t.rawRate}</td>
                  <td className="px-4 py-2">{t.guardedRate}</td>
                  <td className="px-4 py-2">{t.scaledRate}</td>
                  <td className="px-4 py-2">{t.rateAgainstGBDO}</td>
                  <td className="px-4 py-2">{t.primeFactor}</td>
                  <td className="px-4 py-2">{t.guardTriggered ? "Yes" : "No"}</td>
                  <td className="px-4 py-2">{t.feedHealth}</td>
                  <td className="px-4 py-2">{t.network}</td>
                  <td className="px-4 py-2">{t.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Guarding Logic */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Rate Guarding Logic</h2>
        <p className="text-sm text-base-content/80 max-w-3xl">
          Guarded rates are applied when feeds are delayed, deviate beyond tolerance, or present 
          potential manipulation. PRIME_FACTOR scaling ensures consistent representation across volatile markets. 
          Guard triggers can override raw rates to maintain protocol stability.
        </p>
      </section>
    </div>
  );
}
