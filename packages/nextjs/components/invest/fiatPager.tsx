import { useEffect, useState } from "react";

export const FiatCardPager = () => {
  const fiatPairs: Record<string, string> = {
    USD_EUR: "FX_IDC:USDEUR",
    USD_GBP: "FX_IDC:USDGBP",
    USD_AUD: "FX_IDC:USDAUD",
    USD_BRL: "FX_IDC:USDBRL",
    USD_INR: "FX_IDC:USDINR",
    USD_CNY: "FX_IDC:USDCNY",
    USD_KRW: "FX_IDC:USDKRW",
    USD_NZD: "FX_IDC:USDNZD",
    // Keep your working OANDA pairs too
    USD_JPY: "OANDA:USDJPY",
    USD_CAD: "OANDA:USDCAD",
    USD_CHF: "OANDA:USDCHF",
    USD_MXN: "OANDA:USDMXN",
    USD_ZAR: "OANDA:USDZAR",
    USD_SEK: "OANDA:USDSEK",
  };

  const [index, setIndex] = useState(0);
  const keys = Object.keys(fiatPairs);
  const [selectedKey, setSelectedKey] = useState(keys[0]);
  const symbol = fiatPairs[selectedKey];

  useEffect(() => {
    const containerId = "fiat_chart";
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      allow_symbol_change: false,
      calendar: false,
      hide_side_toolbar: true,
      hide_volume: true,
      interval: "D", // Daily view
      theme: "dark",
      style: "2", // Line chart
      locale: "en",
      width: "100%",
      height: 370,
      backgroundColor: "#0F0F0F",
      gridColor: "rgba(242, 242, 242, 0.06)",
      hide_top_toolbar: true,
      hide_legend: true,
      save_image: true,
      studies: [],
      withdateranges: false,
      show_popup_button: false,
      container_id: containerId,
    });

    container?.appendChild(script);
  }, [symbol]);

  return (
    <div className="bg-black rounded-xl p-6 border border-white/10 shadow-md max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-lg font-light text-white">FIAT TRACKER</h1>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-light text-primary">{selectedKey}</h2>
        <select
          value={selectedKey}
          onChange={e => setSelectedKey(e.target.value)}
          className="bg-secondary/50 text-primary rounded-md px-2 py-1 text-xs"
        >
          {keys.map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>
      <div id="fiat_chart" />
    </div>
  );
};
