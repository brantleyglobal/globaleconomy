"use client";

// services/web3/wagmiConfig.ts
import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, fallback, http } from "viem";
import { hardhat, mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig, { ScaffoldConfig } from "~~/scaffold.config";
import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";

/** 1) Build your mergedChains exactly as you have it… */
const networks: Chain[] = [...scaffoldConfig.targetNetworks];
const cleanChain = (chain: Chain): Chain => ({
  id: chain.id,
  name: chain.name,
  nativeCurrency: chain.nativeCurrency,
  rpcUrls: chain.rpcUrls,
  blockExplorers: chain.blockExplorers,
});
const mergedChains = [
  ...networks,
  ...(networks.some(c => c.id === mainnet.id) ? [] : [mainnet]),
  ...(networks.some(c => c.id === GLOBALCHAIN.id) ? [] : [GLOBALCHAIN]),
].map(cleanChain);

if (!mergedChains.length) {
  throw new Error("No chains defined.");
}

export const chains = mergedChains as unknown as readonly [Chain, ...Chain[]];

/** 2) Create and export your wagmi config */
export const wagmiConfig = createConfig({
  ssr: true,
  chains,
  connectors: wagmiConnectors,
  client({ chain }) {
    const rpcOverrideUrl =
      (scaffoldConfig.rpcOverrides as ScaffoldConfig["rpcOverrides"])?.[
        chain.id
      ];
    const rpcFallbacks = rpcOverrideUrl
      ? [http(rpcOverrideUrl), http()]
      : [http()];

    return createClient({
      chain,
      transport: fallback(rpcFallbacks),
      ...(chain.id !== hardhat.id
        ? { pollingInterval: scaffoldConfig.pollingInterval }
        : {}),
    });
  },
});
