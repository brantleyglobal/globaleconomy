"use client";

import { useState } from "react";
import { ethers, Contract, BrowserProvider } from "ethers";
import smartVaultabi from "~~/lib/contracts/abi/SmartVault.json";
import infraAbi from "~~/lib/contracts/abi/RegionInfrastructure.json";
import deployments from "~~/lib/contracts/deployments.json";
import { erc20Abi } from "viem";
import { Address } from "viem";
import { sendReconciliation } from "~~/lib/reconciliatonHelper";
import { Interface } from "@ethersproject/abi";

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
    setLoading(true);
    const processedAt = new Date().toISOString();

    if (!sender || !chainId || !selectedToken.decimals) {
      openWalletModal?.();
      setLoading(false);
      return { success: false, error: "Missing sender, chainId or token decimals" };
    }

    try {
      // Connect provider & signer from injected wallet (Metamask etc)
      if (!window.ethereum) {
        throw new Error("No Ethereum provider found. Please install MetaMask.");
      }
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // Determine if token is ERC20 (symbol not GBDo and address exists)
      const isERC20 = selectedToken.symbol !== "GBDo" && !!selectedToken.address;

      // Calculate current financial quarter term code (YYQDD format)
      const date = new Date();
      const year = date.getFullYear() % 100;
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const day = String(Math.floor((date.getTime() - new Date(date.getFullYear(), (quarter - 1) * 3, 1).getTime()) / 86400000) + 1).padStart(2, "0");
      const termCodeStr = `${year}${quarter}${day}`;

      if (!selectedToken.address) {
        throw new Error("Token address missing");
      }

      // Define ABIs for term queries
      const termAbi = ["function unlockQuarter() view returns (uint16)", "function comingQuarter() view returns (uint16)"];

      // Select vault or infrastructure contract address based on token symbol
      const contractAddress = ["GLB", "TGUSA", "TGMX"].includes(selectedToken.symbol!) ? deployments.RegionInfrastructure : deployments.SmartVault;

      // Contracts for term queries
      const contract = new ethers.Contract(selectedToken.address, termAbi[0], provider);
      const contract2 = new ethers.Contract(selectedToken.address, termAbi[1], provider);
      const unlockQuarterRaw = await contract.unlockQuarter();
      const comingQuarterRaw = await contract2.comingQuarter();

      const termCodeNum = parseInt(termCodeStr, 10);
      const unlockQuarterNum = Number(unlockQuarterRaw);
      const comingQuarterNum = Number(comingQuarterRaw);

      if (termCodeNum <= unlockQuarterNum || unlockQuarterNum >= comingQuarterNum) {
        throw new Error("Withdrawal not allowed. Term conditions not met.");
      }

      // Setup contracts for withdrawal
      const stablecoinContract = new Contract(selectedToken.address, erc20Abi, signer);
      const balanceBefore = await stablecoinContract.balanceOf(signerAddress);
      const vaultContract = new Contract(deployments.SmartVault, smartVaultabi.abi, signer);
      const infraContract = new Contract(deployments.RegionInfrastructure, infraAbi.abi, signer);

      let tokenTx, receipt;

      if (!["GLB", "TGUSA", "TGMX"].includes(selectedToken.symbol!)) {
        tokenTx = await vaultContract.withdraw(selectedToken.address, termCodeStr, balanceBefore);
        receipt = await tokenTx.wait();
      } else {
        tokenTx = await infraContract.withdraw(selectedToken.address, termCodeStr, balanceBefore);
        receipt = await tokenTx.wait();
      }

      if (!receipt) throw new Error("Transaction receipt is null");

      // Parse RedemptionFulfilled event logs to get amount to send
      const iface = new Interface(infraAbi.abi);
      let amountToSend: bigint | undefined;

      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
          if (parsed.name === "RedemptionFulfilled") {
            amountToSend = parsed.args.amount ?? parsed.args[0];
            break;
          }
        } catch { /* ignore non-matching logs */ }
      }

      if (!amountToSend) throw new Error("RedemptionFulfilled event not found");

      // Identify token chain and prepare reconciliation call
      const myChainAddresses = new Set<Address>([
        deployments.Copian,
        deployments.GlobalDollarX,
        deployments.GlobalDollar,
        deployments.BGFFS,
        deployments.BGFRS,
        deployments.TGMX,
        deployments.TGUSA,
        deployments.Globe,
      ]);

      const polyAddresses = new Set<Address>([
        "0x5C067C80C00eCd2345b05E83A3e758eF799C40B5",
      ]);

      const isOnMyChain = myChainAddresses.has(selectedToken.address as Address);
      const isOnPoly = polyAddresses.has(selectedToken.address as Address);
      const isBitcoin = selectedToken.symbol === "BTC";
      const isOnEthChain = !isOnMyChain && !isOnPoly && !isBitcoin;

      let signerForTransfer: string;

      if (isOnMyChain) signerForTransfer = "global";
      else if (isOnPoly) signerForTransfer = "polygon";
      else if (isBitcoin) signerForTransfer = "bitcoin";
      else if (isOnEthChain) signerForTransfer = "ethereum";
      else throw new Error("Unsupported token chain");

      // Call reconciliation endpoint asynchronously
      sendReconciliation({
        apiKey: process.env.NEXT_PUBLIC_API_SECRET!,
        to: signerAddress,
        amount: amountToSend.toString(),
        tokenAddress: selectedToken.address,
        chain: signerForTransfer,
      }).then(({ txHash, status }) => {
        console.log(`Redemption sent! Tx: ${txHash}, Status: ${status}`);
      }).catch(console.error);

      // Prepare payload for redemption logging
      const redemptionPayload = {
        txhash: tokenTx.hash,
        contractaddress: contractAddress,
        useraddress: sender,
        amount: amountToSend.toString(),
        asset: selectedToken.symbol,
        status: "accepted",
        chainstatus: true,
        queuedat: processedAt,
        processedat: null,
        priority: 0,
        retrycount: 0,
        receipthash: receipt.blockHash,
        notes: "Transfer Successful",
        timestamp: new Date().toISOString(),
      };

      // Log redemption to backend
      try {
        const res = await fetch("https://gateway.brantley-global.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "redemptions",
            method: "redeemToken",
            params: redemptionPayload,
          }),
        });
        if (res.ok) {
          await res.json();
        }
      } catch (nestedErr) {
        console.error("Error reporting redemption:", nestedErr);
      }

      setLoading(false);
      return {
        success: true,
        txHash: tokenTx.hash,
        receiptHash: receipt.blockHash,
        amount: amountToSend.toString(),
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
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "redemptions",
            method: "redeemToken",
            params: errorPayload,
          }),
        });
        if (res.ok) {
          await res.json();
        }
      } catch (nestedErr: any) {
        console.error("Error reporting failed redemption:", nestedErr);
      }

      setLoading(false);
      return { success: false, error: err.message ?? "Unknown error" };
    }
  };

  return { send, loading };
}
