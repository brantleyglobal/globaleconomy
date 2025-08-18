"use client";

import { Address, formatEther } from "viem";
import { useDisplayUsdMode } from "~~/hooks/globalEco/useDisplayUsdMode";
import { useTargetNetwork } from "~~/hooks/globalEco/useTargetNetwork";
import { useWatchBalance } from "~~/hooks/globalEco/useWatchBalance";
import { useGlobalState } from "~~/services/store/store";

type BalanceProps = {
  address?: Address;
  className?: string;
  usdMode?: boolean;
};

/**
 * Display (native & USD) balance of a connected address.
 */
export const Balance = ({ address, className = "", usdMode }: BalanceProps) => {
  const { targetNetwork } = useTargetNetwork();
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const {
    data: balance,
    isError,
    isLoading,
  } = useWatchBalance({ address });

  const { displayUsdMode, toggleDisplayUsdMode } = useDisplayUsdMode({ defaultUsdMode: usdMode });

  const formattedBalance = balance ? Number(formatEther(balance.value)) : 0;

  const shouldShowSkeleton = !address || isLoading || !balance;

  return (
    <div>
      {shouldShowSkeleton ? (
        <div className="flex space-x-2 items-center">
          <div className="rounded-md h-6 w-6 mt-2 overflow-hidden">
            <img
              src="/logo.png"
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col space-y-2">
            <div className="h-1 w-28 bg-white/30 rounded-sm"></div>
          </div>
        </div>
      ) : isError ? (
        <div className="border-2 border-base-content/30 rounded-md px-2 flex flex-col items-center max-w-fit cursor-pointer">
          <div className="text-warning">Error</div>
        </div>
      ) : (
        <button
          className={`btn btn-sm btn-ghost flex flex-col text-xs font-light ml-4 items-center hover:bg-transparent ${className}`}
          onClick={toggleDisplayUsdMode}
          type="button"
        >
          <div className="w-full flex items-center justify-center">
            {displayUsdMode && nativeCurrencyPrice > 0 ? (
              <>
                <span className="text-[0.8em] font-bold mr-1">$</span>
                <span>{(formattedBalance * nativeCurrencyPrice).toFixed(2)}</span>
              </>
            ) : (
              <>
                <span>{formattedBalance.toFixed(2)}</span>
                <span className="text-[0.8em] font-bold ml-1">{targetNetwork.nativeCurrency.symbol}</span>
              </>
            )}
          </div>
        </button>
      )}
    </div>
  );
};
