import { useState, useEffect } from "react";
import { CandlestickData } from "lightweight-charts";

export function useCandles(symbol: string | null) {
  const [candles, setCandles] = useState<CandlestickData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setCandles([]);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchCandles() {
      try {
        const WORKER_BASE_URL = "http://localhost:8787";
        // Fetch candles data for the chart
        const response = await fetch(`${WORKER_BASE_URL}/api/candles?symbol=${symbol}`, {
          headers: {
            "x-api-key": "your-secret-key-here",
          },
        });
        if (!response.ok) throw new Error("Failed fetching candles");
        const data = await response.json();

        // data here should be an array
        if (!Array.isArray(data)) throw new Error("Unexpected candle data format");
        const formatted: CandlestickData[] = data.map((c: any) => ({
          time: new Date(c.time * 1000).toISOString().slice(0, 10), // "YYYY-MM-DD"
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));


        if (isMounted) {
          setCandles(formatted);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Error fetching candles");
          setLoading(false);
        }
      }
    }


    fetchCandles();
    const interval = setInterval(fetchCandles, 10000); // Poll every 10 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbol]);

  return { candles, loading, error };
}
