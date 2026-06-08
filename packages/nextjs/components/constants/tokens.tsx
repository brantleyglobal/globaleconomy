// constants/token.tsx
import deployments from "../../lib/contracts//deployments.json";

export interface Token {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  isNative?: boolean;
  displayName?: string;
  chain?: string; // or use a broader enum if needed
}

interface Deployments {
  [key: string]: string;
}

const deploymentsTyped = deployments as Deployments;

export const generateDividendTokens = (): Token[] => {
  const tokens: Token[] = [];
  for (let middle = 2; middle <= 8; middle++) {
    const maxDigit = middle + 8;
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
        chain: "global",
      });
    }
  }
  return tokens;
};

export const supportedTokens: Token[] = [

  {
    name: "Global Dollar",
    symbol: "GBDo",
    address: "0x0000000000000000000000000000000000000000",
    decimals: 18,
    isNative: true,
    chain: "global",
  },
  /*{
    name: "Global DollarX",
    symbol: "GBDx",
    address: deployments.GlobalDollarX,
    decimals: 18,
    isNative: false,
    chain: "global",
  },*/
  {
    name: "Copian",
    symbol: "COPx",
    address: deployments.Copian,
    decimals: 18,
    isNative: false,
    chain: "global",
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "Dai Stablecoin",
    symbol: "DAI",
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "Euro Coin",
    symbol: "EURC",
    address: "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c",
    decimals: 6,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "FraxUSD",
    symbol: "FRAX",
    address: "0x853d955aCEf822Db058eb8505911ED77F175b99e",
    decimals: 18,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "PayPal USD",
    symbol: "PYUSD",
    address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
    decimals: 6,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "Pax Dollar",
    symbol: "USDP",
    address: "0x1456688345527bE1f37E9e627DA0837D6f08C925",
    decimals: 18,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "Tether USD",
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    isNative: false,
    chain: "ethereum",
  },
  
  {
    name: "BRZ Stablecoin",
    symbol: "BRZ",
    address: "0x71ab77b7dbb4fa7e017bc15090b2163221420282",
    decimals: 18,
    isNative: false,
    chain: "ethreum",
  },
  {
    name: "Uniswap",
    symbol: "UNI",
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    decimals: 18,
    chain: "ethereum",
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    address: "0x0000000000000000000000000000000000000000",
    decimals: 18,
    chain: "ethereum",
  },
  {
    name: "Chainlink",
    symbol: "LINK",
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    decimals: 18,
    chain: "ethreum"
  },
  {
    name: "Polygon",
    symbol: "MATIC",
    address: "0x0000000000000000000000000000000000001010",
    decimals: 18,
    chain: "polygon"
  },
  /*
  {
    name: "QCAD",
    symbol: "QCAD",
    address: "0x4A16BAf414b8e637Ed12019faD5Dd705735DB2e0",
    decimals: 6,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "First Digital USD",
    symbol: "FDUSD",
    address: "0x7d60F21072b585351dFd5E8b17109458D97ec120",
    decimals: 18,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "StraitsX Singapore Dollar",
    symbol: "XSGD",
    address: "0x70e8de73ce538da2beed35d14187f6959a8eca96",
    decimals: 6,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "JPY Coin",
    symbol: "JPYC",
    address: "0x6AE7Dfc73E0dDE2aa99ac063DcF7e8A63265108c",
    decimals: 18,
    isNative: false,
    chain: "polygon",
  },
  {
    name: "Moneta Mexicana",
    symbol: "MMXN",
    address: "0x0b6a2f0f3e1f3b0d89b016e5a2f0c1f6e1f0b0b",
    decimals: 18,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "ZARP Stablecoin",
    symbol: "ZARP",
    address: "0xb755506531786c8ac63b756bab1ac387bacb0c04",
    decimals: 18,
    isNative: false,
    chain: "polygon",
  },
  {
    name: "Nigerian Naira Token",
    symbol: "NGNT",
    address: "0x05BBeD16620B352A7F889E23E3Cf427D1D379FFE",
    decimals: 18,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "Poundtoken",
    symbol: "GBPT",
    address: "0x86B4dBE5D203e634a12364C0e428fa242A3FbA98",
    decimals: 18,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "Indian Rupee Token",
    symbol: "INRX",
    address: "0xc71daC923823D748a86D0A3618ABdA2d6dCd6bf4",
    decimals: 18,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "Turkish Lira Token",
    symbol: "TRYX",
    address: "0x6faff971d9248e7d398a98fdbe6a81f6d7489568",
    decimals: 18,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "Monerium Euro",
    symbol: "EURe",
    address: "0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f",
    decimals: 18,
    isNative: false,
    chain: "ethereum",
  },
  {
    name: "Wrapped Ethtereum",
    symbol: "WETH",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    isNative: false,
    chain: "ethereum",
  },*/
];

export const dividendTokens = [
  ...generateDividendTokens(),
  {
    name: "The Globe",
    symbol: "GLB",
    address: deployments.Globe,
    decimals: 18,
    isNative: false,
    chain: "global",
  },
  {
    name: "TRANS-GREENTECH REFINERY & DEPOT MX",
    symbol: "TGMX",
    address: deployments.TGMxRenewable,
    decimals: 18,
    isNative: false,
    chain: "global",
  },
  {
    name: "TRANS-GREENTECH REFINERY & DEPOT US",
    symbol: "TGUSA",
    address: deployments.TGUsRenewable,
    decimals: 18,
    isNative: false,
    chain: "global",
  },
  {
    name: "BG CLEAN REAL ESTATE",
    symbol: "CREs",
    address: deployments.BGSellRE,
    decimals: 18,
    isNative: false,
    chain: "global",
  },
  {
    name: "BG CLEAN REAL ESTATE",
    symbol: "CREh",
    address: deployments.BGHoldRE,
    decimals: 18,
    isNative: false,
    chain: "global",
  },
  {
    name: "BG CLEAN GRID",
    symbol: "CGRi",
    address: deployments.BGGrid,
    decimals: 18,
    isNative: false,
    chain: "global",
  },
]
