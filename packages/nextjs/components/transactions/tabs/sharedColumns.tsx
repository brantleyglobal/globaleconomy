"use client";

// SharedColumns.tsx
import type { Transaction } from "~~/components/transactions/transactions";

export const SharedColumns = ({ tx }: { tx: Transaction }) => (
  <>
    <td>{tx.timestamp}</td>
    <td>{tx.chainstatus ? "Completed" : "Pending"}</td>
  </>
);
