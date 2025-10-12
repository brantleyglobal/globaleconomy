// balanceRow.tsx
import React, { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useDisplayUsdMode } from "~~/hooks/globalEco/useDisplayUsdMode";
import { getContract } from "viem";
import { ethers } from "ethers";
import { supportedTokens, dividendTokens } from "~~/components/constants/tokens";


type TokenBalanceRowProps = {
  symbol: string;
  decimals: number;
  balance: bigint;
  tokenAddress: string;
  isExpanded: boolean;
  onExpand: () => void;
};

export const TokenBalanceRow = ({
  symbol,
  decimals,
  balance,
  tokenAddress,
  isExpanded,
  onExpand,
}: TokenBalanceRowProps) => {
  const { displayUsdMode, toggleDisplayUsdMode } = useDisplayUsdMode({ defaultUsdMode: false });
  const formatted = Number(formatUnits(balance, decimals));
  const [unlockQuarter, setUnlockQuarter] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnlockQuarter = async () => {
      try {
        const abi = [
          "function unlockQuarter() view returns (uint16)",
        ];
        const provider = new ethers.providers.Web3Provider((window as any).ethereum);
        await provider.send("eth_requestAccounts", []);
        const contract = new ethers.Contract(tokenAddress, abi, provider);
        const unlockQuarterRaw = await contract.unlockQuarter();
        const year = 2000 + (Math.floor(unlockQuarterRaw / 1000));
        const quarter = Math.floor((unlockQuarterRaw % 1000) / 100);
        const quarterNames = ["1st", "2nd", "3rd", "4th"];
        const quarterName = quarterNames[quarter - 1] || `Q${quarter}`;
        const result = (`${quarterName} Quarter ${year}`);
        setUnlockQuarter(result as string);
      } catch (err) {
        console.error(`Error fetching unlockQuarter for ${symbol}`, err);
      }
    };

    if (isExpanded) {
      fetchUnlockQuarter();
    }
  }, [isExpanded, tokenAddress, symbol]);

  return (
    <>
      <tr className="hover:bg-base-300 cursor-pointer" onClick={onExpand}>
        <td>
          <span>{formatted.toFixed(2)}</span>
          <span className="text-[0.8em] font-bold text-xs ml-1">{symbol}</span>
        </td>
      </tr>
      {isExpanded && unlockQuarter && (
        <tr>
          <td colSpan={2} className="text-xs text-accent pl-4">
            Unlock Quarter: <strong>{unlockQuarter}</strong>
          </td>
        </tr>
      )}
    </>
  );
};

