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
  amount?: number;

  // Swaps
  selectedtoken?: string;
  amountin?: number;
  amountout?: number;

  // Vault
  depositstarttime?: string;
  committedquarters?: number;
  depositamount?: number;
}
