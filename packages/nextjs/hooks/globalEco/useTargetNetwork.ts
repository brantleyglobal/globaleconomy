"use client";

import { useEffect, useMemo } from "react";
import { useChainId } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";
import { useGlobalState } from "~~/services/store/store";
import { ChainWithAttributes } from "~~/utils/globalEco";
import { NETWORKS_EXTRA_DATA } from "~~/utils/globalEco";

export function useTargetNetwork(): { targetNetwork: ChainWithAttributes } {
  let chainId: number | undefined;
  try {
    chainId = useChainId();
  } catch {
    // In SSR or outside WagmiProvider, this will fail silently
    chainId = undefined;
  }

  const targetNetwork = useGlobalState(state => state.targetNetwork);
  const setTargetNetwork = useGlobalState(state => state.setTargetNetwork);

  useEffect(() => {
    if (typeof chainId !== "number") return;

    const newSelectedNetwork = scaffoldConfig.targetNetworks.find(net => net.id === chainId);
    if (newSelectedNetwork && newSelectedNetwork.id !== targetNetwork.id) {
      setTargetNetwork({ ...newSelectedNetwork, ...NETWORKS_EXTRA_DATA[newSelectedNetwork.id] });
    }
  }, [chainId, setTargetNetwork, targetNetwork.id]);

  return useMemo(() => ({ targetNetwork }), [targetNetwork]);
}
