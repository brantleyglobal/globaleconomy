import { useState, useEffect } from "react";
import { createPublicClient, http, erc20Abi } from "viem";
import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";
import type { Token } from "~~/components/constants/tokens";

export function useTokenBalance(userAddress: string | undefined, token: Token) {
  const [balance, setBalance] = useState<bigint | null>(null);

  useEffect(() => {
    // Exit early if no userAddress, avoids unnecessary calls
    if (!userAddress) {
      setBalance(null);
      return;
    }

    async function fetchBalance() {
      try {
        const publicClient = createPublicClient({
          chain: GLOBALCHAIN,
          transport: http(),
        });

        if (token.isNative) {
          // Non-null assertion userAddress! safe here because checked above
          const nativeBalance = await publicClient.getBalance({ address: userAddress! });
          setBalance(nativeBalance);
        } else if (token.address) {
          const erc20Balance = await publicClient.readContract({
            address: token.address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [userAddress!],
          });

          if (typeof erc20Balance === "bigint") {
            setBalance(erc20Balance);
          } else if (typeof erc20Balance === "string") {
            setBalance(BigInt(erc20Balance));
          } else {
            throw new Error("Unexpected balance type returned");
          }
        } else {
          setBalance(null);
        }
      } catch (err) {
        console.error("Failed to fetch token balance:", err);
        setBalance(null);
      }
    }

    fetchBalance();
  }, [userAddress, token]);

  return balance;
}
