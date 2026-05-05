import { ethers } from "ethers";
import { supportedTokens } from "~~/components/constants/tokens";
import { JsonRpcProvider } from "ethers";

// Chainlink Aggregator ABI
const aggregatorAbi = [
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)"
];

// Interfaces
interface StablecoinMeta {
  symbol: string;
  network: string;
  currency: string;
  chainlinkFeed?: string;
  pythFeed?: string;
  redstoneFeed?: string;
  disabled?: boolean;
}

export interface StablecoinRate {
  symbol: string;
  rate: number;
  currency: string;
  healthy: boolean;
  network: string;
  timestamp: number;
  rateAgainstGBDo?: number;
}


// Feed maps
const chainlinkFeeds: Record<string, string> = {
  USDC: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
  DAI: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
  FDUSD: "0xF79D6aFBb6dA890132F9D7c355e3015f15F3406F",
  TUSD: "0x3886BA987236181D98F2401c507Fb8BeA7871F07",
  USDT: "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  FRAX: "0xB9E7f8568e08d5659f5D29c4997173d84CDF2607",
};

const currencyMap: Record<string, string> = {
  USDC: "USD", DAI: "USD", FDUSD: "USD", TUSD: "USD",
  GUSD: "USD", PYUSD: "USD", USDP: "USD", FRAX: "USD",
  EURC: "EUR", EURe: "EUR",  USDT: "USD",
  GBPT: "GBP", ARSX: "ARS", INRX: "INR", TRYX: "TRY",
  NGNT: "NGN", ZARP: "ZAR", BRL1: "BRL", AUDT: "AUD", AUDD: "AUD",
  JPYC: "JPY", MMXN: "MXN", QCAD: "CAD", XCHF: "CHF", XSGD: "SGD"
};

const networkMap: Record<string, string> = {
  USDC: "ethereum", DAI: "ethereum", FDUSD: "ethereum", TUSD: "ethereum", 
  GUSD: "ethereum", PYUSD: "ethereum", USDP: "ethereum",  XSGD: "ethereum",
  EURC: "ethereum", EURe: "gnosis", USDT: "ethereum", FRAX: "ethereum",
  GBPT: "optimism", ARSX: "arbitrum", INRX: "polygon", TRYX: "avalanche",
  NGNT: "bsc", ZARP: "polygon", BRL1: "ethereum", AUDT: "ethereum", AUDD: "ethereum",
  JPYC: "ethereum", MMXN: "ethereum", QCAD: "ethereum", XCHF: "ethereum",
};

const redstoneFeeds: Record<string, string> = {
  USDC: "USDC", USDT: "USDT", DAI: "DAI", TUSD: "TUSD", FDUSD: "FDUSD", FRAX: "FRAX",
  PYUSD: "PYUSD", USDP: "USDP", EURC: "EUR", EURe: "EURe", GBPT: "GBP",
  ARSX: "ARS", INRX: "INR", TRYX: "TRY", NGNT: "NGN", ZARP: "ZAR", BRL1: "BRL",
  AUDT: "AUD", AUDD: "AUD", JPYC: "JPY", MMXN: "MXN", QCAD: "CAD", XCHF: "CHF",
  XSGD: "SGD", GUSD: "GUSD"
};

const pythFeeds: Record<string, string> = {
  USDC: "Crypto.USDC/USD", USDT: "Crypto.USDT/USD", DAI: "Crypto.DAI/USD", TUSD: "Crypto.TUSD/USD",
  FDUSD: "Crypto.FDUSD/USD", FRAX: "Crypto.FRAX/USD", PYUSD: "Crypto.PYUSD/USD", USDP: "Crypto.USDP/USD",
  EURC: "Crypto.EUR/USD", EURe: "Crypto.EURe/USD", GBPT: "Forex.GBP/USD",
  ARSX: "Forex.ARS/USD", INRX: "Forex.INR/USD", TRYX: "Forex.TRY/USD", NGNT: "Forex.NGN/USD",
  ZARP: "Forex.ZAR/USD", BRL1: "Forex.BRL/USD", AUDT: "Forex.AUD/USD", AUDD: "Forex.AUD/USD",
  JPYC: "Forex.JPY/USD", MMXN: "Forex.MXN/USD", QCAD: "Forex.CAD/USD", XCHF: "Forex.CHF/USD",
  XSGD: "Forex.SGD/USD", GUSD: "Crypto.GUSD/USD"
};

