import { useState, useEffect } from "react";
import { Token } from "~~/components/constants/tokens";  

export const CryptoCardPager = () => {
  const cryptoPairs: Record<string, string> = {
    // Stablecoins (confirmed available)
    USDC: "BINANCE:USDCUSDT",
    //DAI: "BINANCE:DAIUSDT",
    //USDT: "BINANCE:USDTUSDC",
    //FRAX: "BINANCE:FRAXUSDT",
    USDP: "BINANCE:USDPUSDT",
    FDUSD: "BINANCE:FDUSDUSDT",
    TUSD: "BINANCE:TUSDUSDT",
    //USDT: "tether",
    //FRAX: "frax",
    //USDP: "paxos-standard",
    //EURC: "euro-coin",
    //PYUSD: "paypal-usd",
    //AUDT: "trueaud",
    //QCAD: "qcad",
    //FDUSD: "first-digital-usd",
    //MMXN: "moneta",
    //XSGD: "xsgd",
    //AUDD: "australian-dollar-token",
    //ZARP: "zarp",
    //NGNT: "ngnt",
    //GBPT: "poundtoken",
    //INRX: "inr-token",
    //TRYX: "try-token",
    //EURe: "monerium-eur",

    // Major cryptocurrencies
    BTC: "BINANCE:BTCUSDT",
    ETH: "BINANCE:ETHUSDT",
    BNB: "BINANCE:BNBUSDT",
    SOL: "BINANCE:SOLUSDT",
    XRP: "BINANCE:XRPUSDT",
    ADA: "BINANCE:ADAUSDT",
    DOGE: "BINANCE:DOGEUSDT",
    DOT: "BINANCE:DOTUSDT",
    AVAX: "BINANCE:AVAXUSDT",
    MATIC: "BINANCE:MATICUSDT",
    LTC: "BINANCE:LTCUSDT",

    // Popular coins not yet in your setup
    TRX: "BINANCE:TRXUSDT",       // TRON
    LINK: "BINANCE:LINKUSDT",     // Chainlink
    UNI: "BINANCE:UNIUSDT",       // Uniswap
    TON: "BINANCE:TONUSDT",       // Toncoin
    XLM: "BINANCE:XLMUSDT",       // Stellar
    APT: "BINANCE:APTUSDT",       // Aptos
    OP: "BINANCE:OPUSDT",         // Optimism
    ARB: "BINANCE:ARBUSDT",       // Arbitrum
    INJ: "BINANCE:INJUSDT",       // Injective
    RUNE: "BINANCE:RUNEUSDT",     // THORChain
    PEPE: "BINANCE:PEPEUSDT",     // Meme coin
    SHIB: "BINANCE:SHIBUSDT",     // Shiba Inu
  };

  const [index, setIndex] = useState(0);
  const keys = Object.keys(cryptoPairs);
  const [selectedKey, setSelectedKey] = useState(keys[0]);
  const symbol = cryptoPairs[selectedKey];

  useEffect(() => {
    const containerId = "tradingview_chart";
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
    <div className="bg-black rounded-xl mt-4 p-6 border border-white/10 shadow-md max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-lg font-light text-white">CRYPTO TRACKER</h1>
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
      <div id="tradingview_chart" />
    </div>
  );
};