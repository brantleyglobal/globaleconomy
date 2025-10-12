"use client";

import { useState } from "react";
import { ethers, ContractReceipt, Contract } from "ethers";
import smartVaultabi from "~~/lib/contracts/abi/SmartVault.json";
import deployments from "~~/lib/contracts/deployments.json";
import { erc20Abi } from "viem";

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
}

export function useRedemptionHandler(config: TransferHandlerProps) {
  const {
    sender = "",
    chainId = 0,
    selectedToken = {},
    available = 0n,
    openWalletModal,
    signature,
  } = config;

  const [loading, setLoading] = useState(false);

  const send = async () => {
    const processedAt = new Date().toISOString();

    if (!sender || !chainId || selectedToken.decimals == null) {
      openWalletModal?.();
      return;
    }

    let txhash = "";
    let receipt: ContractReceipt | null = null;
    let payoutFormatted = ""; 

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
      
      const date = new Date();
      const year = date.getFullYear() % 100;  // last two digits
      const month = date.getMonth();           // 0-based
      const quarter = Math.floor(month / 3) + 1;

      // Get start date of quarter
      const quarterStartMonth = (quarter - 1) * 3;
      const quarterStartDate = new Date(date.getFullYear(), quarterStartMonth, 1);

      // Calculate day difference (1-based)
      const msPerDay = 1000 * 60 * 60 * 24;
      const diffInMs = date.getTime() - quarterStartDate.getTime();
      const day = Math.floor(diffInMs / msPerDay) + 1;

      // day is between 1 and ~91 depending on the quarter length (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)

      const dayPadded = day.toString().padStart(2, '0');
      const termCodeStr = `${year}${quarter}${dayPadded}`;

      if (!selectedToken.address) {
        throw new Error("Token address is missing");
      }

      const abi = [
        "function unlockQuarter() view returns (uint16)",
      ];

      const abi2 = [
        "function comingQuarter() view returns (uint16)",
      ];

      const contract = new ethers.Contract(selectedToken.address, abi, provider)
      const contract2 = new ethers.Contract(selectedToken.address, abi2, provider)
      const unlockQuarterRaw = await contract.unlockQuarter();
      const comingQuarterRaw = await contract2.comingQuarter();

      const termCodeNum = parseInt(termCodeStr, 10);
      const unlockQuarterNum = Number(unlockQuarterRaw);
      const comingQuarterNum = Number(comingQuarterRaw);

      try {

        if (termCodeNum <= unlockQuarterNum || unlockQuarterNum >= comingQuarterNum) {
          throw new Error("Withdrawal not allowed. Term conditions not met.");
          console.log("Withdrawal not allowed: Term conditions not met.");
        }
        const stablecoinContract = new Contract(selectedToken.address, erc20Abi, signer);
        const balanceBefore = await stablecoinContract.balanceOf(signerAddress);
        const vaultContract = new Contract(deployments.SmartVault, smartVaultabi.abi, signer);
  
        const allowance = await stablecoinContract.allowance(signerAddress, deployments.SmartVault);
        console.log("Stablecoin allowance:", allowance);
        if (allowance < balanceBefore) {
          console.log("Approving vault to spend stablecoin...");
          const approveTx = await stablecoinContract.approve(deployments.SmartVault, balanceBefore);
          await approveTx.wait();
          console.log("Stablecoin approved");
        } else {
          console.log("Stablecoin allowance sufficient");
        }
        const tokenTx = await vaultContract.withdraw(selectedToken.address, termCodeStr, balanceBefore);
        txhash = tokenTx.hash;
        receipt = await tokenTx.wait();
        console.log("Token transfer confirmed");

        if (receipt && receipt.events) {
          const payoutEvent = receipt.events.find((e) => e.event === "PayoutMade");
          if (payoutEvent && payoutEvent.args) {
            const payoutValue = payoutEvent.args.payout;
            payoutFormatted = ethers.utils.formatUnits(payoutValue, 18);
            console.log("Payout value:", payoutFormatted);
          }
        }
      } catch (error) {
        console.error("Token transfer failed:", error);
      }

      const redemptionPayload = {
        txhash,
        contractaddress: deployments["SmartVault"],
        useraddress: sender,
        amount: payoutFormatted,
        asset: selectedToken.symbol,
        status: "accepted",
        chainstatus: true,
        queuedat: processedAt,
        processedat: null,
        priority: 0,
        retrycount: 0,
        receipthash: receipt?.blockHash ?? "",
        notes: "Transfer Successful",
        timestamp: new Date().toISOString(),
      };

      //console.log("Transfer Payload:", transferPayload);

      try {
        const res = await fetch("https://gateway.brantley-global.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET! // optional, if your Worker requires it
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "redemptions",
            method: "redeemToken",
            params: redemptionPayload
          }),
        });

        const contentType = res.headers.get("Content-Type") ?? "";
        if (res.ok && contentType.includes("application/json")) {
          const result = await res.json();
        }
      } catch (nestedErr: any) {
        console.error("Error reporting failed:", nestedErr);
      }

      return {
        success: true,
        txHash: txhash,
        receiptHash: "",
        amount: "",
        token: selectedToken.symbol ?? "unknown",
        status: "queued",
      };
    } catch (err: any) {
      console.error("Transfer error:", err);

      const errorPayload = {
        txhash: "",
        contractaddress: "",
        useraddress: sender,
        asset: selectedToken.symbol ?? "unknown",
        amount: "",
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
            id: "redemptions",
            method: "redeemToken",
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