const rateGuards: Record<string, { min: number; max: number; fallback?: number }> = {
  USDC: { min: 0.98, max: 1.02, fallback: 1.00 },
  USDT: { min: 0.98, max: 1.02, fallback: 1.00 },
  DAI:  { min: 0.98, max: 1.02, fallback: 1.00 },
  TUSD: { min: 0.98, max: 1.02, fallback: 1.00 },
  USDP: { min: 0.98, max: 1.02, fallback: 1.00 },
  GUSD: { min: 0.98, max: 1.02, fallback: 1.00 },
  FDUSD:{ min: 0.98, max: 1.02, fallback: 1.00 },
  FRAX: { min: 0.97, max: 1.03, fallback: 1.00 },
  PYUSD: { min: 0.98, max: 1.02, fallback: 1.00 },
  GBDo: { min: 1.00, max: 1.00, fallback: 1.03 },
  JPYC: { min: 0.0065, max: 0.0073, fallback: 0.0069 },
  EURC: { min: 1.08, max: 1.12, fallback: 1.10 },
  EURe: { min: 1.08, max: 1.12, fallback: 1.10 },
  GBPT: { min: 1.20, max: 1.30, fallback: 1.25 },
  AUDT: { min: 0.65, max: 0.69, fallback: 0.67 },
  AUDD: { min: 0.65, max: 0.69, fallback: 0.67 },
  QCAD: { min: 0.72, max: 0.76, fallback: 0.74 },
  XCHF: { min: 1.10, max: 1.14, fallback: 1.12 },
  ZARP: { min: 0.054, max: 0.064, fallback: 0.059 },
  BRL1: { min: 0.19, max: 0.21, fallback: 0.20 },
  MMXN: { min: 0.058, max: 0.062, fallback: 0.060 },
  NGNT: { min: 0.00063, max: 0.00068, fallback: 0.000655 },
  INRX: { min: 0.0118, max: 0.0124, fallback: 0.0121 },
  TRYX: { min: 0.030, max: 0.033, fallback: 0.0315 },
  XSGD: { min: 0.74, max: 0.76, fallback: 0.75 }
};

// Constants
const PRIME_FACTOR = 1.386;
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SMOOTHING_THRESHOLD = 0.02;
const RATE_EXPIRY_MS = 24 * 60 * 60 * 1000;

const rpcFallbacks: Record<string, string[]> = {
  ethereum: [
    //"https://1rpc.io/eth",
    "https://eth.llamarpc.com",
    "https://cloudflare-eth.com"
  ],
  arbitrum: [
    "https://arb1.arbitrum.io/rpc",
    "https://arbitrum.llamarpc.com"
  ],
  optimism: [
    "https://mainnet.optimism.io",
    "https://optimism.llamarpc.com"
  ],
  polygon: [
    "https://polygon-rpc.com",
    "https://polygon.llamarpc.com"
  ],
  base: [
    "https://mainnet.base.org",
    "https://base.llamarpc.com"
  ],
  avalanche: [
    "https://api.avax.network/ext/bc/C/rpc",
    "https://avalanche-c-chain.llamarpc.com"
  ],
  bsc: [
    "https://bsc-dataseed.binance.org",
    "https://bsc.llamarpc.com"
  ],
  gnosis: [
    "https://rpc.gnosischain.com",
    "https://gnosis.llamarpc.com"
  ]
};

const trustedNetworks = Object.keys(rpcFallbacks);

const rateCache = new Map<string, StablecoinRate>();
let cachedRates: StablecoinRate[] | null = null;
let cachedGBDoRate: number | null = null;
let lastUpdated = 0
//let lastUpdated: number | null = null;

const stablecoins: StablecoinMeta[] = supportedTokens.map(token => ({
  symbol: token.symbol,
  currency: currencyMap[token.symbol] ?? "USD",
  network: networkMap[token.symbol] ?? "ethereum",
  chainlinkFeed: chainlinkFeeds[token.symbol],
  pythFeed: pythFeeds[token.symbol],
  redstoneFeed: redstoneFeeds[token.symbol],
}));

async function getSafeProvider(network: string): Promise<JsonRpcProvider | null> {
  const urls = rpcFallbacks[network];
  if (!urls) return null;

  for (const url of urls) {
    try {
      const provider = new JsonRpcProvider(url);
      await provider.getBlockNumber(); // lightweight test
      return provider;
    } catch {
      continue; // try next RPC
    }
  }

  return null; // all RPCs failed
}

