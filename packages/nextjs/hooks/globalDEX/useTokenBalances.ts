// hooks/useTokenBalances.ts
import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { supportedTokens } from "~~/components/constants/tokens";

export function useTokenBalances(address?: `0x${string}`) {
  const wallet = useAccount();
  const activeAddress = address ?? wallet.address;

  const contracts = supportedTokens.map(token => ({
    abi: erc20Abi,
    address: token.address as `0x${string}`,
    functionName: "balanceOf",
    args: [activeAddress ?? "0x0"],
  }));

  const { data, isLoading } = useReadContracts({
    contracts,
    query: { enabled: !!activeAddress },
  });

  const coins = supportedTokens.map((token, i) => {
    const raw = data?.[i]?.result as bigint | undefined;
    const formatted = raw
      ? (Number(raw) / 10 ** token.decimals).toFixed(4)
      : "0.0000";
    return { ...token, balance: formatted };
  });

  return { coins, isLoading };
}
