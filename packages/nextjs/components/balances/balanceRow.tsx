import React from "react";
import { formatUnits } from "viem";
import { useDisplayUsdMode } from "~~/hooks/globalEco/useDisplayUsdMode";

type TokenBalanceRowProps = {
  symbol: string;
  decimals: number;
  balance: bigint;
};

export const TokenBalanceRow = ({
  symbol,
  decimals,
  balance,
}: TokenBalanceRowProps) => {
  const { displayUsdMode, toggleDisplayUsdMode } = useDisplayUsdMode({ defaultUsdMode: false });
  const formatted = Number(formatUnits(balance, decimals));

  return (
    <tr className="hover:bg-base-300 cursor-pointer" onClick={toggleDisplayUsdMode}>
      <td>
        <span>{formatted.toFixed(4)}</span>
        <span className="text-[0.8em] font-bold text-xs ml-1">{symbol}</span>
      </td>
    </tr>
  );
};
