"use client";

import React, { useEffect, useState } from "react";
import { useTargetNetwork } from "~~/hooks/globalEco/useTargetNetwork";
import { useGlobalState } from "~~/services/store/store";
import { getExchangeRates, StablecoinRate } from "~~/lib/exchangeRates";
import { supportedTokens } from "~~/components/constants/tokens";

export const Footer = () => {
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const { targetNetwork } = useTargetNetwork();

  const [gbdoRates, setGbdoRates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        const { rates } = await getExchangeRates();

        const rateMap = new Map<string, StablecoinRate>();
        rates.forEach(rate => rateMap.set(rate.symbol, rate));

        const formattedRates = supportedTokens
          .filter(token => token.symbol !== "GBDO")
          .map(token => {
            const rateObj = rateMap.get(token.symbol);
            if (!rateObj || rateObj.rateAgainstGBDO === undefined) return undefined;
            return `GBDO : ${rateObj.rateAgainstGBDO.toFixed(4)} ${token.symbol}`;
          })
          .filter((rate): rate is string => typeof rate === "string");

        setGbdoRates(formattedRates);
      } catch (error) {
        console.error("Error fetching exchange rates:", error);
        setGbdoRates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  return (
    <footer className="w-full z-50 bg-black text-sm text-base-content border-t border-base-300">
      {/* GBDO Rate Banner */}
      <div className="overflow-hidden bg-base-200 border-t border-base-300">
        <div className="animate-scroll-track whitespace-nowrap inline-flex px-4 py-2 text-sm sm:text-base">
          {[...gbdoRates, ...gbdoRates].map((rate, idx) => (
            <span key={idx} className="mr-10 text-base-content">
              {rate}
            </span>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div className="bg-secondary text-neutral-content text-center text-xs py-2 px-2">
        © {new Date().getFullYear()} BG Company. All rights reserved.
      </div>

      {/* Scrolling Animation */}
      <style jsx>{`
        @keyframes scrollRates {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll-track {
          display: inline-flex;
          animation: scrollRates 100s linear infinite;
        }

        @media (max-width: 600px) {
          .animate-scroll-track {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </footer>
  );
};
