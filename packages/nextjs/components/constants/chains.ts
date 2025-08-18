// supportedChains.ts

import type { Chain } from "wagmi/chains";

export const supportedChains: Chain[] = [
  {
    id: 1,
    name: "Ethereum Mainnet",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ["https://ethereum-rpc.publicnode.com"],      },
    },
    blockExplorers: {
      default: {
        name: "Etherscan",
        url: "https://etherscan.io",
      },
    },
    testnet: false,
  },
  {
    id: 137,
    name: "Polygon",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ["https://polygon-rpc.com"],
      },
    },
    blockExplorers: {
      default: {
        name: "Polygonscan",
        url: "https://polygonscan.com",
      },
    },
    testnet: false,
  },
  {
    id: 3503995874081207,
    name: "GLOBALCHAIN",
    nativeCurrency: {
      name: "GBDO",
      symbol: "GBDO",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ["https://rpc.brantley-global.com"],
      },
    },
    blockExplorers: {
      default: {
        name: "globaldash",
        url: "https://brantley-global.com/dashboard",
      },
    },
    testnet: false,
  },
  {
    id: 100,
    name: "Gnosis Chain",
    nativeCurrency: {
      name: "xDAI",
      symbol: "xDAI",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ["https://rpc.gnosischain.com"],
      },
    },
    blockExplorers: {
      default: {
        name: "Gnosisscan",
        url: "https://gnosisscan.io",
      },
    },
    testnet: false,
  },
  {
    id: 1111,
    name: "WEMIX Mainnet",
    nativeCurrency: {
      name: "WEMIX",
      symbol: "WEMIX",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ["https://api.wemix.com"],
      },
    },
    blockExplorers: {
      default: {
        name: "WEMIX Explorer",
        url: "https://explorer.wemix.com",
      },
    },
    testnet: false,
  },
];