async function fetchChainlinkRate(
  coin: StablecoinMeta,
  provider: JsonRpcProvider
): Promise<StablecoinRate | null> {
  try {
    if (!coin.chainlinkFeed) {
      //console.warn(`[Chainlink] Missing feed for ${coin.symbol}`);
      return null;
    }

    const feed = new ethers.Contract(coin.chainlinkFeed, aggregatorAbi, provider);
    const result = await feed.latestRoundData();

    if (!result || result[1] == null || result[3] == null) {
      //console.warn(`[Chainlink] Invalid response for ${coin.symbol}`, result);
      return null;
    }

    const [, answer, , updatedAt] = result;
    const value = Number(answer) / 1e8;
    if (isNaN(value) || !isFinite(value)) {
      //console.warn(`[Chainlink] Invalid numeric rate for ${coin.symbol}`, answer);
      return null;
    }

    const expectedRange: Record<string, [number, number]> = { /* unchanged */ };
    const [min, max] = expectedRange[coin.currency] ?? [0.0001, 10000];
    const isHealthy = value >= min && value <= max;

    if (!isHealthy) {
      //console.warn(`[Chainlink] Rate out of range for ${coin.symbol}: ${value}`);
    }

    return {
      symbol: coin.symbol,
      currency: coin.currency,
      rate: value,
      network: coin.network,
      healthy: isHealthy,
      timestamp: Number(updatedAt) * 1000
    };
  } catch (err) {
    //console.warn(`[Chainlink] Fetch failed for ${coin.symbol} on ${coin.network}`, err);
    return null;
  }
}

async function fetchPythRate(coin: StablecoinMeta): Promise<StablecoinRate | null> {
  try {
    if (!coin.pythFeed) {
      //console.warn(`[Pyth] Missing feed for ${coin.symbol}`);
      return null;
    }

    // Simulated fallback value (replace with actual logic later)
    const mockedValue = 0.6666;
    const isHealthy = mockedValue >= 0.0001 && mockedValue <= 10000;

    return {
      symbol: coin.symbol,
      currency: coin.currency,
      rate: mockedValue,
      network: coin.network,
      healthy: isHealthy,
      timestamp: Date.now()
    };
  } catch (err) {
    //console.warn(`[Pyth] Fetch failed for ${coin.symbol}`, err);
    return null;
  }
}

async function fetchRedStoneRate(coin: StablecoinMeta): Promise<StablecoinRate | null> {
  try {
    if (!coin.redstoneFeed) {
      //console.warn(`[RedStone] Missing feed for ${coin.symbol}`);
      return null;
    }

    // Simulated fallback value (replace with actual logic later)
    const mockedValue = 0.6644;
    const isHealthy = mockedValue >= 0.0001 && mockedValue <= 10000;

    return {
      symbol: coin.symbol,
      currency: coin.currency,
      rate: mockedValue,
      network: coin.network,
      healthy: isHealthy,
      timestamp: Date.now()
    };
  } catch (err) {
    //console.warn(`[RedStone] Fetch failed for ${coin.symbol}`, err);
    return null;
  }
}

async function fetchRate(coin: StablecoinMeta): Promise<StablecoinRate | null> {
  if (!coin.symbol || !coin.network) {
    //console.warn(`[FetchRate] Missing symbol or network:`, coin);
    return null;
  }

  if (coin.symbol === "GBDo") {
    const gbdoRate = cachedGBDoRate ?? calculateGBDoRate(Array.from(rateCache.values()));
    return {
      symbol: "GBDo",
      currency: "GBDo",
      rate: gbdoRate,
      network: coin.network,
      healthy: true,
      timestamp: Date.now()
    };
  }

  const rpcUrl = rpcFallbacks[coin.network];
  if (!rpcUrl) {
    //console.warn(`[FetchRate] Missing RPC URL for ${coin.symbol} on ${coin.network}`);
    return null;
  }

  const cacheKey = `${coin.symbol}-${coin.network}`;
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < RATE_EXPIRY_MS) {
    //console.log(`[Cache] Using cached rate for ${coin.symbol}`);
    return cached;
  }

  const provider = await getSafeProvider(coin.network);
  if (!provider) {
    console.warn(`All RPCs failed for ${coin.network}`);
    return null;
  }
  let rate: StablecoinRate | null = null;

  // Try Chainlink first
  if (coin.chainlinkFeed) {
    rate = await fetchChainlinkRate(coin, provider);
  }

  // Fallback to Pyth if Chainlink fails
  if (!rate && coin.pythFeed) {
    rate = await fetchPythRate(coin);
  }

  // Fallback to RedStone if Pyth fails
  if (!rate && coin.redstoneFeed) {
    rate = await fetchRedStoneRate(coin);
  }

  if (!rate) {
    //console.warn(`[FetchRate] Failed to resolve rate for ${coin.symbol}`);
  } else {
    rateCache.set(cacheKey, rate);
  }

  return rate;
}

