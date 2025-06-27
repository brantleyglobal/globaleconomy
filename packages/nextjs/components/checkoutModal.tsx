import { Modal } from "./common/modal";
import { useAccount, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import React, { useEffect, useState } from "react";
import { PurchaseSummaryPreview } from "~~/components/purchasePreview";
import { useCheckoutStore } from "~~/components/useCheckoutStore";
import abi from "~~/lib/abi/assetPurchaseAbi.json";
import deployments from "../../hardhat/deployments.json";
import { Web3Storage, File } from "../../../node_modules/web3.storage";
import { ethers } from "ethers";
import { BrowserProvider } from "ethers";
import { Interface } from "ethers";
import {AssetSummary} from "~~/lib/asset"
import { useScaffoldWriteContract } from "~~/hooks/globalDEX/useScaffoldWriteContract";





type CheckoutModalProps = {
  onClose: () => void;
  asset: {
    assetId: number;
    name: string;
  };
  selectedCurrency: string;
};

const CheckoutModal: React.FC<CheckoutModalProps> = ({ onClose, asset, selectedCurrency }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [returnsAccepted, setReturnsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [selectedToken] = useState<"native" | "stable">("native");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [ipfsCid, setIpfsCid] = useState<string | null>(null);
  const [purchaseId, setPurchaseId] = useState<number | null>(null);

  const [termsText, setTermsText] = useState("");
  const [policyText, setPolicyText] = useState("");
  const [returnsText, setReturnsText] = useState("");

  const PURCHASE_CONTRACT_ADDRESS = deployments.AssetPurchase;
  const client = new Web3Storage({ token: process.env.NEXT_PUBLIC_WEB3STORAGE_TOKEN! });

  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  type ExtendedAsset = {
    id: number;
    name: string;
    metadataCID: string;
    priceInUSD: number;
    baseDays: number;
    perUnitDelay: number;
  };
  

  const {
    asset: checkoutAsset,
    quantity,
    tokenSymbol,
    estimatedTotal,
    estimatedEscrow,
  } = useCheckoutStore();

  const assetWithDelay = checkoutAsset as ExtendedAsset;

  const handleSubmitPurchase = async () => {
    try {
      const tx = await writeContractAsync({
        address: PURCHASE_CONTRACT_ADDRESS,
        abi: abi.abi,
        functionName: "purchase",
        args: [
          checkoutAsset?.id,
          quantity,
          selectedCurrency === "native" ? "0x0000000000000000000000000000000000000000" : selectedCurrency,
        ],
        value: selectedCurrency === "native" ? parseEther("1.0") : undefined,
      });

      const hash = tx as `0x${string}`;
      setTxHash(hash);

      setPurchaseId(purchaseId);// or use viem client

      // Simulate extracting purchase ID (adjust if using indexed logs directly)
      const provider = new BrowserProvider(window.ethereum);
      const receipt = await provider.waitForTransaction(hash);

      if (!receipt) {
        console.error("Transaction receipt not found.");
        return;
}


      const iface = new Interface(abi.abi);

      receipt.logs.forEach(log => {
        try {
          const parsedLog = iface.parseLog(log);
          if (parsedLog?.name === "Purchased") {
            const extractedPurchaseId = parsedLog.args.purchaseId.toString();
            setPurchaseId(Number(extractedPurchaseId));
          }
        } catch {
          // Ignore logs that don’t match
        }
      });



      let extractedPurchaseId: string | null = null;
      if (!extractedPurchaseId) {
        console.warn("No Purchased event found in logs");
        return;
      }

      setPurchaseId(Number(extractedPurchaseId));
      
      const summary = {
        purchaseId: Number(extractedPurchaseId),
        assetId: checkoutAsset?.id,
        buyer: address,
        quantity,
        token: selectedCurrency,
        txHash: hash,
        timestamp: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(summary)], { type: "application/json" });
      const cid = await client.put([new File([blob], `purchase-${extractedPurchaseId}.json`)]);
      setIpfsCid(cid);

      setCurrentStep(6);
    } catch (err) {
      console.error("Transaction failed:", err);
    }
  };

  const deliveryDays = (assetWithDelay.baseDays ?? 0) + (assetWithDelay.perUnitDelay ?? 0) * (quantity - 1);


  const estimatedDeadline = new Date(Date.now() + deliveryDays * 86400000)
    .toISOString()
    .split("T")[0];

  const estimatedFee =
    estimatedTotal && !isNaN(Number(estimatedTotal))
      ? ((Number(estimatedTotal) * 5) / 1_000_000).toFixed(6)
      : "0";


  const summaryProps = {
    assetName: checkoutAsset?.name || "N/A",
    assetId: Number(checkoutAsset?.id) || 0,
    metadataCID: checkoutAsset?.metadataCID || "",
    quantity,
    tokenSymbol,
    buyer: address || "0x0",
    estimatedTotal: estimatedTotal?.toString() || "0",
    estimatedEscrow: estimatedEscrow?.toString() || "0",
    deliveryDays,
    estimatedDeadline,
    estimatedFee,
    status: (txHash ? "confirmed" : "draft") as "confirmed" | "draft",
    txHash: txHash || "",
    summaryCID: ipfsCid || "",
  };


  useEffect(() => {
    fetch("/legal/terms-conditions.txt").then(res => res.text()).then(setTermsText);
    fetch("/legal/privacy-policy.txt").then(res => res.text()).then(setPolicyText);
    fetch("/legal/refund-returns.txt").then(res => res.text()).then(setReturnsText);
  }, []);

  return (
    <Modal isOpen={true} onClose={onClose} title="Complete Checkout">
      <div className="space-y-4 h-[600px] flex flex-col">
        {currentStep === 1 && (
          <>
            <h3 className="text-lg font-semibold">Terms & Conditions</h3>
            <div className="flex-1 overflow-y-auto text-sm border p-2 text-justify rounded bg-black">
              {termsText || "Loading…"}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={termsAccepted} onChange={() => setTermsAccepted(!termsAccepted)} />
              I agree to the Terms & Conditions
            </label>
            <div className="flex justify-end">
              <button className="btn btn-primary btn-sm" disabled={!termsAccepted} onClick={() => setCurrentStep(2)}>
                Next
              </button>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <h3 className="text-lg font-semibold">Returns & Refunds</h3>
            <div className="flex-1 overflow-y-auto text-sm border p-2 text-justify rounded bg-black">
              {returnsText || "Loading…"}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={returnsAccepted} onChange={() => setReturnsAccepted(!returnsAccepted)} />
              I agree to the Returns & Refund Policy
            </label>
            <div className="flex justify-end">
              <button className="btn btn-primary btn-sm" disabled={!returnsAccepted} onClick={() => setCurrentStep(3)}>
                Next
              </button>
            </div>
          </>
        )}

        {currentStep === 3 && (
          <>
            <h3 className="text-lg font-semibold">Privacy Policy</h3>
            <div className="flex-1 overflow-y-auto text-sm border p-2 text-justify rounded bg-black">
              {policyText || "Loading…"}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={privacyAccepted} onChange={() => setPrivacyAccepted(!privacyAccepted)} />
              I agree to the Privacy Policy
            </label>
            <div className="flex justify-end">
              <button className="btn btn-primary btn-sm" disabled={!privacyAccepted} onClick={() => setCurrentStep(4)}>
                Next
              </button>
            </div>
          </>
        )}

        {currentStep === 4 && (
          <>
            <h3 className="text-lg font-semibold">Smart Contract Summary</h3>
            <div className="flex-1 overflow-y-auto text-sm border p-2 text-justify rounded bg-black">
              <PurchaseSummaryPreview {...summaryProps} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={contractAccepted} onChange={() => setContractAccepted(!contractAccepted)} />
              I accept the Smart Contract terms
            </label>
            <div className="flex justify-end">
              <button className="btn btn-primary btn-sm" disabled={!contractAccepted} onClick={() => setCurrentStep(5)}>
                Next
              </button>
            </div>
          </>
        )}

        {/* Step 5 - Confirm */}
        {currentStep === 5 && (
          <>
            <h3 className="text-lg font-semibold">Confirm and Checkout</h3>
            <div className="flex-1 overflow-y-auto text-sm border p-3 rounded bg-black space-y-2">
              <p>
                Payment Method:{" "}
                <strong>{selectedToken === "native" ? "GBD" : "USDC"}</strong>
              </p>
              <p>
                Estimated Total:{" "}
                <strong>{estimatedTotal} {tokenSymbol}</strong>
              </p>
              <p>
                Protocol Fee:{" "}
                <strong>{estimatedFee} {tokenSymbol}</strong>
              </p>
              <hr className="my-2 border-gray-700" />
              <p>
                Product: <strong>{assetWithDelay?.name}</strong>
              </p>
              <p>Asset ID: {assetWithDelay?.id}</p>
              <hr className="my-2 border-gray-700" />
              <p>
                Expected Delivery Time:{" "}
                <strong>{deliveryDays} day{deliveryDays === 1 ? "" : "s"}</strong>
              </p>
              <p>
                Estimated Delivery Deadline: <strong>{estimatedDeadline}</strong>
              </p>
            </div>
            <div className="flex justify-end">
              <button className="btn btn-success btn-sm" onClick={handleSubmitPurchase}>
                Confirm Purchase
              </button>
            </div>
          </>
        )}


        {currentStep === 6 && (
          <>
            <h3 className="text-lg font-semibold">Purchase Complete</h3>
            <div className="flex-1 overflow-y-auto text-sm border p-3 rounded bg-black space-y-2">
              <p>
                <strong>Transaction Confirmed</strong>
              </p>
              <p>
                Purchase ID: <strong>{purchaseId}</strong>
              </p>
              <p>
                Transaction Hash:{" "}
                <a
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  className="underline text-blue-500"
                >
                  View on Etherscan
                </a>
              </p>
              {ipfsCid ? (
                <p>
                  IPFS Receipt:{" "}
                  <a
                    href={`https://ipfs.io/ipfs/${ipfsCid}`}
                    target="_blank"
                    className="underline text-blue-500"
                  >
                    View on IPFS
                  </a>
                </p>
              ) : (
                <p className="italic text-gray-400">Generating IPFS receipt…</p>
              )}
            </div>
            <div className="flex justify-end">
              <button className="btn btn-sm" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}

      </div>
    </Modal>
  );
};

export default CheckoutModal;
 