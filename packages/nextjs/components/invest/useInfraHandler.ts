

import { useState, useCallback, useEffect } from "react";
import { Interface, parseUnits, Contract } from "ethers";
import infraAbi from "~~/lib/contracts/abi/RegionInfrastructure.json";
import deployments from "~~/lib/contracts/deployments.json";
import type { Token } from "~~/components/constants/tokens";
import { logInfraCommit } from "./logInfraCommit";
import { useWalletClient } from "wagmi";
import { Address } from "viem";
import { useSelectedTokenBalance } from "~~/lib/chainHelper";
import { sendTransferOnTargetChain } from "~~/utils/targetChain";

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

interface BitcoinWallet {
  sendTransaction: (to: string, amount: number) => Promise<string>;
}

type TxResult = {
  txHash: string;
  receipt: any | null;
};

export function useInfra(): UseDepositResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const btcWallet: BitcoinWallet = {
    sendTransaction: async (to, amount) => {
      if (!window.xfi?.bitcoin) {
        throw new Error("XDEFI Bitcoin wallet not available");
      }
      return await window.xfi.bitcoin.sendTransaction(to, amount);
    },
  };
  
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
        parsedValue = parseUnits(amountStr, token.decimals);

        let callAddress;
        if (token.symbol === "ETH") {
          callAddress = "0x00000000000000000000000000000000000000E0";
        } else if (token.symbol === "BTC"){
          callAddress = "0x00000000000000000000000000000000000000b0";
        } else {
          callAddress = token.address;
        }

        let holdingWalletAddress;
        if (token.symbol === "BTC"){
          holdingWalletAddress = process.env.NEXT_PUBLIC_BITCOLLECTOR_ADDRESS!;
        } else {        
          holdingWalletAddress = process.env.NEXT_PUBLIC_REGIONINFRA!;
        }

        /*************** CROSS CHAIN TRANSFER CALL ***************/
        //console.log("Selected token:", token.symbol, token.chain, token.address);

        if (!provider) {
          throw new Error("No provider available");
        }

        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();
          
        // Find selected token's rate from rates array
        const exchangeRateFloat = 1;
        const rate = parseUnits(exchangeRateFloat.toFixed(18), token.decimals);

        const startQuarterIndex = generateTermCode();

        const infraContract = new Contract(deployments.RegionInfrastructure, infraAbi.abi, signer);

        let txHash;
        let receipt;

        if (token.symbol == "GBDo") {
          txHash = await infraContract.deposit!(
            holdingWalletAddress,
            token,
            token2,
            parsedValue,
            committedQuarters,
            startQuarterIndex,
            rate,
            0,
            {
              value: parsedValue,
              gasLimit: 600_000
            }
          );
          receipt = await txHash.wait();
        } else {
          ({ txHash, receipt } = await sendTransferOnTargetChain(
            holdingWalletAddress,
            parsedValue,
            {
              address: token.address!,
              decimals: token.decimals,
              symbol: token.symbol,
              chain: token.chain,
            },
            btcWallet,
            provider // pass provider here
          ));
        }

        const now = new Date().toISOString();

        const successPayload: VaultPayload = {
          txhash: txHash.toString() ?? "",
          contractaddress: deployments.RegionInfrastructure,
          useraddress: userAddress,
          depositamount: parsedValue.toString(),
          committedquarters: committedQuarters,
          paymentmethod: token.symbol,
          depositstarttime: now,
          venture: ventureAddress.address,
          ispending: 0,
          isclosed: 0,
          status: "accepted",
          chainstatus: true,
          queuedat: now,
          processedat: now,
          priority: 0,
          retrycount: 0,
          receipthash: receipt?.blockHash.toString()  ?? "",
          notes: "success",
          timestamp: now,
        };

        await logInfraCommit(successPayload);

        return txHash.toString() ?? "";
      } catch (e: any) {
        setError(e);

        const now = new Date().toISOString();

        const errorPayload: VaultPayload = {
          txhash: "",
          contractaddress: deployments.RegionInfrastructure,
          useraddress: userAddress,
          depositamount: parsedValue?.toString() || "",
          committedquarters: 0,
          paymentmethod: token.symbol ?? "unknown",
          depositstarttime: now,
          venture: ventureAddress.address,
          ispending: 1,
          isclosed: 0,
          status: "failed",
          chainstatus: false,
          queuedat: now,
          processedat: null,
          priority: 0,
          retrycount: 0,
          receipthash: "",
          notes: e.message ?? "Signing failed",
          timestamp: now,
        };

        await logInfraCommit(errorPayload);

        throw e;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return { isProcessing, error, infra };
}