async function fetchStablecoinRates(): Promise<StablecoinRate[]> {
  const results: StablecoinRate[] = [];

  for (const coin of stablecoins) {
    if (!coin || coin.disabled || !trustedNetworks.includes(coin.network)) continue;

    const rate = await fetchRate(coin);
    if (rate) {
      results.push(rate);
    } else {
      //console.warn(`[FetchRates] Skipped or failed for ${coin.symbol} on ${coin.network}`);
    }

    if (rate && !rate.healthy) {
      //console.warn(`[Health] ${coin.symbol} marked unhealthy: ${rate.rate}`);
    }
  }

  /*console.table(results.map(r => ({
    symbol: r.symbol,
    rate: r.rate.toFixed(4),
    healthy: r.healthy,
    network: r.network,
    rpcUrl: rpcUrls[r.network] ?? "missing"
  })));*/

  return results;
}

function applyGuard(symbol: string, rate: number): number {
  const guard = rateGuards[symbol];
  if (!guard) return rate;

  if (rate < guard.min) return guard.fallback ?? guard.min;
  if (rate > guard.max) return guard.fallback ?? guard.max;
  return rate;
}


function calculateGBDoRate(rates: StablecoinRate[]): number {
  const healthyRates = rates.filter(r => r.healthy);
  if (healthyRates.length === 0) return 1;

  const avg = healthyRates.reduce((sum, r) => sum + r.rate, 0) / healthyRates.length;
  //console.log(`[GBDo] Healthy tokens: ${healthyRates.map(r => r.symbol).join(", ")}`);
  return avg * PRIME_FACTOR;
}

function smoothRate(current: number, previous: number): number {
  const change = Math.abs(current - previous) / previous;
  return change > SMOOTHING_THRESHOLD
    ? (previous * 0.7) + (current * 0.3)
    : current;
}

function shouldUpdateGBDo(): boolean {
  return !lastUpdated || (Date.now() - lastUpdated > UPDATE_INTERVAL_MS);
}

function generateFallbackRates(): StablecoinRate[] {
  return Object.keys(rateGuards).map(symbol => {
    const guard = rateGuards[symbol];
    const fallback = guard.fallback ?? (guard.min + guard.max) / 2;

    return {
      symbol,
      rate: fallback,
      currency: currencyMap[symbol] ?? "USD",
      healthy: false,
      network: networkMap[symbol] ?? "ethereum",
      timestamp: Date.now(),
      rateAgainstGBDo: symbol === "GBDo" ? 1 : fallback
    };
  });
}

export async function getExchangeRates(): Promise<{
  rates: StablecoinRate[];
  gbdoRate: number;
  lastUpdated: number;
}> {
  const now = Date.now();

  // ✅ If we've already attempted within 24h, return cached or guarded fallback
  if (now - lastUpdated < UPDATE_INTERVAL_MS) {
    return {
      rates: cachedRates ?? generateFallbackRates(),
      gbdoRate: cachedGBDoRate ?? 1,
      lastUpdated
    };
  }

  try {
    // 🔹 Fresh attempt
    let stablecoinRates = await fetchStablecoinRates();

    // Step 1: apply guards
    stablecoinRates = stablecoinRates.map(r => ({
      ...r,
      rate: applyGuard(r.symbol, r.rate),
    }));

    // Step 2: GBDo update logic
    if (shouldUpdateGBDo()) {
      const rawRate = calculateGBDoRate(stablecoinRates);
      const smoothed = cachedGBDoRate != null
        ? smoothRate(rawRate, cachedGBDoRate)
        : rawRate;

      cachedGBDoRate = smoothed;
      lastUpdated = now;
    }

    const gbdoRate = cachedGBDoRate ?? calculateGBDoRate(stablecoinRates);

    // Step 3: derive rateAgainstGBDo
    const ratesWithGBDo = stablecoinRates.map(r => {
      const scaledRate = r.symbol === "GBDo" ? gbdoRate : r.rate;
      const relativeRate =
        r.symbol === "GBDo" ? 1 : (gbdoRate > 0 ? scaledRate / gbdoRate : 0);

      return {
        ...r,
        rate: Number(scaledRate.toFixed(6)),
        rateAgainstGBDo: Number(relativeRate.toFixed(6)),
      };
    });

    // ✅ Cache full result for the day
    cachedRates = ratesWithGBDo;

    return {
      rates: ratesWithGBDo,
      gbdoRate,
      lastUpdated,
    };
    } catch (err) {
    // Mark the attempt as done for the day
    lastUpdated = now;

    // Generate and store fallback rates
    const fallbackRates = generateFallbackRates();
    cachedRates = fallbackRates;
    cachedGBDoRate = 1;

    return {
      rates: fallbackRates,
      gbdoRate: 1,
      lastUpdated
    };
  }
}

