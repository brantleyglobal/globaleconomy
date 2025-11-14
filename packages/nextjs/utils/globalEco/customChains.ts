import { defineChain } from "viem";

export const GLOBALCHAIN = defineChain({
  id: 38391207,
  name: "GLOBALCHAIN",
  network: "gbdo",
  nativeCurrency: {
    name: "GBDo",
    symbol: "GBDo",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        "https://rpc.brantley-global.com",
        //"https://live.brantley-global.com",
      ],
    },
    public: {
      http: [
        "https://rpc.brantley-global.com",
        //"https://live.brantley-global.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "globaldash",
      url: "https://brantley-global.com/dashboard",
    },
  },
  infoURL: "https://brantley-global.com",
});
