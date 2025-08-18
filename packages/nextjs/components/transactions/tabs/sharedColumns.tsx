"use client";

// SharedColumns.tsx
import type { Transaction } from "~~/types/transactions";

export const SharedColumns = ({ tx }: { tx: Transaction }) => (
  <>
    <td>{tx.timestamp}</td>
    <td>{tx.chainstatus ? "Completed" : "Pending"}</td>
  </>
);
