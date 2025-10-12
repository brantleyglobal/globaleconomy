import { useEffect } from "react";
import { Time, CandlestickData } from "lightweight-charts";

type OrderType = "entry" | "exit";

type TradeConfig = {
  symbol: string;
  minPrice: number;
  maxPrice: number;
  type: OrderType;
  onExecute: (price: number, type: OrderType) => void;
};

interface UseTradePollingParams {
  isOnline: boolean;
  tradeConfigs: TradeConfig[];
  setPrices: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
  selectedPair: string;
  setLatestCandle: React.Dispatch<React.SetStateAction<CandlestickData | undefined>>;
}

export function useTradePolling({
  isOnline,
  tradeConfigs,
  setPrices,
  selectedPair,
  setLatestCandle,
}: UseTradePollingParams) {
  useEffect(() => {
    if (!isOnline || tradeConfigs.length === 0) return;

    const intervalId = setInterval(async () => {
      for (const trade of tradeConfigs) {
        try {
          const response = await fetch(`/api/tradingview/price?symbol=${trade.symbol}`);
          if (!response.ok) throw new Error(`Failed fetching price for ${trade.symbol}`);
          const data = await response.json();
          const price = data.price as number;

          // Update price UI state
          setPrices(prev => ({ ...prev, [trade.symbol]: price }));

          // If trade symbol matches selectedPair, update realtime latest candle on chart
          if (trade.symbol.toUpperCase() === selectedPair.toUpperCase()) {
            setLatestCandle({
              time: Math.floor(Date.now() / 1000) as Time,
              open: price,
              high: price,
              low: price,
              close: price,
            });
          }

          // Trigger entry/exit logic on price conditions
          if (trade.type === "entry" && price >= trade.minPrice && price <= trade.maxPrice) {
            trade.onExecute(price, trade.type);
          } else if (trade.type === "exit" && (price <= trade.maxPrice || price >= trade.minPrice)) {
            trade.onExecute(price, trade.type);
          }
        } catch (error) {
          console.error(error);
        }
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isOnline, tradeConfigs, selectedPair, setPrices, setLatestCandle]);
}
