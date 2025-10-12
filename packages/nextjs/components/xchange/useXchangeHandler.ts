"use client";

import { useState } from "react";
import { Interface } from "@ethersproject/abi";
import { ethers, ContractReceipt, Contract } from "ethers";
import GlobalSwapabi from "~~/lib/contracts/abi/GlobalSwap.json";
import GlobalSwapFactoryabi from "~~/lib/contracts/abi/GlobalSwapFactory.json";
import deployments from "~~/lib/contracts/deployments.json";
import { erc20Abi } from "viem";
import { supportedTokens, Token } from "~~/components/constants/tokens";
import { Address as AddressType } from "viem";
import { getExchangeRates } from "~~/lib/exchangeRates";

interface TransferHandlerProps {
  sender?: string;
  chainId?: number;
  selectedToken?: Token;
  selectedToken2?: Token;
  selectedTokenS?: Token;
  amount?: string;
  amount2?: string;
  recipient?: AddressType;
  recipient2?: AddressType;
  xchangeId?: string;
  isRefundSelected?: boolean;
  isNewContractSelected?: boolean;
  openWalletModal?: () => void;
}

async function convertGbdoToSelectedTokenValue(
  selectedTokenSymbol: string,
  gbdoAmount: string,
): Promise<ethers.BigNumber | null> {
  // Find the selected token's decimals and symbol
  const token = supportedTokens.find((t) => t.symbol === selectedTokenSymbol);
  if (!token) {
    console.error("Token not found");
    return null;
  }

  // Override fixed rates for certain tokens
  let tokenRate: number | null = null;
  if (selectedTokenSymbol === "WBTC") {
    tokenRate = 26000.0;
  } else if (selectedTokenSymbol === "WETH") {
    tokenRate = 1600.0;
  }

  // Otherwise fetch dynamic rate
  if (tokenRate === null) {
    const { rates, gbdoRate } = await getExchangeRates();
    const rateData = rates.find((r) => r.symbol === selectedTokenSymbol);
    if (!rateData || !rateData.rateAgainstGBDO) {
      console.error("Token rate against GBDO not found or invalid");
      return null;
    }
    tokenRate = rateData.rateAgainstGBDO;
  }

  // Suppose GBDO decimals is 18 (adjust if different)
  const gbdoDecimals = 18;

  // Convert 10 GBDO to wei BigNumber
  const gbdoAmountInWei = ethers.utils.parseUnits(gbdoAmount, gbdoDecimals);

  if (!tokenRate || tokenRate <= 0) {
    console.error("Token rate against GBDO not found or invalid");
    return null;
  }

  // Calculate token amount by scaling appropriately
  // tokenAmount = (gbdoAmountInWei * 1e18) / (tokenRate * 1e18) simplified:
  // Actually: amount in token * rate against GBDO = GBDO amount
  // So token amount = GBDO amount / rateAgainstGBDO

  // Using BigNumber math
  const tokenDecimals = token.decimals ?? 18;

  // Convert tokenRate to BigNumber scaled by 18 decimals
  const rateBn = ethers.utils.parseUnits(tokenRate.toString(), 18);

  // tokenAmount = gbdoAmountInWei * 1e18 / rateBn
  // Use BigNumber operations: tokenAmount = gbdoAmountInWei.mul(1e18).div(rateBn)
  const scaleFactor = ethers.utils.parseUnits("1", 18);

  const tokenAmount = gbdoAmountInWei.mul(scaleFactor).div(rateBn);

  // Format tokenAmount to token decimals units
  const tokenAmountFormatted = ethers.utils.formatUnits(tokenAmount, tokenDecimals);

  return tokenAmount;
}

