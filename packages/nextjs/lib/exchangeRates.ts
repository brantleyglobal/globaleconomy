import { ethers } from "ethers";
import { JsonRpcProvider } from "ethers";
import { supportedTokens } from "~~/components/constants/tokens";

// Chainlink Aggregator ABI
const aggregatorAbi = [
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)"
];

interface RawToken {
  symbol: string;
  [key: string]: any; 
}

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
  "USDC-ethereum": "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
  "USDC-base": "0x7e86654A2E66034D44184666d6cd2f1e2e55a135",
  "BUIDL-ethereum": "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
  "DAI-ethereum": "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
  "FDUSD-ethereum": "0xF79D6aFBb6dA890132F9D7c355e3015f15F3406F",
  "TUSD-ethereum": "0x3886BA987236181D98F2401c507Fb8BeA7871F07",
  "USDT-ethereum": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "FRAX-ethereum": "0xB9E7f8568e08d5659f5D29c4997173d84CDF2607",
  "RLUSD-ethereum": "0x26C4547432f901Bda93d9aCD2EcaF820CC087f2A",

  "UNI-ethereum": "0x553303d460ee0afb37edff9be42922d8ff63220e",
  "ETH-ethereum": "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  "LINK-ethereum": "0x2c1d072e956FFC0D435Cb7AC38EF18d658a69e68",
  "MATIC-polygon": "0xab594600376ec9fd913812674e7f339cf9b71eec",
  "WBTC-ethereum": "0xF4030086522a5bEEa4988F8cA5B36dbC1C9F46cE",
  "cbBTC-ethereum": "0xF4030086522a5bEEa4988F8cA5B36dbC1C9F46cE",
};

const currencyMap: Record<string, string> = {
  USDC: "USD", BUIDL: "USD", DAI: "USD", FDUSD: "USD", TUSD: "USD",
  GUSD: "USD", PYUSD: "USD", USDP: "USD", FRAX: "USD", WBTC: "BTC",
  EURC: "EUR", EURe: "EUR",  USDT: "USD", RLUSD: "USD", cbBTC: "BTC",
  GBPT: "GBP", ARSX: "ARS", INRX: "INR", TRYX: "TRY",
  NGNT: "NGN", ZARP: "ZAR", BRZ: "BRZ", AUDT: "AUD", AUDD: "AUD",
  JPYC: "JPY", MMXN: "MXN", QCAD: "CAD", XCHF: "CHF", XSGD: "SGD",
  UNI: "UNI", ETH: "ETH", LINK: "LINK", MATIC: "MATIC"
};

const networkMap: Record<string, string> = {
  USDC: "ethereum", BUIDL: "ethereum", DAI: "ethereum", FDUSD: "ethereum", TUSD: "ethereum", 
  GUSD: "ethereum", PYUSD: "ethereum", USDP: "ethereum", XSGD: "ethereum", RLUSD: "ethereum",
  EURC: "ethereum", EURe: "gnosis", USDT: "ethereum", FRAX: "ethereum", WBTC: "ethereum",
  GBPT: "optimism", ARSX: "arbitrum", INRX: "polygon", TRYX: "avalanche", cbBTC: "ethereum",
  NGNT: "bsc", ZARP: "polygon", BRZ: "ethereum", AUDT: "ethereum", AUDD: "ethereum",
  JPYC: "ethereum", MMXN: "ethereum", QCAD: "ethereum", XCHF: "ethereum",
  UNI: "UNI", ETH: "ETH", LINK: "LINK", MATIC: "MATIC",
};

const redstoneFeeds: Record<string, string> = {
  USDC: "USDC", BUIDL: "USDC", USDT: "USDT", DAI: "DAI", TUSD: "TUSD", FDUSD: "FDUSD", FRAX: "FRAX",
  PYUSD: "PYUSD", USDP: "USDP", EURC: "EUR", EURe: "EURe", GBPT: "GBP", RLUSD: "RLUSD",
  ARSX: "ARS", INRX: "INR", TRYX: "TRY", NGNT: "NGN", ZARP: "ZAR", BRZ: "BRZ", WBTC: "BTC",
  AUDT: "AUD", AUDD: "AUD", JPYC: "JPY", MMXN: "MXN", QCAD: "CAD", XCHF: "CHF", cbBTC: "BTC",
  XSGD: "SGD", GUSD: "GUSD", UNI: "UNI", ETH: "ETH", LINK: "LINK", MATIC: "MATIC"
};

