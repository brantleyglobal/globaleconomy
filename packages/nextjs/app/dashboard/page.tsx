// app/page.tsx
import { mockTransactions } from "~~/components/common/transactions";
import { TokenBalancesPanel } from "~~/components/balances/tokenBalancesPanel";
import { TransactionHistory } from "~~/components/transactions/transactionHistory";



export default function Dashboard() {
  const transactions = []; // Fetch this from your backend or JSON mock

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-4 bg-black">
        <TransactionHistory transactions={mockTransactions} />
        <TokenBalancesPanel />
    </div>
  );
}
