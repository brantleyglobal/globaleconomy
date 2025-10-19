// constants/token.tsx
import deployments from "../../lib/contracts//deployments.json";

export interface Token {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  isNative?: boolean;
  displayName?: string;
}

interface Deployments {
  [key: string]: string;
}

const deploymentsTyped = deployments as Deployments;

const generateDividendTokens = (): Token[] => {
  const tokens: Token[] = [];
  for (let middle = 2; middle <= 8; middle++) {
    const maxDigit = middle + 2;
    for (let fl = 1; fl <= maxDigit; fl++) {
      const name = `Dividend${fl}${middle}${fl}`;
      const symbol = `GBD${fl}${middle}${fl}`;
      const address = deploymentsTyped[name];

      const displayName = `Global Dividend Terms--${middle}; `;

      tokens.push({
        name,
        symbol,
        address,
        decimals: 18,
        isNative: false,
        displayName,
      });
    }
  }
  return tokens;
};

export const supportedTokens = [

  {
    name: "Global Dominion",
    symbol: "GBDo",
    address: "0x0000000000000000000000000000000000000000",
    decimals: 18,
    isNative: true,
  },
  {
    name: "Global DominionX",
    symbol: "GBDx",
    address: deployments.GlobalDominionX,
    decimals: 18,
    isNative: false,
  },
  {
    name: "Copian",
    symbol: "COPx",
    address: deployments.Copian,
    decimals: 18,
    isNative: false,
  },
  {
    name: "The Globe",
    symbol: "GLB",
    address: deployments.Globe,
    decimals: 18,
    isNative: false,
  },
  {
    name: "TRANS-GREENTECH REFINERY & DEPOT MX",
    symbol: "TGMX",
    address: deployments.TGMX,
    decimals: 18,
    isNative: false,
  },
  {
    name: "TRANS-GREENTECH REFINERY & DEPOT US",
    symbol: "TGUSA",
    address: deployments.TGUSA,
    decimals: 18,
    isNative: false,
  },
  {
    name: "BG REAL ESTATE BUY TO SELL",
    symbol: "BGFFS",
    address: deployments.BGFFS,
    decimals: 18,
    isNative: false,
  },
  {
    name: "BG REAL ESTATE BUY TO HOLD",
    symbol: "BGFRS",
    address: deployments.BGFRS,
    decimals: 18,
    isNative: false,
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    isNative: false,
  },
  {
    name: "TrueAUD",
    symbol: "AUDT",
    address: "0x00006100F7090010005F1bd7aE6122c3C2CF0090",
    decimals: 18,
    isNative: false,
  },
  {
    name: "QCAD",
    symbol: "QCAD",
    address: "0x4A16BAf414b8e637Ed12019faD5Dd705735DB2e0",
    decimals: 6,
    isNative: false,
  },
  {
    name: "Wrapped Bitcoin",
    symbol: "WBTC",
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    isNative: false,
  },
  /*{
    name: "Bitcoin",
    symbol: "BTC",
    address: "0x0000000000000000000000000000000000000000",
    decimals: 8,
    isNative: false,
  },*/
  {
    name: "Wrapped Binance Coin",
    symbol: "WBNB",
    address: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52",
    decimals: 18,
    isNative: false,
  },
  {
    name: "Dai Stablecoin",
    symbol: "DAI",
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
    isNative: false,
  },
  {
    name: "Euro Coin",
    symbol: "EURC",
    address: "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c",
    decimals: 6,
    isNative: false,
  },
  {
    name: "First Digital USD",
    symbol: "FDUSD",
    address: "0x7d60F21072b585351dFd5E8b17109458D97ec120",
    decimals: 18,
    isNative: false,
  },
  {
    name: "FraxUSD",
    symbol: "FRAX",
    address: "0x853d955aCEf822Db058eb8505911ED77F175b99e",
    decimals: 18,
    isNative: false,
  },
  {
    name: "JPY Coin",
    symbol: "JPYC",
    address: "0x6AE7Dfc73E0dDE2aa99ac063DcF7e8A63265108c",
    decimals: 18,
    isNative: false,
  },
  {
    name: "Moneta Mexicana",
    symbol: "MMXN",
    address: "0x6B9f031D718dDed0d681C20cb754F97b3BB81b78",
    decimals: 18,
    isNative: false,
  },
  {
    name: "PayPal USD",
    symbol: "PYUSD",
    address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
    decimals: 6,
    isNative: false,
  },
  {
    name: "StraitsX Singapore Dollar",
    symbol: "XSGD",
    address: "0x70e8de73ce538da2beed35d14187f6959a8eca96",
    decimals: 6,
    isNative: false,
  },
  {
    name: "TrueUSD",
    symbol: "TUSD",
    address: "0x0000000000085d4780B73119b644AE5ecd22b376",
    decimals: 18,
    isNative: false,
  },
  {
    name: "Pax Dollar",
    symbol: "USDP",
    address: "0x1456688345527bE1f37E9e627DA0837D6f08C925",
    decimals: 18,
    isNative: false,
  },
  {
    name: "Tether USD",
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    isNative: false,
  },
  {
    name: "Australian Digital Dollar",
    symbol: "AUDD",
    address: "0x4cce605ed955295432958d8951d0b176c10720d5",
    decimals: 6,
    isNative: false,
  },
  {
    name: "ZARP Stablecoin",
    symbol: "ZARP",
    address: "0xb755506531786c8ac63b756bab1ac387bacb0c04",
    decimals: 18,
    isNative: false,
  },
  {
    name: "BRL1 Stablecoin",
    symbol: "BRL1",
    address: "0x5C067C80C00eCd2345b05E83A3e758eF799C40B5",
    decimals: 18,
    isNative: false,
  },
  /*{
    name: "Nigerian Naira Token",
    symbol: "NGNT",
    address: "0x05BBeD16620B352A7F889E23E3Cf427D1D379FFE",
    decimals: 18,
    isNative: false,
  },*/
  {
    name: "Poundtoken",
    symbol: "GBPT",
    address: "0x86B4dBE5D203e634a12364C0e428fa242A3FbA98",
    decimals: 18,
    isNative: false,
  },
  /*{
    name: "Indian Rupee Token",
    symbol: "INRX",
    address: "0xc71daC923823D748a86D0A3618ABdA2d6dCd6bf4",
    decimals: 18,
    isNative: false,
  },*/
  {
    name: "Turkish Lira Token",
    symbol: "TRYX",
    address: "0x6faff971d9248e7d398a98fdbe6a81f6d7489568",
    decimals: 18,
    isNative: false,
  },
  {
    name: "Monerium Euro",
    symbol: "EURe",
    address: "0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f",
    decimals: 18,
    isNative: false,
  },
  {
    name: "Wrapped Ethtereum",
    symbol: "WETH",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    isNative: false,
  },
];

export const dividendTokens = [
  ...generateDividendTokens(),
  {
    name: "The Globe",
    symbol: "GLB",
    address: deployments.Globe,
    decimals: 18,
    isNative: false,
  },
  {
    name: "TRANS-GREENTECH REFINERY & DEPOT MX",
    symbol: "TGMX",
    address: deployments.TGMX,
    decimals: 18,
    isNative: false,
  },
  {
    name: "TRANS-GREENTECH REFINERY & DEPOT US",
    symbol: "TGUSA",
    address: deployments.TGUSA,
    decimals: 18,
    isNative: false,
  },
  {
    name: "BG REAL ESTATE BUY TO SELL",
    symbol: "BGFFS",
    address: deployments.BGFFS,
    decimals: 18,
    isNative: false,
  },
  {
    name: "BG REAL ESTATE BUY TO HOLD",
    symbol: "BGFRS",
    address: deployments.BGFRS,
    decimals: 18,
    isNative: false,
  },
]
