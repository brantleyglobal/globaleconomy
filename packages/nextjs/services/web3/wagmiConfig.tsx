import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, fallback, http } from "viem";
import { hardhat, mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig, {
  DEFAULT_ALCHEMY_API_KEY,
  ScaffoldConfig,
} from "~~/scaffold.config";
import { getAlchemyHttpUrl } from "~~/utils/globalDEX";
import { gbdollar } from "~~/utils/globalDEX/customChains";

// Create a mutable array from your config's target networks
const networks: Chain[] = [...scaffoldConfig.targetNetworks];

/**
 * Strip unsupported fields from chain objects to satisfy Viem's strict typing
 */
const cleanChain = (chain: Chain): Chain => ({
  id: chain.id,
  name: chain.name,
  nativeCurrency: chain.nativeCurrency,
  rpcUrls: chain.rpcUrls,
  blockExplorers: chain.blockExplorers,
});

/**
 * Merge required chains into the config-defined ones, ensuring no duplicates
 */
const mergedChains = [
  ...networks,
  ...(networks.some(c => c.id === mainnet.id) ? [] : [mainnet]),
  ...(networks.some(c => c.id === gbdollar.id) ? [] : [gbdollar]),
].map(cleanChain);

// TypeScript requires a tuple: at least [Chain, ...Chain[]]
if (mergedChains.length === 0) {
  throw new Error("No chains defined for wagmiConfig.");
}

export const enabledChains = mergedChains as [Chain, ...Chain[]];

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors,
  ssr: true,
  client({ chain }) {
    let rpcFallbacks = [http()];

    const rpcOverrideUrl = (scaffoldConfig.rpcOverrides as ScaffoldConfig["rpcOverrides"])?.[chain.id];
    if (rpcOverrideUrl) {
      rpcFallbacks = [http(rpcOverrideUrl), http()];
    } else {
      const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
      if (alchemyHttpUrl) {
        const isUsingDefaultKey = scaffoldConfig.alchemyApiKey === DEFAULT_ALCHEMY_API_KEY;
        rpcFallbacks = isUsingDefaultKey
          ? [http(), http(alchemyHttpUrl)]
          : [http(alchemyHttpUrl), http()];
      }
    }

    return createClient({
      chain,
      transport: fallback(rpcFallbacks),
      ...(chain.id !== hardhat.id
        ? { pollingInterval: scaffoldConfig.pollingInterval }
        : {}),
    });
  },
});
