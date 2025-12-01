import { useState } from "react";
import { useAccount } from "wagmi";
import { Address } from "viem";
import { useDirectTokenBalances } from "./directBalances";
import { TokenBalanceRow } from "./balanceRow";
import { usePublicClient } from "wagmi";

export function TokenBalancesPanel() {
  const { address: userAddress } = useAccount();
  const hexAddress = userAddress?.startsWith("0x") ? (userAddress as Address) : undefined;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  //API response:console.log("useradd: ", userAddress);

  const ethPublicClient = usePublicClient({ chainId: 1 });
  const polyPublicClient = usePublicClient({ chainId: 137 });
  const myChainPublicClient = usePublicClient({ chainId: 38391207 });

  const { balances } = useDirectTokenBalances(
    userAddress,
    myChainPublicClient
    //ethPublicClient,
    //polyPublicClient
  );

  const handleExpandToggle = (index: number) => {
    setExpandedIndex(prevIndex => (prevIndex === index ? null : index));
  };

  //console.log("Balance keys:", balances.map(b => `${b.chain}-${b.address}`));

  return (
    <section className="space-y-6">
      <h2 className="text-white text-xl px-2 font-light">BALANCES</h2>
      <p className="text-zinc-300 max-w-3xl px-2 text-sm">
        Available Ecosystem Balances For Connected Wallet.
      </p>
      <div className="overflow-x-auto rounded-md shadow">
        <table className="table table-zebra w-full text-sm bg-base-100">
          <thead className="bg-base-300 text-base-content">
            <tr>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((coin, i) => (
              <TokenBalanceRow
                key={`${coin.chain}-${coin.address}`} // Use stable and unique keys like contract address
                symbol={coin.symbol}
                decimals={coin.decimals}
                balance={coin.balance}
                tokenAddress={coin.address}
                isExpanded={expandedIndex === i}
                onExpand={() => handleExpandToggle(i)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
