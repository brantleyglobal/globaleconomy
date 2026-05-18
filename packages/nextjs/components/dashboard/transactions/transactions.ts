// types.ts
export interface Transaction {
  paymentmethod: string;
  timestamp: string;
  chainstatus: boolean;
  useraddress: string;

  //Transfers
  sender: string;
  recipient: string;
  token: string;

  // Purchases
  asset?: string;
  quantity?: number;
  amount?: string;
  affiliate?: string;
  commission?: string;
  payout?: string;

  // GBDo
  amountin?: string;
  amountout?: string;
  
  // Xchange
  tokena?: string;
  initiator: string;
  amounta?: string;
  tokenb?: string;
  counterparty: string;
  amountb?: string;
  contractaddress: string;
  refund: number;
  newcontract: number;

  // Vault
  depositstarttime?: string;
  committedquarters?: number;
  depositamount?: string;

  //Infra
  venture?: string;
}

export function formatAmount (value: string | bigint | null | undefined, decimals = 18): string {
  if (value == null) return "0";

  let big: bigint;
  try {
    if (typeof value === "bigint") big = value;
    else if (typeof value === "number") big = BigInt(value);
    else big = BigInt(value);
  } catch {
    return "0";
  }

  const base = 10n ** BigInt(decimals);

  //***Test DB Values***//
  if(big < base) {
    return big.toString();
  }

  //*** Live DB Values ***//
  const whole = big / base;
  const fraction = (big % base).toString().padStart(decimals,"0");
  const trimmed =  fraction.replace(/0+$/, "");

  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}
