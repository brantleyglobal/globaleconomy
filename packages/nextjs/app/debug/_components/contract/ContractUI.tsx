"use client";

import { useReducer } from "react";
import { ContractReadMethods } from "./ContractReadMethods";
import { ContractVariables } from "./ContractVariables";
import { ContractWriteMethods } from "./ContractWriteMethods";
import { Address, Balance } from "~~/components/globalEco";
import { useDeployedContractInfo, useNetworkColor } from "~~/hooks/globalEco";
import { useTargetNetwork } from "~~/hooks/globalEco/useTargetNetwork";
import { ContractName } from "~~/utils/globalEco/contract";

type ContractUIProps = {
  contractName: ContractName;
  className?: string;
};

export const ContractUI = ({ contractName, className = "" }: ContractUIProps) => {
  const [refreshDisplayVariables, triggerRefreshDisplayVariables] = useReducer(v => !v, false);
  const { targetNetwork } = useTargetNetwork();
  const { data: deployedContractData, isLoading } = useDeployedContractInfo({ contractName });
  const networkColor = useNetworkColor();

  if (isLoading) {
    return (
      <div className="mt-14 text-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!deployedContractData) {
    return (
      <p className="text-3xl mt-14 text-center">
        {`No contract named "${contractName}" found on "${targetNetwork.name}".`}
      </p>
    );
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-6 px-6 lg:px-10 lg:gap-12 w-full max-w-7xl ${className}`}>
      <div className="col-span-5 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
        {/* 📦 Contract Info + Variables */}
        <div className="flex flex-col">
          <div className="bg-base-100 border border-base-300 rounded-3xl shadow-md shadow-secondary px-6 lg:px-8 py-4 mb-6 space-y-1">
            <div className="font-bold">{contractName}</div>
            <Address address={deployedContractData.address} onlyEnsOrAddress />
            <div className="flex gap-1 items-center text-sm">
              <span className="font-bold">Balance:</span>
              <Balance address={deployedContractData.address} className="px-0 h-1.5 min-h-[0.375rem]" />
            </div>
            <p className="text-sm">
              <span className="font-bold">Network:</span>{" "}
              <span style={{ color: networkColor }}>{targetNetwork.name}</span>
            </p>
          </div>
          <div className="bg-base-300 rounded-3xl shadow-lg shadow-base-300 px-6 lg:px-8 py-4">
            <ContractVariables
              refreshDisplayVariables={refreshDisplayVariables}
              deployedContractData={deployedContractData}
            />
          </div>
        </div>

        {/* 📡 Read + Write */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <SectionCard label="Read">
            <ContractReadMethods deployedContractData={deployedContractData} />
          </SectionCard>
          <SectionCard label="Write">
            <ContractWriteMethods
              deployedContractData={deployedContractData}
              onChange={triggerRefreshDisplayVariables}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

// 🔧 Section Wrapper Component
const SectionCard = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="relative bg-base-100 border border-base-300 shadow-md shadow-secondary rounded-3xl mt-10">
    <div className="absolute -top-[38px] -left-[1px] bg-base-300 rounded-[22px] shadow-lg shadow-base-300 w-[5.5rem] h-[5rem] py-[0.65rem] flex items-center justify-center z-10">
      <p className="text-sm font-medium">{label}</p>
    </div>
    <div className="p-5 divide-y divide-base-300">{children}</div>
  </div>
);