const pythFeeds: Record<string, string> = {
  USDC: "Crypto.USDC/USD", BUIDL: "Crypto.USDC/USD", USDT: "Crypto.USDT/USD", DAI: "Crypto.DAI/USD", TUSD: "Crypto.TUSD/USD",
  FDUSD: "Crypto.FDUSD/USD", FRAX: "Crypto.FRAX/USD", PYUSD: "Crypto.PYUSD/USD", USDP: "Crypto.USDP/USD",
  EURC: "Crypto.EUR/USD", EURe: "Crypto.EURe/USD", GBPT: "Forex.GBP/USD", RLUSD: "Crypto.RLUSD/USD",
  ARSX: "Forex.ARS/USD", INRX: "Forex.INR/USD", TRYX: "Forex.TRY/USD", NGNT: "Forex.NGN/USD", WBTC: "Crypto.BTC/USD",
  ZARP: "Forex.ZAR/USD", BRZ: "Forex.BRZ/USD", AUDT: "Forex.AUD/USD", AUDD: "Forex.AUD/USD", cbBTC: "Crypto.BTC/USD",
  JPYC: "Forex.JPY/USD", MMXN: "Forex.MXN/USD", QCAD: "Forex.CAD/USD", XCHF: "Forex.CHF/USD",
  XSGD: "Forex.SGD/USD", GUSD: "Crypto.GUSD/USD", UNI: "UNI", ETH: "ETH", LINK: "LINK", MATIC: "MATIC",
};

const rateGuards: Record<string, { min: number; max: number; fallback?: number }> = {
  USDC: { min: 0.98, max: 1.02, fallback: 1.00 },
  BUIDL: { min: 0.99, max: 1.01, fallback: 1.00 },
  USDT: { min: 0.98, max: 1.02, fallback: 1.00 },
  DAI:  { min: 0.98, max: 1.02, fallback: 1.00 },
  TUSD: { min: 0.98, max: 1.02, fallback: 1.00 },
  USDP: { min: 0.98, max: 1.02, fallback: 1.00 },
  GUSD: { min: 0.98, max: 1.02, fallback: 1.00 },
  FDUSD:{ min: 0.98, max: 1.02, fallback: 1.00 },
  RLUSD: { min: 0.98, max: 1.02, fallback: 1.00 },
  FRAX: { min: 0.97, max: 1.03, fallback: 1.00 },
  PYUSD: { min: 0.98, max: 1.02, fallback: 1.00 },
  GBDo: { min: 1.03, max: 1.07, fallback: 1.05 },
  JPYC: { min: 0.0065, max: 0.0073, fallback: 0.0069 },
  EURC: { min: 1.08, max: 1.12, fallback: 1.10 },
  EURe: { min: 1.08, max: 1.12, fallback: 1.10 },
  GBPT: { min: 1.20, max: 1.30, fallback: 1.25 },
  AUDT: { min: 0.65, max: 0.69, fallback: 0.67 },
  AUDD: { min: 0.65, max: 0.69, fallback: 0.67 },
  QCAD: { min: 0.72, max: 0.76, fallback: 0.74 },
  XCHF: { min: 1.10, max: 1.14, fallback: 1.12 },
  ZARP: { min: 0.054, max: 0.064, fallback: 0.059 },
  BRZ: { min: 0.19, max: 0.21, fallback: 0.20 },
  MMXN: { min: 0.058, max: 0.062, fallback: 0.060 },
  NGNT: { min: 0.00063, max: 0.00068, fallback: 0.000655 },
  INRX: { min: 0.0118, max: 0.0124, fallback: 0.0121 },
  TRYX: { min: 0.030, max: 0.033, fallback: 0.0315 },
  XSGD: { min: 0.74, max: 0.76, fallback: 0.75 }
};

