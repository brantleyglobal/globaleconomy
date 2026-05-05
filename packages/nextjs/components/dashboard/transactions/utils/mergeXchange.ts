import type { Transaction } from "~~/components/dashboard/transactions/transactions";

type XchangeEventType = "contract" | "deposit" | "refund";

export interface XchangeCard {
  id: string;
  createdBy: string;
  partyA: string;
  partyB: string;
  timestamp: number;

  contract: {
    timestamp: number;
  } | null;

  deposits: {
    amount: string;
    token: string;
    timestamp: number;
    party: "A" | "B";
  }[];

  refunds: {
    amount: string;
    token: string;
    timestamp: number;
    party: "A" | "B";
  }[];
}

export function mergeXchange(swaps: Transaction[]): XchangeCard[] {
  const map: Record<string, XchangeCard> = {};

  const toBig = (v: string): bigint => {
    if (v == null) return 0n;
    if (typeof v === "bigint") return v;
    const trimmed = v.trim();
    try {
      return BigInt(trimmed);
    } catch {
      return 0n;
    }
  };

  for (const tx of swaps) {
    const id = tx.contractaddress;
    if (!id) continue;

    if (!map[id]) {
      map[id] = {
        id,
        createdBy: tx.useraddress ?? "",
        partyA: tx.initiator ?? "",
        partyB: tx.counterparty ?? "",
        timestamp: new Date(tx.timestamp).getTime(),
        contract: null,
        deposits: [],
        refunds: []
      };
      // attach a seen set to the card for dedupe across rows
      (map[id] as any).__seen = new Set<string>();
    }

    const card = map[id] as XchangeCard & { __seen?: Set<string> };

    const methods = (() => {
      try { return JSON.parse(tx.paymentmethod || "[]"); } catch { return []; }
    })();

    const tokenA = methods[0] ?? "";
    const tokenB = methods[1] ?? "";

    const ts = new Date(tx.timestamp).getTime();

    // contract creation marker (only set once)
    if (tx.newcontract === 1 && !card.contract) {
      card.contract = { timestamp: ts };
    }

    // helper to create a stable dedupe key
    const makeKey = (side: "A" | "B", amount: bigint, token: string, timestamp: number, kind: "deposit" | "refund") =>
      `${kind}|${side}|${amount}|${token}|${timestamp}`;

    // push deposit if positive and not seen
    const pushDeposit = (side: "A" | "B", raw: any, token: string) => {
      const amt = toBig(raw);
      if (!amt || amt <= 0) return;
      const key = makeKey(side, amt, token, ts, "deposit");
      if (card.__seen!.has(key)) return;
      card.__seen!.add(key);
      card.deposits.push({ amount: String(amt), token, timestamp: ts, party: side });
    };

    // push refund if non-zero and not seen (store positive)
    const pushRefund = (side: "A" | "B", raw: any, token: string) => {
      const amt = toBig(raw);
      if (!amt || amt <= 0) return;
      const key = makeKey(side, amt, token, ts, "refund");
      if (card.__seen!.has(key)) return;
      card.__seen!.add(key);
      card.refunds.push({ amount: String(amt), token, timestamp: ts, party: side });
    };

    // refunds rows
    if (tx.refund === 1) {
      pushRefund("A", tx.amounta, tokenA);
      pushRefund("B", tx.amountb, tokenB);
      continue;
    }

    // deposits
    pushDeposit("A", tx.amounta, tokenA);
    pushDeposit("B", tx.amountb, tokenB);
  }

  // cleanup: remove __seen and sort events
  for (const id of Object.keys(map)) {
    const c = map[id] as any;
    delete c.__seen;
    c.deposits.sort((a: any, b: any) => a.timestamp - b.timestamp);
    c.refunds.sort((a: any, b: any) => a.timestamp - b.timestamp);
  }

  return Object.values(map);
}