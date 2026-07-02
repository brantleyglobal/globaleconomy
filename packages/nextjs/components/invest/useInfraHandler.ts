

import { useState, useCallback } from "react";
import { Interface, parseUnits, Contract, ethers } from "ethers";
import infraAbi from "~~/lib/contracts/abi/RegionInfrastructure.json";
import deployments from "~~/lib/contracts/deployments.json";
import type { Token } from "~~/components/constants/tokens";
import { logInfraCommit } from "./logInfraCommit";
import { sendTransferOnTargetChain, ensureGlobalChain } from "~~/utils/targetChain";

// Helper to generate term code (YYQDD)
function generateTermCode(): string {
  const date = new Date();
  const year = date.getFullYear() % 100;
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}${quarter}${day}`;
}

interface VaultPayload {
  txhash: string;
  contractaddress: string;
  useraddress: string;
  exchangerate: string;
  depositamount: string;
  committedquarters: number;
  paymentmethod: string;
  depositstarttime: string;
  venture: string;
  ispending: number;
  isclosed: number;
  status: string;
  chainstatus: boolean;
  queuedat: string;
  processedat: string | null;
  priority: number;
  retrycount: number;
  receipthash: string;
  notes: string;
  timestamp: string;
}

interface UseDepositResult {
  isProcessing: boolean;
  error: Error | null;
  infra: (
    amountStr: string,
    ventureAddress: Token,
    token: Token,
    token2: Token,
    userAddress: string,
    committedQuarters: number,
    provider: any,
  ) => Promise<string>; 
}

type TxResult = {
  txHash: string;
  receipt: any | null;
};

function parseLocalNumber (rawNumber: string, locale: string) {
  const amountToFormat = Intl.NumberFormat(locale).format(1.1);
  const decimal = amountToFormat.charAt(amountToFormat.length - 2);

  const normalized = rawNumber.replace(new RegExp(`[^0-9${decimal}-]`,"g"), "");

  return Number(normalized);
}

export function useInfra(): UseDepositResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const infra = useCallback(
    async (
      amountStr: string,
      ventureAddress: Token,
      token: Token,
      token2: Token,
      userAddress: string,
      committedQuarters: number,
      provider: any,
    ): Promise<string> => {
      setIsProcessing(true);
      setError(null);

      let parsedValue;

      try {
        if (!window.ethereum) throw new Error("Ethereum provider not found.");

        const iface = new Interface(infraAbi.abi);
        const locale = navigator.language || "en-US";
        const adjustedAmount = parseLocalNumber(amountStr, locale);
        parsedValue = parseUnits(String(adjustedAmount), 18);

        let holdingWalletAddress;
        if (token.symbol === "BTC"){
          holdingWalletAddress = process.env.NEXT_PUBLIC_SOLANSCOLLECTOR_ADDRESS!;
        } else {        
          holdingWalletAddress = process.env.NEXT_PUBLIC_REGIONINFRA!;
        }

        /*************** CROSS CHAIN TRANSFER CALL ***************/

        await ensureGlobalChain(window.ethereum);

        if (!provider) {
          throw new Error("No provider available");
        }

        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();
          
        // Find selected token's rate from rates array
        const exchangeRateFloat = 1;
        const rate = parseUnits(exchangeRateFloat.toFixed(18), 18);

        const startQuarterIndex = generateTermCode();

        const infraContract = new Contract(deployments.RegionInfrastructure, infraAbi.abi, signer);
        const ts = Math.floor(Date.now() / 1000);
        const now = ts.toString();

        let dTxHash: string = "";
        let receipt2: any = null;
        let chainStatus = false;

        if (token.symbol == "GBDo") {
          try {
            const txResponse = await infraContract.deposit!(
              ts,
              holdingWalletAddress,
              token,
              token2,
              parsedValue,
              committedQuarters,
              rate,
              ethers.ZeroHash,
              {
                value: parsedValue,
                gasLimit: 1_000_000
              }
            );
            receipt2 = await txResponse.wait();
            dTxHash = txResponse.hash;
            chainStatus = true;
          } catch (err) {
            console.error("Xchange Creation failed")
          }

          console.log("after try/catch")
        } else {

          if (token.chain !== "solana") {
            await ensureGlobalChain(window.ethereum);
          }

          ({ dTxHash, receipt2 } = await sendTransferOnTargetChain(
            holdingWalletAddress,
            parsedValue,
            {
              address: token.address!,
              decimals: token.decimals,
              symbol: token.symbol,
              chain: token.chain,
            },
            provider // pass provider here
          ));
        }

        const successPayload: VaultPayload = {
          txhash: dTxHash?.toString() ?? "",
          contractaddress: deployments.RegionInfrastructure,
          useraddress: userAddress,
          exchangerate: rate.toString(),
          depositamount: parsedValue.toString(),
          committedquarters: committedQuarters,
          paymentmethod: token.symbol,
          depositstarttime: startQuarterIndex.toString(),
          venture: ventureAddress.address,
          ispending: 0,
          isclosed: 0,
          status: "accepted",
          chainstatus: chainStatus,
          queuedat: now,
          processedat: now,
          priority: 0,
          retrycount: 0,
          receipthash: receipt2?.toString()  ?? "",
          notes: "success",
          timestamp: now,
        };

        await logInfraCommit(successPayload);

        return dTxHash.toString() ?? "";
      } catch (err: any) {
        setError(err);
        console.error("Venture Deposit error:", err);
        
        const revertReason =
          err?.error?.data?.message ||
          err?.data?.message ||
          err?.reason ||
          err?.message ||
          "Unknown error";

        console.error("Venture Deposit failed:", revertReason);

        throw new Error(revertReason);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return { isProcessing, error, infra };
}
