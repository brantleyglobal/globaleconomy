import { useEffect, useState } from "react";
import { Address } from "viem";
import { usePublicClient } from "wagmi";
import { erc20Abi } from "viem";
import { supportedTokens, dividendTokens } from "~~/components/constants/tokens";
import deployments from "~~/lib/contracts/deployments.json";
import type { PublicClient } from 'viem';
import { createPublicClient, http } from 'viem';
import { mainnet, polygon } from 'viem/chains';
import { GLOBALCHAIN } from '~~/utils/globalEco/customChains';

const myChainPublicClient = createPublicClient({
  chain: GLOBALCHAIN,
  transport: http('https://rpc.brantley-global.com'),
});

type TokenBalance = {
  symbol: string;
  address: Address;
  decimals: number;
  balance: bigint;
  isNative?: boolean;
};

const myChainSupportedTokenAddresses = new Set<Address>([
  deployments.Copian,
  deployments.GlobalDollarX,
  deployments.GlobalDollar,
  deployments.BGFFS,
  deployments.BGFRS,
  deployments.TGMX,
  deployments.TGUSA,
  deployments.Globe,
  ...dividendTokens.map(t => t.address as Address),
]);

const polyAddresses = new Set<Address>([
  "0x5C067C80C00eCd2345b05E83A3e758eF799C40B5",
  "0x6AE7Dfc73E0dDE2aa99ac063DcF7e8A63265108c",
]);

type Token = {
  name: string;
  symbol: string;
  address: Address;
  decimals: number;
  isNative?: boolean;
};

type NormalizedToken = Omit<Token, "isNative"> & { isNative: boolean };

function normalizeTokens(tokens: Token[]): NormalizedToken[] {
  return tokens.map(token => ({
    ...token,
    isNative: token.isNative ?? false,  // if undefined, set false
  }));
}

export const useDirectTokenBalances = (
  userAddress?: Address,
  myChainPublicClient?: PublicClient
) => {
  const [balances, setBalances] = useState<TokenBalance[]>([]);

  useEffect(() => {
    async function fetchBalancesForTokens(tokens: typeof supportedTokens, client: PublicClient) {
      if (!userAddress) return [];
      const results = await Promise.allSettled(
        tokens.map(async (token) => {
          if (token.isNative) {
            const balance = await client.getBalance({ address: userAddress });
            return {
              symbol: token.symbol,
              address: token.address,
              decimals: token.decimals,
              balance,
            };
          } else {
            // Call readContract method on the publicClient instance
            const balance = await client.readContract({
              address: token.address,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [userAddress],
            });
            return {
              symbol: token.symbol,
              address: token.address,
              decimals: token.decimals,
              balance,
            };
          }
        }),
      );

      results.forEach(r => {
        if (r.status === "rejected") {
          console.error("Balance fetch failed:", r.reason);
        }
      });

      return results
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<TokenBalance>).value)
        .filter((token) => token.balance > 0n);
    }

    async function fetchAllBalances() {
      if (!userAddress || !myChainPublicClient) return;

      const myChainTokens = normalizeTokens([
        ...dividendTokens,
        ...supportedTokens.filter(t => myChainSupportedTokenAddresses.has(t.address)),
      ]);

      const [myChainBalances] = await Promise.all([
        fetchBalancesForTokens(myChainTokens, myChainPublicClient),
      ]);

      setBalances([...myChainBalances ]);
    }

    fetchAllBalances();
  }, [userAddress, myChainPublicClient]);

  return { balances };
};
