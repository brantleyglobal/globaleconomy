// constants/token.tsx

export interface Token {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
}

export const supportedTokens = [

  {
    name: "Global Dollar",
    symbol: "GBD",
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    decimals: 18,
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
  },
  {
    name: "TrueAUD",
    symbol: "AUDT",
    address: "0x00006100F7090010005F1bd7aE6122c3C2CF0090",
    decimals: 18,
  },
  {
    name: "Brazilian Digital Token",
    symbol: "BRZ",
    address: "0x420412E765BFa6d85aaaC94b4f4e037bD0F2B794",
    decimals: 4,
  },
  {
    name: "QCAD",
    symbol: "QCAD",
    address: "0x4fAbF2bD7cC9848f2Cdd2d3Ec7bFf3bF1F4E5f2C",
    decimals: 6,
  },
  {
    name: "CryptoFranc",
    symbol: "XCHF",
    address: "0xb4272071ecadd69d933adcd19ca99fe80664fc08",
    decimals: 18,
  },
  {
    name: "Dai Stablecoin",
    symbol: "DAI",
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
  },
  {
    name: "Euro Coin",
    symbol: "EURC",
    address: "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c",
    decimals: 6,
  },
  {
    name: "First Digital USD",
    symbol: "FDUSD",
    address: "0x7d60F21072b585351dFd5E8b17109458D97ec120",
    decimals: 18,
  },
  {
    name: "Frax",
    symbol: "FRAX",
    address: "0x853d955aCEf822Db058eb8505911ED77F175b99e",
    decimals: 18,
  },
  {
    name: "Gemini Dollar",
    symbol: "GUSD",
    address: "0x056Fd409E1d7A124BD7017459Dfea2F387B6d5Cd",
    decimals: 2,
  },
  {
    name: "JPY Coin",
    symbol: "JPYC",
    address: "0x6AE7Dfc73E0dDE2aa99ac063DcF7e8A63265108c",
    decimals: 18,
  },
  {
    name: "Moneta Mexicana",
    symbol: "MMXN",
    address: "0x6B9f031D718dDed0d681C20cb754F97b3BB81b78",
    decimals: 18,
  },
  {
    name: "PayPal USD",
    symbol: "PYUSD",
    address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
    decimals: 6,
  },
  {
    name: "XSGD",
    symbol: "XSGD",
    address: "0x70e8de73ce538da2beed35d14187f6959a8eca96",
    decimals: 6,
  },
  {
    name: "TrueUSD",
    symbol: "TUSD",
    address: "0x0000000000085d4780B73119b644AE5ecd22b376",
    decimals: 18,
  },
  {
    name: "Pax Dollar",
    symbol: "USDP",
    address: "0x1456688345527bE1f37E9e627DA0837D6f08C925",
    decimals: 18,
  },
  {
    name: "Tether USD",
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
  },
];