export function useXchangeHandler(config: TransferHandlerProps) {
  const {
    chainId = 0,
    selectedToken = {} as Token,
    selectedToken2 = {} as Token,
    selectedTokenS = {} as Token,
    amount = "",
    amount2 = "",
    recipient = undefined,
    recipient2 = undefined,
    xchangeId = "",
    isRefundSelected = false,
    isNewContractSelected = false,
    openWalletModal,
  } = config;

  const [loading, setLoading] = useState(false);

  const send = async () => {
    const processedAt = new Date().toISOString();
    console.log("Verifying Values");

    console.log("Is Contract?:...", isNewContractSelected);
    console.log("Is Refund?:...", isRefundSelected);
    console.log("Recipient...", recipient);
    console.log("Recipient2...", recipient2);
    console.log("Amount...", amount);
    console.log("Amount2...", amount2);
    console.log("Token...", selectedToken);
    console.log("Token2...", selectedToken2);
    console.log("Service Token...", selectedTokenS);

    /*if (!recipient || !chainId || selectedToken.decimals == null) {
      openWalletModal?.();
      return { success: false, error: "Missing recipient or chain info" };
    }*/
    console.log("SafeCheck...");

    let txhash = "";
    let receipt: ContractReceipt | null = null;
    let payoutFormatted = ""; 
    let swapAddress: string | undefined;
    let tokenTx2;

    try {
      console.log("Executing...");
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const signerAddress = await signer.getAddress();
      console.log("Connected wallet:", signerAddress);

      if (signerAddress === recipient && isNewContractSelected!) {
        console.log("Creating AssetXchange Contract");

        const stablecoinContract = new Contract(selectedTokenS.address, erc20Abi, signer);
        const assetcoinContract = new Contract(selectedToken.address, erc20Abi, signer);
        const assetcoinContract2 = new Contract(selectedToken2.address, erc20Abi, signer);
        const xchangeFactory = new Contract(deployments.GlobalSwapFactory, GlobalSwapFactoryabi.abi, signer);

        const amountInSelectedToken = await convertGbdoToSelectedTokenValue(selectedTokenS.symbol, "15");

        const iface = new Interface(GlobalSwapFactoryabi.abi);
        const parsedValue = ethers.utils.parseUnits(amount, selectedToken.decimals);
        const parsedValue2 = ethers.utils.parseUnits(amount2, selectedToken2.decimals);
        console.log("value1", parsedValue);
        console.log("value2", parsedValue2);

        // Approve stablecoin transfer
        const approveStableTx = await stablecoinContract.approve(deployments.GlobalSwapFactory, amountInSelectedToken);
        await approveStableTx.wait();
        console.log("Stablecoin approved");

        const tokenTx = await xchangeFactory.createSwap(
          selectedTokenS.address,
          recipient,
          recipient2,
          selectedToken.address,
          parsedValue,
          selectedToken2.address,
          parsedValue2,
          { gasLimit: 500_000 }
        );
        txhash = tokenTx.hash;
        receipt = await tokenTx.wait();
        console.log("AssetXchange creation confirmed");

        if (!receipt) throw new Error("Transaction receipt is null");

        // Parse logs to extract swapAddress
        for (const log of receipt.logs) {
          try {
            const mutableTopics = [...log.topics];
            const parsed = iface.parseLog({ topics: mutableTopics, data: log.data });
            if (parsed.name === "SwapCreated") {
              swapAddress = parsed.args.swapAddress ?? parsed.args[0];
              break;
            }
          } catch {
            // skip non-matching logs
          }
        }

        if (!swapAddress) throw new Error("SwapCreated event not found, missing swap address");

        const xchange = new Contract(swapAddress, GlobalSwapabi.abi, signer);

        // Approve asset coin
        const approveAssetTx = await assetcoinContract.approve(swapAddress, parsedValue);
        await approveAssetTx.wait();
        console.log("Assetcoin approved");
          
        tokenTx2 = await xchange.deposit({ gasLimit: 100_000 });
        txhash = tokenTx2.hash;
        receipt = await tokenTx2.wait();
        console.log("AssetXchange deposit confirmed");

        if (!receipt) throw new Error("Transaction receipt is null");
      
      } else if (xchangeId! && !isRefundSelected && !isNewContractSelected) {
        console.log("Depositing to Contract: ", xchangeId);

        const parsedValue = ethers.utils.parseUnits(amount, selectedToken.decimals);

        const assetcoinContract = new Contract(selectedToken.address, erc20Abi, signer);

        const approveAssetTx = await assetcoinContract.approve(xchangeId, parsedValue);
        await approveAssetTx.wait();
        console.log("Assetcoin approved");
        // Deposit existing swap
        const xchange = new Contract(xchangeId, GlobalSwapabi.abi, signer);
        const tokenTx = await xchange.deposit({
          gasLimit: 100_000,
        });
        txhash = tokenTx.hash;
        receipt = await tokenTx.wait();
        console.log("AssetXchange deposit confirmed");

        if (!receipt) throw new Error("Transaction receipt is null");

      } else if (xchangeId! && isRefundSelected!) {
        console.log("Refunding from Contract: ", xchangeId);
        // Deposit existing swap
        const xchange = new Contract(xchangeId, GlobalSwapabi.abi, signer);
        const tokenTx = await xchange.refund({
          gasLimit: 100_000,
        });
        txhash = tokenTx.hash;
        receipt = await tokenTx.wait();
        console.log("AssetXchange Refund confirmed");

        if (!receipt) throw new Error("Transaction receipt is null");
      } else if (signerAddress !== recipient && isNewContractSelected!) {

        const stablecoinContract = new Contract(selectedTokenS.address, erc20Abi, signer);
        const assetcoinContract = new Contract(selectedToken.address, erc20Abi, signer);
        const assetcoinContract2 = new Contract(selectedToken2.address, erc20Abi, signer);
        const xchangeFactory = new Contract(deployments.GlobalSwapFactory, GlobalSwapFactoryabi.abi, signer);

        const amountInSelectedToken = await convertGbdoToSelectedTokenValue(selectedTokenS.symbol, "15");
        // New swap xchange fallback
        const parsedValue = ethers.utils.parseUnits(amount, selectedToken.decimals);
        const parsedValue2 = ethers.utils.parseUnits(amount2, selectedToken2.decimals);

        const iface = new Interface(GlobalSwapFactoryabi.abi);

        const approveStableTx = await stablecoinContract.approve(deployments.GlobalSwapFactory, amountInSelectedToken);
        await approveStableTx.wait();
        console.log("Stablecoin approved");

        const tokenTx = await xchangeFactory.createSwap(
          selectedTokenS.address,
          recipient,
          recipient2,
          selectedToken.address,
          parsedValue,
          selectedToken2.address,
          parsedValue2,
          { gasLimit: 500_000 }
        );
        txhash = tokenTx.hash;
        receipt = await tokenTx.wait();
        console.log("AssetXchange creation confirmed");

        if (!receipt) throw new Error("Transaction receipt is null");

        // Parse logs
        for (const log of receipt.logs) {
          try {
            const mutableTopics = [...log.topics];
            const parsed = iface.parseLog({ topics: mutableTopics, data: log.data });
            if (parsed.name === "SwapCreated") {
              swapAddress = parsed.args.swapAddress ?? parsed.args[0];
              break;
            }
          } catch {
            // Ignore error for non-matching logs
          }
        }
      }

      let paymentmethod = "Unknown";
      if (selectedTokenS?.symbol) paymentmethod = selectedTokenS.symbol;
      else if (selectedToken2?.symbol) paymentmethod = selectedToken2.symbol;
      else if (selectedToken?.symbol) paymentmethod = selectedToken.symbol;

      if ( isNewContractSelected! ) {
        const xchangePayload = {
          txhash,
          contractaddress: swapAddress ?? xchangeId,
          useraddress: signerAddress,
          initiator: recipient || "",
          counterparty: recipient2 || "",
          amounta: amount ? parseFloat(amount) : null,
          amountb: amount2 ? parseFloat(amount2) : null,
          paymentmethod: JSON.stringify([selectedToken?.symbol, selectedToken2?.symbol, selectedTokenS?.symbol].filter(Boolean)),
          refund: isRefundSelected ? 1 : 0,
          newcontract: isNewContractSelected ? 1 : 0,
          status: "accepted",
          chainstatus: true,
          queuedat: processedAt,
          processedat: null,
          priority: 0,
          retrycount: 0,
          notes: "Xchange Successful",
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
              id: "swaps",
              method: "executeSwap",
              params: xchangePayload,
            }),
          });

          const contentType = res.headers.get("Content-Type") ?? "";
          if (res.ok && contentType.includes("application/json")) {
            const result = await res.json();
          }
        } catch (nestedErr: any) {
          console.error("Error reporting failed:", nestedErr);
        }
      }

        //****Deposit Log Exception*****//
      if (tokenTx2 || !isNewContractSelected) {
          const xchangePayload = {
          txhash,
          contractaddress: swapAddress,
          useraddress: signerAddress,
          initiator: "",
          counterparty: "",
          amounta: amount ? parseFloat(amount) : "",
          amountb: "",
          paymentmethod: selectedToken.symbol,
          refund: 0,
          newcontract: 0,
          status: "accepted",
          chainstatus: true,
          queuedat: processedAt,
          processedat: null,
          priority: 0,
          retrycount: 0,
          notes: "Xchange Successful",
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
              id: "swaps",
              method: "executeSwap",
              params: xchangePayload,
            }),
          });

          const contentType = res.headers.get("Content-Type") ?? "";
          if (res.ok && contentType.includes("application/json")) {
            const result = await res.json();
          }
        } catch (nestedErr: any) {
          console.error("Error reporting failed:", nestedErr);
        }
      }

      return {
        success: true,
        txHash: txhash,
        receiptHash: receipt?.blockHash ?? "",
        xchangeId: swapAddress,
        amount: payoutFormatted,
        token: selectedToken.symbol ?? "unknown",
        status: "queued",
      };
    } catch (err: any) {
      console.error("Transfer error:", err);

      const errorPayload = {
        txhash: "",
        contractaddress: "",
        useraddress: recipient,
        initiator: recipient ?? "unknown",
        counterparty: recipient2 ?? "unknown",
        paymentmethod: selectedToken.symbol ?? "unknown",
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
            id: "swap",
            method: "executeSwap",
            params: errorPayload,
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
