import { useAccount } from "wagmi";
import { Address } from "viem";
import { useDirectTokenBalances } from "./directBalances";
import { TokenBalanceRow } from "./balanceRow";


export function TokenBalancesPanel() {
  const { address: userAddress } = useAccount();
  const hexAddress = userAddress?.startsWith("0x") ? (userAddress as Address) : undefined;

  const { balances } = useDirectTokenBalances(hexAddress);

  return (
    <div className="space-y-6">
      <h2 className="text-white text-xl font-light">BALANCES</h2>
      <p className="text-zinc-300 max-w-3xl text-sm">
        Available Balances For Connected Wallets.
      </p>

      <div className="overflow-x-auto rounded-box shadow">
        <table className="table table-zebra w-full text-sm bg-base-100">
          <thead className="bg-base-300 text-base-content">
            <tr>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((coin, i) => (
              <TokenBalanceRow
                key={i}
                symbol={coin.symbol}
                decimals={coin.decimals}
                balance={coin.balance}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
