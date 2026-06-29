"use client";

import { useState } from "react";
import { ethers, Contract, BrowserProvider, parseUnits,  } from "ethers";
import smartVaultabi from "~~/lib/contracts/abi/SmartVault.json";
import infraAbi from "~~/lib/contracts/abi/RegionInfrastructure.json";
import deployments from "~~/lib/contracts/deployments.json";
import { erc20Abi } from "viem";
import { getExchangeRates } from "~~/lib/exchangeRates";

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
  selectedToken2?: TokenType;
  available?: bigint;
  openWalletModal?: () => void;
  autoPay?: boolean;
  newAddress?: string;
  newToken?: string;
  amount?: string;
}

function parseLocalNumber (rawNumber: string, locale: string) {
  const amountToFormat = Intl.NumberFormat(locale).format(1.1);
  const decimal = amountToFormat.charAt(amountToFormat.length - 2);

  const normalized = rawNumber.replace(new RegExp(`[^0-9${decimal}-]`,"g"), "");

  return Number(normalized);
}

export function useRedemptionHandler(config: TransferHandlerProps) {
  const {
    sender = "",
    chainId = 0,
    selectedToken = {},
    selectedToken2 = {},
    available = 0n,
    openWalletModal,
    signature,
    autoPay,
    newAddress,
    newToken,
    amount,
  } = config;

  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true);
    const processedAt = new Date(Date.now()).toISOString();

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

      const locale = navigator.language || "en-US";
      const adjustedAmount = parseLocalNumber(String(amount), locale);
      const parsedValue = parseUnits(String(adjustedAmount), 18);

      const { rates, gbdoRate } = await getExchangeRates();
        
      // Find selected token's rate from rates array
      let exchangeRateFloat;
      if (selectedToken.symbol === "GBDo") {
        exchangeRateFloat = gbdoRate / 1;
      } else {
        const selectedTokenRateObj = rates.find(r => r.symbol === selectedToken.symbol);
  
        if (!selectedTokenRateObj) {
          throw new Error(`Exchange rate for token symbol ${selectedToken.symbol} not found`);
        }
        const tokenRate = selectedTokenRateObj.rate;
        exchangeRateFloat = gbdoRate / tokenRate;
      }
      
      console.log("exchangeRateFloat (gbdoRate / tokenRate):", exchangeRateFloat);
  
      const exchangeRate = parseUnits(exchangeRateFloat.toFixed(18), selectedToken.decimals);

      // Calculate current financial quarter term code (YYQDD format)
      const now = new Date(Date.now());
      const year = now.getFullYear();
      const quarter = Math.floor(now.getMonth() / 3) + 1;

      const ts = Math.floor(Date.now() / 1000);

      const termCodeStr = year * 4 + quarter;

      if (!selectedToken.address) {
        throw new Error("Token address missing");
      }

      // Define ABIs for term queries
      const termAbi = ["function unlockQuarter() view returns (uint16)", "function comingQuarter() view returns (uint16)"];

      // Select vault or infrastructure contract address based on token symbol
      const contractAddress = ["GLB", "TGUSA", "TGMX", "CREs", "CREh", "CGRi"].includes(selectedToken.symbol!) ? deployments.RegionInfrastructure : deployments.SmartVault;

      // Contracts for term queries
      const contract = new ethers.Contract(selectedToken.address, termAbi[0], provider);
      const contract2 = new ethers.Contract(selectedToken.address, termAbi[1], provider);

      let tokenTx, receipt;

      if (newAddress) {
        const vaultContract = new Contract(deployments.SmartVault, smartVaultabi.abi, signer);
        const infraContract = new Contract(deployments.RegionInfrastructure, infraAbi.abi, signer);
        const stat = false;

        if (!["GLB", "TGUSA", "TGMX", "CREs", "CREh", "CGRi"].includes(selectedToken.symbol!)) {
          tokenTx = await vaultContract.updateUser(signerAddress, newAddress, selectedToken.address, stat);
          receipt = await tokenTx.wait(); 
        } else {
          tokenTx = await infraContract.updateUser(signerAddress, newAddress, selectedToken.address, stat);
          receipt = await tokenTx.wait();
        }

      } else if (newToken) {
        const vaultContract = new Contract(deployments.SmartVault, smartVaultabi.abi, signer);
        const infraContract = new Contract(deployments.RegionInfrastructure, infraAbi.abi, signer);

        const stat = true;

        if (!["GLB", "TGUSA", "TGMX", "CREs", "CREh", "CGRi"].includes(selectedToken.symbol!)) {
          tokenTx = await vaultContract.updateUser(signerAddress, newToken, selectedToken.address, stat);
          receipt = await tokenTx.wait(); 
        } else {
          tokenTx = await infraContract.updateUser(signerAddress, newToken, selectedToken.address, stat);
          receipt = await tokenTx.wait();
        }

      } else {
        const unlockQuarterRaw = await contract.unlockQuarter();
        const comingQuarterRaw = await contract2.comingQuarter();

        const termCodeNum = termCodeStr;
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


        if (!["GLB", "TGUSA", "TGMX", "CREs", "CREh", "CGRi"].includes(selectedToken.symbol!)) {
          // Check allowance for vault
          const allowance = await stablecoinContract.allowance(signerAddress, vaultContract.address);
          if (allowance.lt(balanceBefore)) {
            if (balanceBefore === 0n) {
              console.log("No token balance — skipping approve.");
            } else {
              const approvalTx = await stablecoinContract.approve!(vaultContract, balanceBefore);
              await approvalTx.wait();
            }
          }

          // Withdraw
          tokenTx = await vaultContract.withdraw(selectedToken.address, selectedToken2.address, amount, ts, {gasLimit: 8_000_000});
          receipt = await tokenTx.wait();

          if (autoPay && receipt.status === 1) {
            try {
              const autoTx = await vaultContract.autoPay(autoPay);
              await autoTx.wait();
            } catch (err) {
              console.error("AutoPay failed:", err);
              // optional: show a toast but don't break the flow
            }
          }

        } else {
          // Check allowance for infra
          const allowance = await stablecoinContract.allowance(signerAddress, infraContract.address);
          if (allowance.lt(balanceBefore)) {
            if (balanceBefore === 0n) {
              console.log("No token balance — skipping approve.");
            } else {
              const approvalTx = await stablecoinContract.approve!(infraContract, balanceBefore);
              await approvalTx.wait();
            }
          }

          // Withdraw
          tokenTx = await infraContract.withdraw(selectedToken.address, selectedToken2.address, amount, ts, {gasLimit: 8_000_000}); //NEED TO RESTRICT TO TOKENS THE USER ACTUALLY HAS A BALANCE FOR
          receipt = await tokenTx.wait();

          if (autoPay && receipt.status === 1) {
            try {
              const autoTx = await infraContract.autoPay(autoPay);
              await autoTx.wait();
            } catch (err) {
              console.error("AutoPay failed:", err);
              // optional: show a toast but don't break the flow
            }
          }
        }

        let chainStatus = false;
        if (receipt!) {
          chainStatus = true;
        }

        let notes;
        let mod;
        if (newAddress) {
          mod = newAddress;
          notes = "Address Change Requested";
        } else if (newToken) {
          mod = selectedToken2.address;
          notes = "Token Change Requested";
        } else {
          mod = selectedToken2;
          notes = "Redemption Requested";
        }

        // Prepare payload for redemption logging
        const redemptionPayload = {
          txhash: tokenTx,
          contractaddress: contractAddress,
          useraddress: sender,
          amount: amount,
          modification: mod,
          asset: selectedToken.symbol,
          status: "accepted",
          chainstatus: chainStatus,
          queuedat: processedAt,
          processedat: null,
          priority: 0,
          retrycount: 0,
          receipthash: receipt,
          notes: notes,
          timestamp: ts.toString(),
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
          txHash: tokenTx,
          receiptHash: receipt,
          token: selectedToken.symbol ?? "unknown",
          status: "queued",
        };
      }
    } catch (err: any) {
      console.error("Redemption error:", err);

        const revertReason =
          err?.error?.data?.message ||
          err?.data?.message ||
          err?.reason ||
          err?.message ||
          "Unknown error";

        console.error("Acqusition failed:", revertReason);

        throw new Error(revertReason);

      setLoading(false);
      return { success: false, error: err.message ?? "Unknown error" };
    }
  };

  return { send, loading };
}
