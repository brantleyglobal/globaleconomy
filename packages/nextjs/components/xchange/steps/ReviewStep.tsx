import React, { useState, useMemo } from "react";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { toast } from "react-hot-toast";
import { supportedTokens, Token } from "~~/components/constants/tokens";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { useXchangeHandler } from "~~/components/xchange/useXchangeHandler";
import { sendXchangeConfirmation } from "~~/components/email/sendXchangeEmail";

type AddressType = Address;

type ReviewType = "newContract" | "deposit" | "refund";

type Props = {
  xchangeId: string | undefined;
  setXchangeId: (val: string) => void;
  selectedTokenSymbolS: string;
  setSelectedTokenSymbolS: (v: string) => void;
  selectedTokenSymbol: string;
  setSelectedTokenSymbol: (val: string) => void;
  recipient?: string;
  setRecipient: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  userFirstName: string;
  setUserFirstName: (val: string) => void;
  userLastName: string;
  setUserLastName: (val: string) => void;
  userEmail: string;
  setUserEmail: (val: string) => void;
  recipient2?: string;
  setRecipient2: (v: string) => void;
  selectedTokenSymbol2: string;
  setSelectedTokenSymbol2: (val: string) => void;
  amount2: string;
  setAmount2: (v: string) => void;
  userFirstName2: string;
  setUserFirstName2: (val: string) => void;
  userLastName2: string;
  setUserLastName2: (val: string) => void;
  userEmail2: string;
  setUserEmail2: (val: string) => void;
  onBack: () => void;
  onHelpToggle: () => void;
  isConnected?: boolean;
  walletAddress?: string;
  openWalletModal?: () => void;
  reviewType: ReviewType;
  isRefundSelected: boolean;
  isNewContractSelected: boolean;
  onComplete: () => void;
};

