import { create } from "zustand";

export type CheckoutAsset = {
  id: number;
  name: string;
  metadataCID: string;
  basePriceInGBDO: BigInt;
  baseDays: number;
  perUnitDelay: number;
  variant: "eseries" | "xseries";
};

type PaymentMethod = "native" | "stable" | "cash";

export type CheckoutState = {
  asset: CheckoutAsset | null;
  quantity: number;
  tokenSymbol: string;
  estimatedTotal: string;
  estimatedEscrow: string;
  buyer: string;
  paymentMethod: PaymentMethod;
  voltage: number | null;
  frequency?: "50Hz" | "60Hz" | null;
  phase?: "Single-Phase" | "Split-Phase" | "3-Phase" | null;
  stripeSessionId: string | null;
  stripeConfirmation: any | null;
  txhash: string | undefined;
  userAddress?: string | null;
  transactionStatus?: "idle" | "accepted" | "confirmed" | "failed" | "queued" | null;
  userOpHash?: string;
  ipfsCid?: string;
  buyModalOpen: boolean;
  currentStep: number;
  reset: () => void;

  setField: <K extends keyof CheckoutState>(key: K, value: CheckoutState[K]) => void;
};



export const useCheckoutStore = create<CheckoutState>((set) => ({
  asset: null,
  quantity: 1,
  tokenSymbol: "GBDO",
  estimatedTotal: "0.00",
  estimatedEscrow: "0.00",
  buyer: "",
  paymentMethod: "native",
  voltage: null,
  frequency: null,
  phase: null,
  stripeSessionId: null,
  stripeConfirmation: null,
  userAddress: "",
  txhash: undefined,
  transactionStatus: null,
  buyModalOpen: false,
  currentStep: 0,

  setField: (key, value) => set({ [key]: value }),

  reset: () =>
    set({
      asset: null,
      quantity: 1,
      tokenSymbol: "GBDO",
      estimatedTotal: "0.00",
      estimatedEscrow: "0.00",
      buyer: "",
      paymentMethod: "native",
      voltage: null,
      frequency: null,
      phase: null,
      stripeSessionId: null,
      stripeConfirmation: null,
      userAddress: null,
      txhash: undefined,
      transactionStatus: null,
    }),
}));