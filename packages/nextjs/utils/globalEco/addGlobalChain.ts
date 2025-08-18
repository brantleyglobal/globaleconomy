import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";

export const addGLOBALCHAINToWallet = async () => {
  if (typeof window === "undefined" || !window.ethereum?.request) return;

  try {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: `0x${GLOBALCHAIN.id.toString(16)}`,
        chainName: GLOBALCHAIN.name,
        nativeCurrency: GLOBALCHAIN.nativeCurrency,
        rpcUrls: GLOBALCHAIN.rpcUrls.default.http,
        blockExplorerUrls: [GLOBALCHAIN.blockExplorers?.default.url],
      }],
    });
  } catch (err) {
    console.error("Failed to add GLOBALCHAIN to wallet:", err);
  }
};
