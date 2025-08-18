"use client";

import { useEffect } from "react";
import { InheritanceTooltip } from "./InheritanceTooltip";
import { displayTxResult } from "./utilsDisplay";
import { Abi, AbiFunction } from "abitype";
import { Address } from "viem";
import { useReadContract } from "wagmi";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useAnimationConfig } from "~~/hooks/globalEco";
import { useTargetNetwork } from "~~/hooks/globalEco/useTargetNetwork";
import { getParsedError, notification } from "~~/utils/globalEco";

type DisplayVariableProps = {
  contractAddress: Address;
  abiFunction: AbiFunction;
  refreshDisplayVariables: boolean;
  inheritedFrom?: string;
  abi: Abi;
};

export const DisplayVariable = ({
  contractAddress,
  abiFunction,
  refreshDisplayVariables,
  abi,
  inheritedFrom,
}: DisplayVariableProps) => {
  const { targetNetwork } = useTargetNetwork();

  const {
    data: result,
    isFetching,
    refetch,
    error,
  } = useReadContract({
    address: contractAddress,
    abi,
    functionName: abiFunction.name,
    chainId: targetNetwork.id,
    query: { retry: false },
  });

  const { showAnimation } = useAnimationConfig(result);

  useEffect(() => {
    refetch();
  }, [refetch, refreshDisplayVariables]);

  useEffect(() => {
    if (error) {
      const parsedError = getParsedError(error);
      notification.error(parsedError);
    }
  }, [error]);

  return (
    <div className="space-y-1 pb-2">
      <div className="flex items-center gap-2">
        <h3 className="font-medium text-lg break-all mb-0">{abiFunction.name}</h3>
        <button className="btn btn-ghost btn-xs" onClick={() => refetch()}>
          {isFetching ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <ArrowPathIcon className="h-3 w-3" aria-hidden="true" />
          )}
        </button>
        <InheritanceTooltip inheritedFrom={inheritedFrom} />
      </div>

      <div className="text-base-content/80">
        <div
          className={`break-all transition ${
            showAnimation ? "bg-warning rounded-xs animate-pulse-fast p-1" : ""
          }`}
        >
          {displayTxResult(result)}
        </div>
      </div>
    </div>
  );
};