export default function ReviewStep(props: Props) {
  const {
    selectedTokenSymbol,
    selectedTokenSymbol2,
    selectedTokenSymbolS,
    amount,
    amount2,
    recipient,
    recipient2,
    xchangeId,
    userFirstName,
    userLastName,
    userEmail,
    userFirstName2,
    userLastName2,
    userEmail2,
    onBack,
    onHelpToggle,
    reviewType,
    setXchangeId,
    setRecipient,
    setAmount,
    setUserFirstName,
    setUserLastName,
    setUserEmail,
    setRecipient2,
    setAmount2,
    setUserFirstName2,
    setUserLastName2,
    setUserEmail2,
    isRefundSelected,
    isNewContractSelected,
    onComplete,
  } = props;

  const [isProcessing, setIsProcessing] = useState(false);

  const selectedToken = useMemo(() => supportedTokens.find((t) => t.symbol === selectedTokenSymbol), [selectedTokenSymbol]);
  const selectedToken2 = useMemo(() => supportedTokens.find((t) => t.symbol === selectedTokenSymbol2), [selectedTokenSymbol2]);
  const selectedTokenS = useMemo(() => supportedTokens.find((t) => t.symbol === selectedTokenSymbolS), [selectedTokenSymbolS]);

  // Instantiate hook with necessary params from props
  const { send, loading } = useXchangeHandler({
    chainId: 0, // replace accordingly
    selectedToken,
    selectedToken2,
    selectedTokenS,
    amount,
    amount2,
    recipient,
    recipient2,
    xchangeId,
    isRefundSelected: reviewType === "refund",
    isNewContractSelected: reviewType === "newContract",
    openWalletModal: props.openWalletModal,
  });

  async function handleSend() {
    console.log("Processing");
    if (loading || isProcessing) return;
    setIsProcessing(true);
    const toastId = toast.loading("Processing transaction...");
    try {
      console.log("Xchange ID", xchangeId);
      const result = await send();
      if (!result?.success) {
        toast.error(`Xchange failed: ${result?.error || "Unknown error"}`, { id: toastId });
        setIsProcessing(false);
        return;
      }
      setXchangeId(result.xchangeId?.toString() || "");
      const receipt = result?.txHash || "";
      console.log("Sending Confirmation");

      const emailParams = {
        userFirstName,
        userLastName,
        userEmail,
        userFirstName2,
        userLastName2,
        userEmail2,
        asset: selectedToken,
        asset2: selectedToken2,
        serviceToken: selectedTokenS,
        amount: amount ?? "",
        amount2: amount2 ?? "",
        recipient: recipient ?? "",
        recipient2: recipient2 ?? "",
        xchangeId: result.xchangeId ?? xchangeId ?? "",
        refund: isRefundSelected ?? false,
        newContract: isNewContractSelected ?? false,
        receipt,
      };

      if (selectedToken && !isRefundSelected) {
        await sendXchangeConfirmation({ templateType: "createSwap", ...emailParams });
      } else if (((selectedToken2 && xchangeId) || (selectedToken && xchangeId)) && !isRefundSelected) {
        await sendXchangeConfirmation({ templateType: "joinSwap", ...emailParams });
      } else if (selectedToken && xchangeId && isRefundSelected === true) {
        await sendXchangeConfirmation({ templateType: "refundSwap", ...emailParams });
      }

    } catch (error: unknown) {
      let message = "Unknown error";
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === "object" && error !== null && "message" in error) {
        message = (error as { message: string }).message;
      } else if (typeof error === "string") {
        message = error;
      }
      toast.error(`Transfer failed: ${message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
      props.onComplete();

    }
  }

  const { address, isConnected } = useAccount();

  return (
    <div className="flex flex-col h-full space-y-2">
      <div className="flex justify-between items-center mb-4">
      <h3 className="text-xl font-light text-primary">REVIEW & CONFIRMATION</h3>
      <button
        onClick={onHelpToggle}
        aria-label="Toggle help"
        className="text-primary hover:text-secondary flex items-center gap-1"
      >
        <HelpOutlineIcon />
        
      </button>
      </div>
      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto p-2 space-y-2 text-sm">

        {/* Section: Exchange Details */}
        {reviewType === "newContract" && (
          <div className="max-h-[300px] overflow-y-auto rounded-lg p-4 py-2 bg-black/40 border border-secondary/30 hover:bg-secondary/10 transition-all">
            <p className="text-white/80 uppercase tracking-wide text-sm font-light">CONTRACT DETAILS</p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Service Payment Token: <span className="font-semibold text-white">{selectedTokenSymbolS || "—"}</span></p>
          </div>
        )}

        {/* Section: New Contract */}
        {/* Section: Initiant Info */}
        {reviewType === "newContract" && (
          <div className="max-h-[300px] overflow-y-auto rounded-lg p-4 py-2 bg-black/40 border border-secondary/30 hover:bg-secondary/10 transition-all">
            <p className="text-white uppercase tracking-wide text-sm font-light">INITIANT DETAILS</p>
            <p className="font-semibold text-xs text-white">First Name: <span className="font-semibold text-xs text-white">{userFirstName || "—"}</span></p>
            <p className="font-semibold text-xs text-white">Last Name: <span className="font-semibold text-xs text-white">{userLastName || "—"}</span></p>
            <p className="font-semibold text-xs text-white">Email: <span className="font-semibold text-xs text-white">{userEmail || "—"}</span></p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Wallet Address: <span className="font-semibold text-white">{recipient || "—"}</span></p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Token: <span className="font-semibold text-white">{selectedTokenSymbol || "—"}</span></p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Amount Offered: <span className="font-semibold text-white">{amount || "—"}</span></p>
          </div>
        )}

        {/* Section: Counterparty Info */}
        {reviewType === "newContract" && (
          <div className="max-h-[300px] overflow-y-auto rounded-lg p-4 py-2 bg-black/40 border border-secondary/30 hover:bg-secondary/10 transition-all">
            <p className="text-white uppercase tracking-wide text-sm font-light">COUNTERPARTY DETAILS</p>
            <p className="font-semibold text-xs text-white">First Name: <span className="font-semibold text-xs text-white">{userFirstName2|| "—"}</span></p>
            <p className="font-semibold text-xs text-white">Last Name: <span className="font-semibold text-xs text-white">{userLastName2 || "—"}</span></p>
            <p className="font-semibold text-xs text-white">Email: <span className="font-semibold text-xs text-white">{userEmail2 || "—"}</span></p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Wallet Address: <span className="font-semibold text-white">{recipient2 || "—"}</span></p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Token: <span className="font-semibold text-white">{selectedTokenSymbol2 || "—"}</span></p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Amount Offered: <span className="font-semibold text-white">{amount2 || "—"}</span></p>
          </div>
        )}

        {/* Section: Deposit */}
        {/* Section: Depositor Info I Need Conditional*/}
        {reviewType === "deposit" && (
          <div className="max-h-[300px] overflow-y-auto rounded-lg p-4 py-2 bg-black/40 border border-secondary/30 hover:bg-secondary/10 transition-all">
            <p className="text-white/80 uppercase tracking-wide text-sm font-light">CONTRACT DETAILS</p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Xchange Id: <span className="font-semibold text-white">{xchangeId || "—"}</span></p>
          </div>
        )}
        {reviewType === "deposit" && (
          <div className="max-h-[300px] overflow-y-auto rounded-lg p-4 py-2 bg-black/40 border border-secondary/30 hover:bg-secondary/10 transition-all">
            <p className="text-white uppercase tracking-wide text-sm font-light">DEPOSITOR DETAILS</p>
            <p className="font-semibold text-xs text-white">First Name: <span className="font-semibold text-xs text-white">{userFirstName || "—"}</span></p>
            <p className="font-semibold text-xs text-white">Last Name: <span className="font-semibold text-xs text-white">{userLastName || "—"}</span></p>
            <p className="font-semibold text-xs text-white">Email: <span className="font-semibold text-xs text-white">{userEmail || "—"}</span></p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Wallet Address: <span className="font-semibold text-white">{address || "—"}</span></p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Token: <span className="font-semibold text-white">{selectedTokenSymbol || "—"}</span></p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Amount to Deposit: <span className="font-semibold text-white">{amount || "—"}</span></p>
          </div>
        )}

        {/* Section: Refund I Need Conditional*/}
        {/* Section: Refundee Info */}
        {reviewType === "refund" && (
          <div className="max-h-[300px] overflow-y-auto rounded-lg p-4 py-2 bg-black/40 border border-secondary/30 hover:bg-secondary/10 transition-all">
            <p className="text-white/80 uppercase tracking-wide text-sm font-light">CONTRACT DETAILS</p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Xchange ID: <span className="font-semibold text-white">{xchangeId || "—"}</span></p>
          </div>
        )}
        {reviewType === "refund" && (
          <div className="max-h-[300px] overflow-y-auto rounded-lg p-4 py-2 bg-black/40 border border-secondary/30 hover:bg-secondary/10 transition-all">
            <p className="text-white uppercase tracking-wide text-sm font-light">RECIPIENT DETAILS</p>
            <p className="font-semibold text-xs text-white">First Name: <span className="font-semibold text-xs text-white">{userFirstName || "—"}</span></p>
            <p className="font-semibold text-xs text-white">Last Name: <span className="font-semibold text-xs text-white">{userLastName || "—"}</span></p>
            <p className="font-semibold text-xs text-white">Email: <span className="font-semibold text-xs text-white">{userEmail || "—"}</span></p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Wallet Address: <span className="font-semibold text-white">{address || "—"}</span></p>
            <p className="text-white/80 tracking-wide text-xs font-semibold">Token: <span className="font-semibold text-white">{selectedTokenSymbol || "—"}</span></p>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      {/* Right: Previous + Next buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-4 py-4 border-t bg-transparent w-full">
        <button
          className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
          onClick={onBack}
          >
          Previous
        </button>
        <button
          className="btn bg-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
          onClick={handleSend}
          disabled={isProcessing}
          >
          {isProcessing ? (
              <span className="loading loading-spinner loading-sm">Processing...</span>
          ) : (
              <BanknotesIcon className="h-5 w-4 shrink-0" />
          )}
          {isProcessing ? "Processing..." : "CONFIRM"}
        </button>
      </div>
    </div>
  );
}
