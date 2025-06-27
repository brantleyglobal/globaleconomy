// stores/useCheckoutStore.ts
import { create } from "zustand";

type CheckoutState = {
  asset: {
    id: number;
    name: string;
    metadataCID: string;
    priceInUSD: number;
  } | null;
  quantity: number;
  tokenSymbol: string;
  estimatedTotal: string;
  estimatedEscrow: string;
  buyer: string;
  setField: <K extends keyof CheckoutState>(key: K, value: CheckoutState[K]) => void;
  reset: () => void;
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  asset: null,
  quantity: 1,
  tokenSymbol: "USDC",
  estimatedTotal: "0.00",
  estimatedEscrow: "0.00",
  buyer: "",
  setField: (key, value) => set({ [key]: value }),
  reset: () =>
    set({
      asset: null,
      quantity: 1,
      tokenSymbol: "USDC",
      estimatedTotal: "0.00",
      estimatedEscrow: "0.00",
      buyer: "",
    }),
}));
