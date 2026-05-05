import { create } from "zustand";
import { Region } from "~~/components/shipping/shippingRates";

export type CheckoutAsset = {
  id: number;
  name: string;
  metadataCID: string;
  basePriceInGBDo: BigInt;
  baseDays: number;
  perUnitDelay: number;
  variant: "eseries" | "xseries";
};

export type ShippingInfo = {
  firstname: string;
  lastname: string;
  address: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  promo: string;
  region?: Region | "";
};

type PaymentMethod = "native" | "stable" | "cash" | "paypal" | "applepay" | "klarna" | "affirm" | "afterpay";
type cardType = "debit" | "credit" | null;

export type CheckoutState = {
  asset: CheckoutAsset | null;
  quantity: number;
  tokenSymbol: string;
  estimatedTotal: string;
  estimatedEscrow: string;
  buyer: string;
  paymentMethod: PaymentMethod;
  cardType: cardType;
  voltage: string | null;
  frequency?: "50Hz" | "60Hz" | null;
  phase?: "Single-Phase" | "Split-Phase" | "3-Phase" | null;
  reactor?: "Default (None)" | "Line Reactor(s)" | null;
  stripeSessionId: string | null;
  stripeConfirmation: any | null;
  txhash: string | undefined;
  userAddress?: string | null;
  transactionStatus?: "idle" | "accepted" | "confirmed" | "failed" | "queued" | null;
  userOpHash?: string;
  ipfsCid?: string;
  buyModalOpen: boolean;
  currentStep: number;
  shippingInfo?: ShippingInfo;
  reset: () => void;

  setField: <K extends keyof CheckoutState>(key: K, value: CheckoutState[K]) => void;
};



export const useCheckoutStore = create<CheckoutState>((set) => ({
  asset: null,
  quantity: 1,
  tokenSymbol: "GBDo",
  estimatedTotal: "0.00",
  estimatedEscrow: "0.00",
  buyer: "",
  paymentMethod: "native",
  cardType: null,
  voltage: null,
  frequency: null,
  phase: null,
  reactor: null,
  stripeSessionId: null,
  stripeConfirmation: null,
  userAddress: "",
  txhash: undefined,
  transactionStatus: null,
  buyModalOpen: false,
  currentStep: 0,
  shippingInfo: {
    firstname: "",
    lastname: "",
    address: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    promo: "",
    region: "",
  },

  setField: (key, value) => set({ [key]: value }),

  reset: () =>
    set({
      asset: null,
      quantity: 1,
      tokenSymbol: "GBDo",
      estimatedTotal: "0.00",
      estimatedEscrow: "0.00",
      buyer: "",
      paymentMethod: "native",
      cardType: null,
      voltage: null,
      frequency: null,
      phase: null,
      reactor: null,
      stripeSessionId: null,
      stripeConfirmation: null,
      userAddress: null,
      txhash: undefined,
      transactionStatus: null,
      shippingInfo: {
        firstname: "",
        lastname: "",
        address: "",
        phone: "",
        email: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        promo: "",
        region: "",
      },
    }),
}));