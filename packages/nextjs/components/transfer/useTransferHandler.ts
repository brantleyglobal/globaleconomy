"use client";

import { useState } from "react";
import { formatUnits } from "@ethersproject/units";
import { Interface } from "@ethersproject/abi";
import { ethers, Contract } from "ethers";
import deployments from "~~/lib/contracts/deployments.json";
import tranferTrackABI from "~~/lib/contracts/abi/TransferTracker.json"
import erc20Abi from '@openzeppelin/contracts/build/contracts/ERC20.json';

interface TokenType {
  address?: string;
  symbol?: string;
  decimals?: number;
  isNative?: boolean;
}

interface TransferHandlerProps {
  sender?: string;
  chainId?: number;
  signature: string;
  selectedToken?: TokenType;
  available?: bigint;
  openWalletModal?: () => void;
  setRecipient?: (val: string | undefined) => void;
  setSendValue?: (val: string) => void;
}

export function useTransferHandler(config: TransferHandlerProps) {
  const {
    sender = "",
    chainId = 0,
    selectedToken = {},
    available = 0n,
    openWalletModal,
    setRecipient,
    setSendValue,
    signature,
  } = config;

  const [loading, setLoading] = useState(false);

  const send = async (recipient?: string, value?: string) => {
    const processedAt = new Date().toISOString();

    if (!sender || !chainId || selectedToken.decimals == null) {
      openWalletModal?.();
      return;
    }

    if (!recipient || !value) {
      return;
    }

    const amount = Number(value);
    const dbval = amount.toFixed(2);
    const availableInDecimal = parseFloat(formatUnits(available, 18));
    const baseAmount = parseFloat(value);
    const totalAmount = (baseAmount * 1.0025).toFixed(6);

    if (amount > availableInDecimal) {
      return;
    }

    try {

      // Setup
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const signerAddress = await signer.getAddress();
      console.log("Connected wallet:", signerAddress);

      const network = await provider.getNetwork();
      console.log("Connected to chain:", network.chainId);

      // Determine if it's an ERC-20 token
      const isERC20 = selectedToken.symbol !== "GBDO" && !!selectedToken.address;
      const parsedValue = ethers.utils.parseUnits(totalAmount, 18);

      let txhash = "";
      let receipt: ethers.providers.TransactionReceipt | null = null;

      if (isERC20) {
        if (!selectedToken.address) {
          throw new Error("Token address is missing");
        }

        const iface = new Interface(tranferTrackABI.abi);

        const calldata = iface.encodeFunctionData("Transfer", [
          selectedToken.address,
          recipient,
          parsedValue,
        ]);

        const stablecoinContract = new Contract(selectedToken.address, erc20Abi.abi, signer);

        console.log("Approving vault to spend stablecoin...");
        const approveTx = await stablecoinContract.approve(deployments.AssetPurchase, parsedValue);
        await approveTx.wait();
        console.log("Stablecoin approved");

        const tx = await signer.sendTransaction({
          to: recipient,
          value: 0,
          gasLimit: ethers.BigNumber.from(21_000),
        });

        txhash = tx.hash;
        receipt = await tx.wait();
        console.log("Native transfer confirmed");

      } else {
        try {
          const tx = await signer.sendTransaction({
            to: recipient,
            value: parsedValue,
            gasLimit: ethers.BigNumber.from(21_000),
          });

          txhash = tx.hash;
          receipt = await tx.wait();
          console.log("Native transfer confirmed");
        } catch (error) {
          console.error("Native transfer failed:", error);
        }
      }

      const transferPayload = {
        txhash,
        contractaddress: deployments["TransferTracker"],
        sender,
        recipient,
        token: selectedToken.symbol ?? "unknown",
        amount: dbval,
        status: "accepted",
        chainstatus: true,
        queuedat: "",
        processedat: processedAt,
        priority: 0,
        retrycount: 0,
        receipthash: receipt?.transactionHash ?? "",
        notes: "Transfer Successful",
        timestamp: new Date().toISOString(),
      };

      try {
        const res = await fetch("https://gateway.brantley-global.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET! // optional, if your Worker requires it
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "transfers",
            method: "createTransfer",
            params: transferPayload
          }),
        });

        const contentType = res.headers.get("Content-Type") ?? "";
        if (res.ok && contentType.includes("application/json")) {
          const result = await res.json();
        }
      } catch (nestedErr: any) {
        console.error("Error reporting failed:", nestedErr);
      }

      setRecipient?.(undefined);
      setSendValue?.("");

      return {
        success: true,
        txHash: "",
        receiptHash: "",
        recipient,
        amount,
        token: selectedToken.symbol ?? "unknown",
        status: "queued",
      };
    } catch (err: any) {
      console.error("Transfer error:", err);

      const errorPayload = {
        txhash: "",
        contractaddress: "",
        sender,
        recipient: recipient ?? "",
        token: selectedToken.symbol ?? "unknown",
        amount: parseFloat(value ?? "0"),
        status: "failed",
        chainstatus: false,
        queuedat: processedAt,
        processedat: null,
        priority: 0,
        retrycount: 0,
        receipthash: "",
        notes: err.message ?? "Unknown error",
        timestamp: new Date().toISOString(),
      };

      try {
        const res = await fetch("https://gateway.brantley-global.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET! // optional, if your Worker requires it
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "transfers",
            method: "createTransfer",
            params: errorPayload
          }),
        });

        const contentType = res.headers.get("Content-Type") ?? "";
        if (res.ok && contentType.includes("application/json")) {
          const result = await res.json();
        }
      } catch (nestedErr: any) {
        console.error("Error reporting failed:", nestedErr);
      }

      return { success: false, error: err.message ?? "Unknown error" };
    }
  };

  return { send, loading };
}
