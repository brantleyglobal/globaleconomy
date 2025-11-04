// wagmiConfig.ts

import { createConfig, http } from "wagmi";
import { metaMask, walletConnect, injected } from "wagmi/connectors";
import scaffoldConfig from "~~/scaffold.config";

const { targetNetworks, walletConnectProjectId } = scaffoldConfig;

export const wagmiConfig = createConfig({
  chains: targetNetworks,
  connectors: [
    metaMask(),
    injected(), // Covers Trust Wallet, Brave, etc.
    walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: true,
    }),
  ],
  transports: targetNetworks.reduce((acc, chain) => {
    acc[chain.id] = http();
    return acc;
  }, {} as Record<number, ReturnType<typeof http>>),
});
