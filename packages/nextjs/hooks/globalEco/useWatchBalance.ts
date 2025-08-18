"use client";

import { useEffect } from "react";
import { useTargetNetwork } from "./useTargetNetwork";
import { useQueryClient } from "@tanstack/react-query";
import { UseBalanceParameters, useBalance, useBlockNumber } from "wagmi";
import toast from "react-hot-toast";

/**
 * Wrapper around wagmi's useBalance hook. Updates data on every block change.
 */
export const useWatchBalance = (useBalanceParameters: UseBalanceParameters) => {
  const { targetNetwork } = useTargetNetwork();
  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({ watch: true, chainId: targetNetwork.id });
  const { queryKey, ...restUseBalanceReturn } = useBalance(useBalanceParameters);

  // Refresh balance on every block
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [blockNumber]);

  // Show which address is being watched
  /*useEffect(() => {
    if (useBalanceParameters.address) {
      toast.success(`useWatchBalance: ${useBalanceParameters.address}`, { id: "watch-balance-address" });
    } else {
      toast.error("useWatchBalance: No address provided", { id: "watch-balance-address" });
    }
  }, [useBalanceParameters.address]);

  // Show balance status
  useEffect(() => {
    const { data, isLoading, isError, error } = restUseBalanceReturn;

    if (data) {
      toast.success(`Balance: ${data.formatted} ${data.symbol}`, { id: "balance-result" });
    } else if (isLoading) {
      toast.loading("Fetching balance...", { id: "balance-result" });
    } else if (isError) {
      toast.error("Error fetching balance", { id: "balance-result" });

      if (error) {
        toast.error(`Balance error: ${error.message}`, { id: "balance-error-detail" });
      }
    } else {
      toast("No balance data yet", { id: "balance-result" });
    }
  }, [
    restUseBalanceReturn.data,
    restUseBalanceReturn.isLoading,
    restUseBalanceReturn.isError,
    restUseBalanceReturn.error,
  ]);*/


  return restUseBalanceReturn;
};
