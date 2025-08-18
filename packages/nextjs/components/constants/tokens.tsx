// constants/token.tsx

export interface Token {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  isNative?: boolean;
}

export const supportedTokens = [

  {
    name: "Global Dominion",
    symbol: "GBDO",
    address: "0x65B5373C94CE38488B0a0B5aa0D6eFe55250e4ca",
    decimals: 18,
    isNative: true,
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
    address: "0x4fAbF2bD7cC9848f2Cdd2d3Ec7bFf3bF1F4E5f2C",
    decimals: 6,
    isNative: false,
  },
  {
    name: "CryptoFranc",
    symbol: "XCHF",
    address: "0xb4272071ecadd69d933adcd19ca99fe80664fc08",
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
    name: "Frax",
    symbol: "FRAX",
    address: "0x853d955aCEf822Db058eb8505911ED77F175b99e",
    decimals: 18,
    isNative: false,
  },
  {
    name: "Gemini Dollar",
    symbol: "GUSD",
    address: "0x056Fd409E1d7A124BD7017459Dfea2F387B6d5Cd",
    decimals: 2,
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
    name: "XSGD",
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
  {
    name: "Nigerian Naira Token",
    symbol: "NGNT",
    address: "0x05BBeD16620B352A7F889E23E3Cf427D1D379FFE",
    decimals: 18,
    isNative: false,
  },
  {
    name: "Poundtoken",
    symbol: "GBPT",
    address: "0x86B4dBE5D203e634a12364C0e428fa242A3FbA98",
    decimals: 18,
    isNative: false,
  },
  {
    name: "Argentine Peso Token",
    symbol: "ARSX",
    address: "0x7c7cA8E1fE6e7bC0eA1C7fD2bE2fFfC3aFfFfFfF",
    decimals: 18,
    isNative: false,
  },
  {
    name: "Indian Rupee Token",
    symbol: "INRX",
    address: "0xc71daC923823D748a86D0A3618ABdA2d6dCd6bf4",
    decimals: 18,
    isNative: false,
  },
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
];