// Constants
const PRIME_FACTOR = 1.073;
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SMOOTHING_THRESHOLD = 0.02;
const RATE_EXPIRY_MS = 24 * 60 * 60 * 1000;

const stableCurrencies = ["USDP", "USDT", "BUIDL", "USDC", "DAI", "TUSD", "GUSD", "PYUSD", "AUDD", "AUDT", "QCAD", "MMXN", "NGNT", "EURC", "BRZ", "GBPT", "JPYC", "FRAX", "XSGD", "XCHF"];

const rpcFallbacks: Record<string, string[]> = {
  ethereum: ["https://eth.llamarpc.com", "https://cloudflare-eth.com"],
  arbitrum: ["https://arb1.arbitrum.io/rpc", "https://arbitrum.llamarpc.com"],
  optimism: ["https://mainnet.optimism.io", "https://optimism.llamarpc.com"],
  polygon: ["https://polygon-rpc.com", "https://polygon.llamarpc.com"],
  base: ["https://mainnet.base.org", "https://base.llamarpc.com"],
  avalanche: ["https://api.avax.network/ext/bc/C/rpc", "https://avalanche-c-chain.llamarpc.com"],
  bsc: ["https://bsc-dataseed.binance.org", "https://bsc.llamarpc.com"],
  gnosis: ["https://rpc.gnosischain.com", "https://gnosis.llamarpc.com"]
};

const trustedNetworks = Object.keys(rpcFallbacks);

const rateCache = new Map<string, StablecoinRate>();
let cachedRates: StablecoinRate[] | null = null;
let cachedGBDoRate: number | null = null;
let lastUpdated = 0
//let lastUpdated: number | null = null;

const typedSupportedTokens = supportedTokens as RawToken[];

const stablecoins: StablecoinMeta[] = typedSupportedTokens.map((token) => {
  // 1. Look for 'chain' on the token object itself. Fall back to "ethereum" if absent.
  const tokenChain = token.chain?.toLowerCase() ?? "ethereum";
  
  const meta: StablecoinMeta = {
    symbol: token.symbol,
    currency: currencyMap[token.symbol] ?? "USD",
    network: tokenChain, //  Now correctly assigns "base" for your Base USDC object
  };

  // 2. Build a composite key (e.g., "USDC-ethereum" or "USDC-base")
  const feedKey = `${token.symbol}-${tokenChain}`;
  const chainlink = chainlinkFeeds[feedKey];
  if (chainlink) meta.chainlinkFeed = chainlink;

  const pyth = pythFeeds[token.symbol];
  if (pyth) meta.pythFeed = pyth;

  const redstone = redstoneFeeds[token.symbol];
  if (redstone) meta.redstoneFeed = redstone;

  return meta;
});


const failedRpcUrls = new Map<string, number>();

// A quick mapping of your networks to their Chain IDs for Ethers static routing
const chainIdMap: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  optimism: 10,
  polygon: 137,
  base: 8453,
  avalanche: 43114,
  bsc: 56,
  gnosis: 100
};

