"use client";

import { useEffect, useState } from "react";
import { InheritanceTooltip } from "./InheritanceTooltip";
import { Abi, AbiFunction } from "abitype";
import { Address } from "viem";
import { useReadContract } from "wagmi";
import {
  ContractInput,
  displayTxResult,
  getFunctionInputKey,
  getInitialFormState,
  getParsedContractFunctionArgs,
  transformAbiFunction,
} from "~~/app/debug/_components/contract";
import { useTargetNetwork } from "~~/hooks/globalEco/useTargetNetwork";
import { getParsedError, notification } from "~~/utils/globalEco";

type ReadOnlyFunctionFormProps = {
  contractAddress: Address;
  abiFunction: AbiFunction;
  inheritedFrom?: string;
  abi: Abi;
};

export const ReadOnlyFunctionForm = ({
  contractAddress,
  abiFunction,
  inheritedFrom,
  abi,
}: ReadOnlyFunctionFormProps) => {
  const [form, setForm] = useState(() => getInitialFormState(abiFunction));
  const [result, setResult] = useState<unknown>();
  const { targetNetwork } = useTargetNetwork();

  const {
    isFetching,
    refetch,
    error,
  } = useReadContract({
    address: contractAddress,
    abi,
    functionName: abiFunction.name,
    args: getParsedContractFunctionArgs(form),
    chainId: targetNetwork.id,
    query: {
      enabled: false,
      retry: false,
    },
  });

  useEffect(() => {
    if (error) {
      notification.error(getParsedError(error));
    }
  }, [error]);

  const transformedFunction = transformAbiFunction(abiFunction);
  const inputElements = transformedFunction.inputs.map((input, index) => {
    const key = getFunctionInputKey(abiFunction.name, input, index);
    return (
      <ContractInput
        key={key}
        setForm={updatedForm => {
          setResult(undefined);
          setForm(updatedForm);
        }}
        form={form}
        stateObjectKey={key}
        paramType={input}
      />
    );
  });

  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-1">
      <p className="font-medium my-0 break-words">
        {abiFunction.name} <InheritanceTooltip inheritedFrom={inheritedFrom} />
      </p>
      {inputElements}
      <div className="flex flex-col md:flex-row justify-between gap-2 flex-wrap">
        <div className="grow w-full md:max-w-[80%]">
          {result !== undefined && result !== null && (
            <div className="bg-secondary rounded-3xl text-sm px-4 py-1.5 break-words overflow-auto">
              <p className="font-bold m-0 mb-1">Result:</p>
              <pre className="whitespace-pre-wrap break-words">{displayTxResult(result, "sm")}</pre>
            </div>
          )}
        </div>
        <button
          className="btn btn-secondary btn-sm self-end md:self-start"
          onClick={async () => {
            const { data } = await refetch();
            setResult(data);
          }}
          disabled={isFetching}
        >
          {isFetching && <span className="loading loading-spinner loading-xs" />}
          Read 📡
        </button>
      </div>
    </div>
  );
};
