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
  affiliate?: string;
  commission?: number;
  payout?: string;

  // GBDo
  stablein?: number;
  gbdout?: number;
  
  // Xchange
  selectedtokena?: string;
  initiator: string;
  amounta?: number;
  selectedtokenb?: string;
  counterparty: string;
  amountb?: number;
  contractaddress: string;
  refund: number;
  newcontract: number;

  // Vault
  depositstarttime?: string;
  committedquarters?: number;
  depositamount?: number;

  //Infra
  venture?: string;
}