async function getSafeProvider(network: string): Promise<JsonRpcProvider | null> {
  const urls = rpcFallbacks[network];
  if (!urls?.length) return null;

  const now = Date.now();
  const chainId = chainIdMap[network] || 1;

  for (const url of urls) {
    const failedAt = failedRpcUrls.get(url);
    if (failedAt && now - failedAt < 30000) {
      continue;
    }

    try {
      // Passing the network configuration statically stops Ethers from calling eth_chainId automatically
      const provider = new JsonRpcProvider(url, {
        chainId: chainId,
        name: network
      }, {
        staticNetwork: true // Crucial Ethers v6 flag to prevent automatic handshakes
      });

      // Quick, lightweight sanity check using Promise.race
      await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("RPC timeout")), 3000)
        ),
      ]);

      failedRpcUrls.delete(url);
      return provider;
    } catch (e) {
      failedRpcUrls.set(url, Date.now());
    }
  }

  return null;
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
    const result = await feed.latestRoundData!();

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
  if (!coin.symbol || !coin.network) return null;

  if (coin.symbol === "GBDo") {
    // If the cache map is empty, calculate the starting baseline using your token list
    const fallbackList = generateFallbackRates();
    const gbdoRate = cachedGBDoRate ?? calculateGBDoRate(rateCache.size > 0 ? Array.from(rateCache.values()) : fallbackList);
    
    return {
      symbol: "GBDo",
      currency: "GBDo",
      rate: gbdoRate,
      network: coin.network,
      healthy: true,
      timestamp: Date.now()
    };
  }

  const cacheKey = `${coin.symbol}-${coin.network}`;
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < RATE_EXPIRY_MS) {
    return cached;
  }

  const provider = await getSafeProvider(coin.network);
  let rate: StablecoinRate | null = null;

  if (provider && coin.chainlinkFeed) {
    rate = await fetchChainlinkRate(coin, provider);
  }

  if (!rate && coin.pythFeed) {
    rate = await fetchPythRate(coin);
  }

  if (!rate && coin.redstoneFeed) {
    rate = await fetchRedStoneRate(coin);
  }

  if (!rate) {
    const guard = rateGuards[coin.symbol];
    const fallbackVal = guard?.fallback ?? ((guard?.min ?? 1) + (guard?.max ?? 1)) / 2;

    rate = {
      symbol: coin.symbol,
      currency: coin.currency,
      rate: fallbackVal,
      network: coin.network,
      healthy: false,
      timestamp: Date.now()
    };
  }

  rateCache.set(cacheKey, rate);
  return rate;
}

async function fetchStablecoinRates(): Promise<StablecoinRate[]> {
  const promises = stablecoins.map(async (coin) => {
    if (!coin || coin.disabled || !trustedNetworks.includes(coin.network)) {
      return null;
    }

    let rate = await fetchRate(coin);
    
    // Direct, strict lookup using your exact configuration keys
    const guard = rateGuards[coin.symbol]!;

    // If a network rate exists, check it against your hardcoded bounds
    const isOutOfBounds = rate && guard && (rate.rate < guard.min || rate.rate > guard.max);

    // If the network request failed OR the rate is unsafe, use your explicit fallback
    if (!rate || isOutOfBounds) {
      rate = {
        symbol: coin.symbol,
        currency: coin.currency,
        // No hardcoded 1, no undefined. It strictly grabs your configured fallback.
        rate: guard.fallback!, 
        network: coin.network,
        healthy: false, // Flagged unhealthy because we are relying on your static fallback
        timestamp: Date.now()
      };
    }
    return rate;
  });

  const resolvedResults = await Promise.all(promises);
  return resolvedResults.filter((r): r is StablecoinRate => r !== null);
}

function applyGuard(symbol: string, rate: number): number {
  const guard = rateGuards[symbol];
  if (!guard) return rate;

  if (rate < guard.min) return guard.fallback ?? guard.min;
  if (rate > guard.max) return guard.fallback ?? guard.max;
  return rate;
}


