"use client";

import React, { useState, useEffect } from "react";
import { useTradePolling } from "~~/components/trading/useTradePolling";
import { TradingViewWidget } from "~~/components/trading/tradingViewWidget";
import { CandlestickData } from "lightweight-charts";
import { useCandles } from "~~/components/trading/useCandles";

type OrderType = "entry" | "exit";

type Order = {
  id: number;
  symbol: string;
  targetPrice: number;
  spreadPercent: number;
  type: OrderType;
};

const userTokenBalances: Record<string, number> = {
  USDC: 1,
  BTC: 2,
  ETH: 3,
  USER: 5,
};

const supportedPairs = ["BTCUSD", "ETHUSD", "USDCETH", "USERBTC"];

export default function GlobalTraderLayout() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inputs, setInputs] = useState({
    symbol: "",
    targetPrice: "",
    spreadPercent: "",
    type: "entry" as OrderType,
  });
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [isOnline, setIsOnline] = useState(true);
  const [selectedPair, setSelectedPair] = useState("BTCUSD");

  const maxOrders = Object.keys(userTokenBalances).length;

  const [chartStyle, setChartStyle] = useState("2");

  const { candles, loading: candlesLoading, error: candlesError } = useCandles(selectedPair);
  const [latestCandle, setLatestCandle] = useState<CandlestickData | undefined>();

  const tradeConfigs = orders.map(order => {
    const spread = order.spreadPercent / 100;
    const target = order.targetPrice;
    let minPrice = 0;
    let maxPrice = 0;

    if (order.type === "entry") {
      minPrice = target * (1 - spread);
      maxPrice = target * (1 + spread);
    } else {
      minPrice = target * (1 + spread);
      maxPrice = target * (1 - spread);
    }

    return {
      symbol: order.symbol.toUpperCase(),
      minPrice,
      maxPrice,
      type: order.type,
      onExecute: async (price: number, type: OrderType) => {        
        try {
          await yourChain.placeOrder({ symbol: order.symbol, price, type });
          // Optionally update UI or local state here
        } catch (error) {
          console.error("Chain order failed", error);
        }
      }
    };
  });

  useTradePolling({
    isOnline,
    tradeConfigs,
    setPrices,
    selectedPair,
    setLatestCandle,
  });

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  const addOrder = () => {
    if (
      orders.length < maxOrders &&
      inputs.symbol.trim() &&
      !isNaN(Number(inputs.targetPrice)) &&
      !isNaN(Number(inputs.spreadPercent))
    ) {
      setOrders(prev => [
        ...prev,
        {
          id: Date.now(),
          symbol: inputs.symbol.trim(),
          targetPrice: Number(inputs.targetPrice),
          spreadPercent: Number(inputs.spreadPercent),
          type: inputs.type,
        },
      ]);
      setInputs({ symbol: "", targetPrice: "", spreadPercent: "", type: "entry" });
    } else {
      alert(`Please fill all fields correctly or max orders reached (${maxOrders}).`);
    }
  };

  const removeOrder = (id: number) => {
    setOrders(prev => prev.filter(order => order.id !== id));
  };

  /*useEffect(() => {
    let isMounted = true;

    async function fetchCandles() {
      try {
        const response = await fetch(`/api/candles?symbol=${selectedPair}`);
        const data = await response.json();
        const formatted: CandlestickData[] = data.map((c: any) => ({
          time: Math.floor(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        if (isMounted) setCandles(formatted);
      } catch (error) {
        console.error(error);
      }
    }

    fetchCandles();
    const intervalId = setInterval(fetchCandles, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [selectedPair]);*/
  

  return (
    <div
      className="min-h-screen bg-black bg-scroll md:bg-fixed bg-center bg-cover bg-no-repeat"
      style={{ backgroundImage: "url('/emblemA.png')" }}
    >
      <div className="bg-black/50 min-h-screen px-4 py-6">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Chart */}
          <div className="md:col-span-3">
            <div className="bg-white/3 rounded-xl shadow-lg px-6 py-6">
              {candlesLoading ? (
                <p>Loading chart data...</p>
              ) : candlesError ? (
                <p>Error loading candles: {candlesError}</p>
              ) : (
                <TradingViewWidget candles={candles} latest={latestCandle} />
              )}
            </div>
          </div>
          {/* Order Manager */}
          <div className="md:col-span-1">
            <div className="bg-white/3 rounded-xl shadow-lg px-6 py-2 space-y-6">
              <h2 className="text-xl font-light text-primary mt-4">ORDER MANAGER</h2>
              <select
                className="input bg-black text-white rounded-md mb-4"
                value={chartStyle}
                onChange={e => setChartStyle(e.target.value)}
              >
                <option value="1">Candlesticks</option>
                <option value="2">Line</option>
                <option value="3">Area</option>
                <option value="0">Bars</option>
                <option value="8">Heikin Ashi</option>
              </select>
             
              {/* Inputs - stacked vertically */}
              <div className="space-y-4">
                {/* Token Pair Dropdown */}
                <select
                  className="input bg-black text-white rounded-md w-full"
                  value={selectedPair}
                  onChange={e => setSelectedPair(e.target.value)}
                >
                  {supportedPairs.map(pair => (
                    <option key={pair} value={pair}>
                      {pair}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="input w-full bg-black text-white placeholder:text-white/50 rounded-md"
                  placeholder="Target Price"
                  value={inputs.targetPrice}
                  onChange={e => setInputs(prev => ({ ...prev, targetPrice: e.target.value }))}
                />
                <input
                  type="number"
                  className="input w-full bg-black text-white placeholder:text-white/50 rounded-md"
                  placeholder="Spread %"
                  value={inputs.spreadPercent}
                  onChange={e => setInputs(prev => ({ ...prev, spreadPercent: e.target.value }))}
                />
                <select
                  className="input w-full bg-black text-white rounded-md"
                  value={inputs.type}
                  onChange={e => setInputs(prev => ({ ...prev, type: e.target.value as OrderType }))}
                >
                  <option value="entry">Entry (Buy)</option>
                  <option value="exit">Exit (Sell)</option>
                </select>
              </div>

              {/* Add Order Button */}
              <button
                className="btn bg-white/5 hover:bg-secondary/30 text-white rounded-md w-full mt-2 text-xs font-light px-4 h-10"
                onClick={addOrder}
              >
                ADD ORDER
              </button>
              {/* Orders */}
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <p className="text-white/50">No orders added yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {orders.map(order => {
                      const currentPrice = prices[order.symbol.toUpperCase()] ?? "Loading...";
                      const spread = order.spreadPercent / 100;
                      const minPrice = order.type === "entry"
                        ? order.targetPrice * (1 - spread)
                        : order.targetPrice * (1 + spread);
                      const maxPrice = order.type === "entry"
                        ? order.targetPrice * (1 + spread)
                        : order.targetPrice * (1 - spread);

                      return (
                        <li key={order.id} className="bg-white/5 p-4 rounded-md flex justify-between items-center">
                          <div>
                            <strong>{order.symbol.toUpperCase()}</strong> | Type: {order.type} | Target: {order.targetPrice} | Spread: {order.spreadPercent}%
                            <br />
                            Min: {minPrice.toFixed(2)} | Max: {maxPrice.toFixed(2)} | Current: {typeof currentPrice === "number" ? currentPrice.toFixed(2) : currentPrice}
                          </div>
                          <button
                            className="btn btn-sm bg-red-500 hover:bg-red-600 text-white rounded-md px-3 py-1"
                            onClick={() => removeOrder(order.id)}
                          >
                            Remove
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <p className="text-sm text-white/50">Your holding tokens count: {maxOrders}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
