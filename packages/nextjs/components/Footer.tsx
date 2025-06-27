import React from "react";
import Link from "next/link";
import { hardhat } from "viem/chains";
import { CurrencyDollarIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/globalDEX/useTargetNetwork";
import { useGlobalState } from "~~/services/store/store";

export const Footer = () => {
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0 bg-black">
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto items-end">
          
          {/* Optionally render other local items here */}
          {isLocalNetwork && (
            <div className="btn btn-outline btn-sm">Local Network</div>
          )}
        </div>
      </div>
    </div>
  );
};

