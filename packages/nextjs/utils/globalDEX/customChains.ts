import { defineChain } from "viem";

export const gbdollar = defineChain({
  id: 12345,
  name: "Global Dollar",
  network: "globaldollar",
  nativeCurrency: {
    name: "Global Dollar",
    symbol: "GBD",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["http://localhost:8545"] },
  },
  blockExplorers: {
    default: { name: "GlobalEx", url: "http://localhost:4000" },
  },
});