function calculateGBDoRate(rates: StablecoinRate[]): number {

  const globalFiatStableRates = rates.filter(
    r => r.healthy && stableCurrencies.includes(r.currency) && r.symbol !== "GBDo"
  );

  if (globalFiatStableRates.length > 0) {
    const avg = globalFiatStableRates.reduce((sum, r) => sum + r.rate, 0) / globalFiatStableRates.length;
    return avg * PRIME_FACTOR;
  }

  // Find all configured symbols EXCEPT GBDo itself
  const configuredSymbols = Object.keys(rateGuards).filter(sym => sym !== "GBDo");
  let runningFallbackSum = 0;
  let validAssetCount = 0;

  for (const symbol of configuredSymbols) {
    const guard = rateGuards[symbol];
    if (guard) {
      // Pulls your precise fallback asset configuration value directly
      const activeFallback = guard.fallback ?? ((guard.min + guard.max) / 2);
      runningFallbackSum += activeFallback;
      validAssetCount++;
    }
  }

  // Return the true configuration baseline scaled by your multiplier factor
  const dynamicConfigBaseline = (runningFallbackSum / validAssetCount) * PRIME_FACTOR;
  return dynamicConfigBaseline;
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
    const fallback = guard!.fallback ?? (guard!.min + guard!.max) / 2;

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

let inFlightFetch: Promise<any> | null = null;

function isValidRate(n: number | null | undefined) {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

export async function getExchangeRates(): Promise<{
  rates: StablecoinRate[];
  gbdoRate: number;
  lastUpdated: number;
}> {
  const now = Date.now();

  if (now - lastUpdated < UPDATE_INTERVAL_MS && cachedRates) {
    return {
      rates: cachedRates,
      gbdoRate: isValidRate(cachedGBDoRate) ? cachedGBDoRate! : 1,
      lastUpdated,
    };
  }

  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    try {
      const stablecoinRatesRaw = await fetchStablecoinRates();

      if (!stablecoinRatesRaw || stablecoinRatesRaw.length === 0) {
        const fallbackRates = generateFallbackRates();
        
        // Calculate the baseline rate strictly using your configuration fallback settings
        const dynamicFallbackRate = calculateGBDoRate(fallbackRates);
        
        cachedRates = fallbackRates;
        cachedGBDoRate = dynamicFallbackRate; 
        
        return { 
          rates: fallbackRates, 
          gbdoRate: dynamicFallbackRate, 
          lastUpdated 
        };
      }

      const stablecoinRates = stablecoinRatesRaw.map(r => ({
        ...r,
        rate: applyGuard(r.symbol, r.rate),
      }));

      const rawGBDo = calculateGBDoRate(stablecoinRates);
      const validRawGBDo = isValidRate(rawGBDo) ? rawGBDo : null;

      // 1. Resolve a dynamic fallback baseline strictly from your config dictionary
      const gbdoConfigGuard = rateGuards["GBDo"];
      const dynamicConfigGBDoFallback = gbdoConfigGuard 
        ? (gbdoConfigGuard.fallback ?? ((gbdoConfigGuard.min + gbdoConfigGuard.max) / 2))
        : 1.05; // Strict system-level backup ONLY if the GBDo key is completely deleted from the config map

      if (validRawGBDo) {
        if (isValidRate(cachedGBDoRate)) {
          cachedGBDoRate = smoothRate(validRawGBDo, cachedGBDoRate!);
        } else {
          cachedGBDoRate = validRawGBDo;
        }
        lastUpdated = now;
      } else if (!isValidRate(cachedGBDoRate)) {
        
        cachedGBDoRate = dynamicConfigGBDoFallback;
      }

      const gbdoRateToUse = isValidRate(cachedGBDoRate) ? cachedGBDoRate! : dynamicConfigGBDoFallback;

      const ratesWithGBDo = stablecoinRates.map(r => {
        const scaledRate = r.symbol === "GBDo" ? gbdoRateToUse : r.rate;
        const relativeRate = r.symbol === "GBDo"
          ? 1
          : (gbdoRateToUse > 0 ? scaledRate / gbdoRateToUse : 0);

        return {
          ...r,
          rate: Number(scaledRate.toFixed(6)),
          rateAgainstGBDo: Number(relativeRate.toFixed(6)),
        };
      });

      cachedRates = ratesWithGBDo;

      return {
        rates: ratesWithGBDo,
        gbdoRate: gbdoRateToUse,
        lastUpdated,
      };
    } catch (err) {
      console.error("getExchangeRates critical fetch error, executing full fallback route:", err);
      
      const fallbackRates = generateFallbackRates();
      const dynamicConfigGBDo = calculateGBDoRate(fallbackRates);

      cachedRates = fallbackRates;
      cachedGBDoRate = dynamicConfigGBDo; 

      return {
        rates: fallbackRates,
        gbdoRate: dynamicConfigGBDo, 
        lastUpdated,
      };
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}