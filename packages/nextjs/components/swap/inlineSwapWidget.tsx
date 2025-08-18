"use client";

import {
  Address as AddressType,
  getContract,
  parseUnits,
} from "viem";
import {
  Address,
  AddressInput,
  EtherInput,
} from "~~/components/globalEco";
import React, { useEffect, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { parseEther, createPublicClient, http } from "viem";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { supportedTokens } from "~~/components/constants/tokens";
import { RainbowKitCustomConnectButton } from "~~/components/globalEco";
import { erc20Abi } from "viem";
import { getExchangeRates } from "~~/lib/exchangeRates";
import { useSwapHandler } from "~~/hooks/globalEco/useSwapHandler";
import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";
import { usePublicClient } from "wagmi";

type InlineSwapWidgetProps = {
  openWalletModal: () => void;
};

function applySwapRate(amount: number, rate: number, direction: "toGBD" | "fromGBD") {
  return direction === "toGBD" ? amount * rate : amount / rate;
}

export const InlineSwapWidget = ({ openWalletModal }: InlineSwapWidgetProps) => {
  const { address: userAddress, chain } = useAccount();
  const chainId = chain?.id;

  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"toGBD" | "fromGBD">("toGBD");
  const [selectedSymbol, setSelectedSymbol] = useState("USDC");
  const [balance, setBalance] = useState("0.0");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [handleSwap, setHandleSwap] = useState<(() => void) | null>(null);
  const selectedToken = supportedTokens.find(t => t.symbol === selectedSymbol);
  const { data: walletClient } = useWalletClient();
  const pubClient = usePublicClient();
  const [available, setAvailable] = useState<bigint>(0n);

  const publicClient = createPublicClient({
    chain: GLOBALCHAIN,
    transport: http(),
  });

  useEffect(() => {
    const updateRateAndSwapHandler = async () => {
      const { rates } = await getExchangeRates();
      const selectedToken = supportedTokens.find(t => t.symbol === selectedSymbol);
      const tokenRateObj = rates.find(r => r.symbol === selectedSymbol);

      if (!selectedToken || !tokenRateObj?.rateAgainstGBDO) {
        console.warn(`[Rate] Missing rate for ${selectedSymbol}`);
        setExchangeRate(1);
        return;
      }

      const rate = tokenRateObj.rateAgainstGBDO;
      setExchangeRate(rate);

      const rawAmount = parseFloat(amount || "0");
      const amountIn = parseUnits(rawAmount.toFixed(6), selectedToken.decimals);

      const adjusted = applySwapRate(rawAmount, rate, direction);
      const parsedAmount = parseEther(adjusted.toFixed(6));

      if (!userAddress || !selectedToken || !chainId) return;
      const { handleSwap } = useSwapHandler({
        chainId: chainId ?? 0,
        amountin: amountIn,
        amountout: parsedAmount,
        selectedToken,
        direction,
        address: userAddress,
        exchangerate: rate,
      });

      setHandleSwap(() => handleSwap);
    };

    updateRateAndSwapHandler();
  }, [selectedSymbol, amount, direction, userAddress, chainId]);

  useEffect(() => {
    const fetchAndFormatBalance = async () => {
      if (!walletClient || !userAddress || !chainId) {
        setBalance("0.0");
        setAvailable(0n);
        return;
      }

      const gbdoToken = supportedTokens.find(t => t.symbol === "GBDO");
      const tokenToFetch = direction === "fromGBD" ? gbdoToken : selectedToken;

      if (!tokenToFetch) {
        setBalance("0.0");
        setAvailable(0n);
        return;
      }

      try {
        let rawBalance: bigint = 0n;

        if (tokenToFetch.isNative) {
          if (!pubClient) {
            setBalance("0.0");
            setAvailable(0n);
            return;
          }
          rawBalance = await pubClient.getBalance({ address: userAddress });
        } else {
          const contract = getContract({
            address: tokenToFetch.address as AddressType,
            abi: erc20Abi,
            client: walletClient,
          });

          rawBalance = await contract.read.balanceOf([userAddress]);
        }

        setAvailable(rawBalance);

        const decimals = tokenToFetch.decimals ?? 18;
        const formatted = Number(rawBalance) / 10 ** decimals;
        setBalance(formatted.toFixed(6));
      } catch (err) {
        console.error("Error fetching balance:", err);
        setAvailable(0n);
        setBalance("0.0");
      }
    };

    fetchAndFormatBalance();
  }, [walletClient, pubClient, userAddress, selectedToken, direction, chainId]);

  return (
    <div className="flex flex-col items-center max-w-xl mx-auto px-4 sm:px-6">
      <h2 className="text-xl font-light text-center mb-4">EXCHANGE</h2>

      <label className="w-full text-left text-sm mt-4 mb-2">SELECT TOKEN</label>
      <select
        className="select select-bordered border-white w-full mb-2"
        value={selectedSymbol}
        onChange={e => setSelectedSymbol(e.target.value)}
      >
        {supportedTokens
          .filter(t => t.symbol !== "GBDO")
          .map(({ symbol, name }) => (
            <option key={symbol} value={symbol}>
              {name} ({symbol})
            </option>
          ))}
      </select>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-1 w-full gap-2">
        <label className="text-left text-sm font-light sm:w-1/2">AMOUNT</label>
        <div className="flex flex-col sm:w-1/2 items-start sm:items-end">
          <p className="text-xs text-gray-400 mb-1 text-left sm:text-right">
            Balance: {balance} | Rate: {exchangeRate.toFixed(4)}
          </p>
        </div>
      </div>

      <input
        type="text"
        inputMode="decimal"
        pattern="[0-9]*"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="input input-bordered border-white w-full"
        placeholder="0.0"
      />

      <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4 w-full">
        <button
          className={`flex-1 flex items-center justify-center ${
            direction === "toGBD"
              ? "bg-primary/15 text-white text-xs rounded-md px-5 py-2"
              : "bg-secondary text-xs text-white rounded-md px-5 py-2"
          }`}
          onClick={() => setDirection("toGBD")}
        >
          To GBD
        </button>
        <button
          className={`flex-1 flex items-center justify-center ${
            direction === "fromGBD"
              ? "bg-primary/15 text-white text-xs rounded-md px-4 py-2"
              : "bg-secondary text-xs text-white rounded-md px-4 py-2"
          }`}
          onClick={() => setDirection("fromGBD")}
        >
          From GBD
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-10 pt-4 border-t w-full">
        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:gap-2">
          <RainbowKitCustomConnectButton />
          {!userAddress && (
            <span className="text-red-500 text-xs mt-2 sm:mt-0">Wallet Required</span>
          )}
        </div>

        <button
          className="btn btn-primary/50 btn-sm h-10 text-xs text-base-200 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
          onClick={handleSwap ?? undefined}
          disabled={!amount || parseFloat(amount) <= 0 || !userAddress || !chainId}
        >
          {amount ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <BanknotesIcon className="h-5 w-4 shrink-0" />
          )}
          EXCHANGE
        </button>
      </div>
    </div>
  );
};

export default InlineSwapWidget;
