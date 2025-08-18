import { useEffect, useState } from "react";
import { Address, getContract } from "viem";
import { usePublicClient } from "wagmi";
import { erc20Abi } from "viem";
import { supportedTokens } from "~~/components/constants/tokens";

export const useDirectTokenBalances = (userAddress?: Address) => {
  const publicClient = usePublicClient();
  const [balances, setBalances] = useState<
    { symbol: string; address: Address; decimals: number; balance: bigint }[]
  >([]);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!userAddress || !publicClient) return;

      const results = await Promise.allSettled(
        supportedTokens.map(async token => {
          const balance = token.isNative
            ? await publicClient.getBalance({ address: userAddress })
            : await getContract({
                address: token.address,
                abi: erc20Abi,
                client: publicClient,
              }).read.balanceOf([userAddress]);

          return {
            symbol: token.symbol,
            address: token.address,
            decimals: token.decimals,
            balance,
          };
        })
      );

      const filtered = results
        .filter(r => r.status === "fulfilled")
        .map(r => (r as PromiseFulfilledResult<any>).value);

      setBalances(filtered);
    };

    fetchBalances();
  }, [userAddress, publicClient]);

  return { balances };
};
