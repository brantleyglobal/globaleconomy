// TokenBalancesPanel.tsx
"use client";
import React from "react";
import { useAccount } from "wagmi";
import { useTokenBalances } from "~~/hooks/globalDEX/useTokenBalances";

export function TokenBalancesPanel() {
  const { address, isConnected } = useAccount();
  const { coins } = useTokenBalances(address);

  return (
    <div className="col-span-1">
      <h2 className="text-xl font-light mb-4">BALANCES</h2>
      <div className="col-span-1 p-4 bg-base-100">
        <ul className="space-y-3">
          {coins.map(coin => (
            <li key={coin.symbol} className="flex justify-between">
              <span>{coin.symbol}</span>
              <span>{coin.balance}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
