// utils/receipt.ts
type ReceiptParams = {
  checkoutAsset?: {
    id: string;
    name: string;
  };
  quantity: number;
  paymentMethod: string;
  selectedCurrency: string;
  estimatedTotal: number;
  stripeConfirmation?: {
    id: string;
  };
  txhash?: string;
  userAddress?: string;
  deliveryDays: number;
  deliveryDeadline: string; // or Date if you're using Date objects
};


export const generateReceipt = ({
  checkoutAsset,
  quantity,
  paymentMethod,
  selectedCurrency,
  estimatedTotal,
  stripeConfirmation,
  txhash,
  userAddress,
  deliveryDays,
  deliveryDeadline,
}: ReceiptParams) => ({
  asset: {
    id: checkoutAsset?.id,
    name: checkoutAsset?.name,
  },
  quantity,
  payment: {
    method: paymentMethod,
    currency: selectedCurrency,
    amount: estimatedTotal,
    referenceId: stripeConfirmation?.id || txhash || null,
  },
  buyer: userAddress || "anonymous",
  delivery: {
    days: deliveryDays,
    deadline: deliveryDeadline,
  },
  timestamp: new Date().toISOString(),
});
