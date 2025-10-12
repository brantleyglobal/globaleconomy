import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickData,
  ISeriesApi,
  Time,
  UTCTimestamp,
  BusinessDay,
  isBusinessDay,
  isUTCTimestamp,
} from "lightweight-charts";

type Props = {
  candles: CandlestickData[];
  latest?: CandlestickData;
};

// Helper to convert any Time type to a comparable UNIX timestamp number (seconds)
function timeToNumber(time: Time): number {
  if (isUTCTimestamp(time)) {
    return time as UTCTimestamp;
  } else if (isBusinessDay(time)) {
    const bd = time as BusinessDay;
    return Date.UTC(bd.year, bd.month - 1, bd.day) / 1000;
  } else if (typeof time === "string") {
    return Date.parse(time) / 1000;
  }
  throw new Error("Unsupported time format");
}

// Sort and deduplicate candles by ascending 'time'
function processCandles(candles: CandlestickData[]): CandlestickData[] {
  // Copy array so original is not mutated
  const copy = candles.slice();

  // Sort candles ascending by time
  copy.sort((a, b) => timeToNumber(a.time) - timeToNumber(b.time));

  // Deduplicate candles with same timestamp time
  const deduped: CandlestickData[] = [];
  for (let i = 0; i < copy.length; i++) {
    if (
      i === 0 ||
      timeToNumber(copy[i].time) !== timeToNumber(copy[i - 1].time)
    ) {
      deduped.push(copy[i]);
    }
  }
  return deduped;
}

function processAndTransformCandles(rawCandles: CandlestickData[]): CandlestickData[] {
  // Sort & dedupe
  const clean = processCandles(rawCandles);

  // Example arithmetic: add a new property or modify open/high/low/close if needed
  return clean.map(c => ({
    ...c,
    // Example: shift close price by +1% as a demonstration
    close: c.close * 1.01,
  }));
}

export const TradingViewWidget = ({ candles, latest }: Props) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [processedCandles, setProcessedCandles] = useState<CandlestickData[]>([]);

  useEffect(() => {
    async function fetchHistorical() {
      const rawCandles = await fetchCandlesFromYourAPI();
      setProcessedCandles(processAndTransformCandles(rawCandles));
    }
    fetchHistorical();
  }, [symbol]);

  useEffect(() => {
    if (!processedCandles.length || !seriesRef.current) return;
    seriesRef.current.setData(processedCandles);
  }, [processedCandles]);

  // Create chart and initial series on mount and cleanup on unmount
  useEffect(() => {
    if (!chartContainerRef.current) return;

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 370,
      layout: {
        background: { color: "#0F0F0F" },
        textColor: "#FFFFFF",
      },
      grid: {
        vertLines: { color: "rgba(242,242,242,0.06)" },
        horzLines: { color: "rgba(242,242,242,0.06)" },
      },
      timeScale: { borderColor: "#444", timeVisible: true, secondsVisible: false },
    });

    seriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: "#00ff99",
      downColor: "#ff0066",
      borderUpColor: "#00ff99",
      borderDownColor: "#ff0066",
      wickUpColor: "#00ff99",
      wickDownColor: "#ff0066",
    });

    return () => chartRef.current?.remove();
  }, []);

  // Update entire candle series when candles prop changes
  useEffect(() => {
    if (!candles.length || !seriesRef.current) return;

    const cleanedCandles = processCandles(candles);
    seriesRef.current.setData(cleanedCandles);
  }, [candles]);

  // Live update latest candle if provided
  useEffect(() => {
    if (latest && seriesRef.current) {
      seriesRef.current.update(latest);
    }
  }, [latest]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full rounded-xl overflow-hidden"
      style={{ userSelect: "none" }}
    />
  );
};
