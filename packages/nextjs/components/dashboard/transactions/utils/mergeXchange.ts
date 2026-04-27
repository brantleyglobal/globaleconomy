type XchangeEventType = "contract" | "deposit" | "refund";

export interface XchangeEvent {
  swapId?: number;
  contractId?: number;
  type: XchangeEventType;
  timestamp: number;

  createdBy: string;
  partyA: string;
  partyB: string;

  amount?: number;
  token?: string;
}

export interface XchangeCard {
  id: number;
  createdBy: string;
  partyA: string;
  partyB: string;
  timestamp: number;

  contract: {
    timestamp: number;
  } | null;

  deposits: {
    amount: number;
    token: string;
    timestamp: number;
    party: "A" | "B";
  }[];

  refunds: {
    amount: number;
    token: string;
    timestamp: number;
    party: "A" | "B";
  }[];
}

export function mergeXchange(swaps: XchangeEvent[]): XchangeCard[] {
  const map: Record<number, XchangeCard> = {};

  for (const tx of swaps) {
    const id = tx.swapId ?? tx.contractId;
    if (id == null) continue;

    if (!map[id]) {
      map[id] = {
        id,
        createdBy: tx.createdBy,
        partyA: tx.partyA,
        partyB: tx.partyB,
        timestamp: tx.timestamp,
        contract: null,
        deposits: [],
        refunds: []
      };
    }

    if (tx.type === "contract") {
      map[id].contract = { timestamp: tx.timestamp };
    }

    if (tx.type === "deposit") {
      map[id].deposits.push({
        amount: tx.amount ?? 0,
        token: tx.token ?? "",
        timestamp: tx.timestamp,
        party: tx.createdBy === tx.partyA ? "A" : "B"
      });
    }

    if (tx.type === "refund") {
      map[id].refunds.push({
        amount: tx.amount ?? 0,
        token: tx.token ?? "",
        timestamp: tx.timestamp,
        party: tx.createdBy === tx.partyA ? "A" : "B"
      });
    }
  }

  return Object.values(map);
}