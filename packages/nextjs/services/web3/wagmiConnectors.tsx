import {
  connectorsForWallets,
  getDefaultWallets,
} from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  trustWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import scaffoldConfig from "~~/scaffold.config";

const { targetNetworks, walletConnectProjectId } = scaffoldConfig;

const { wallets } = getDefaultWallets({
  appName: "globalEco",
  projectId: walletConnectProjectId,
  chains: targetNetworks,
});

export const wagmiConnectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        metaMaskWallet,
        trustWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: "globalEco",
    projectId: walletConnectProjectId,
  }
);
