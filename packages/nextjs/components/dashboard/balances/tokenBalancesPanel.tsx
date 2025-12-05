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

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // show 5 balances per page

  const paginatedBalances = balances.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  //console.log("Balance keys:", balances.map(b => `${b.chain}-${b.address}`));

  return (
    <section className="space-y-6">
      <h2 className="text-white text-xl px-2 font-light">BALANCES</h2>

      <div className="overflow-x-auto rounded-box shadow">
        <table className="table table-zebra w-full text-xs bg-base-100">
          <thead className="bg-base-300 text-base-content">
            <tr>
              <th>Connected Wallet Balances</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBalances.map((coin, i) => (
              <TokenBalanceRow
                key={`${coin.chain}-${coin.address}`}
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
      <div className="flex justify-center space-x-2 mt-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => p - 1)}
          className="px-2 py-1 text-xs bg-base-200 rounded disabled:opacity-50"
        >
          Prev
        </button>

        <span className="text-xs text-gray-400">
          Page {currentPage} of {Math.max(1, Math.ceil(balances.length / pageSize))}
        </span>

        <button
          disabled={currentPage >= Math.ceil(balances.length / pageSize)}
          onClick={() => setCurrentPage(p => p + 1)}
          className="px-2 py-1 text-xs bg-base-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  );
}
