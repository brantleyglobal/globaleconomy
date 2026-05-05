import { useState, useCallback, useEffect } from "react";
import { ethers, Contract, BrowserProvider, parseUnits, formatUnits, Interface, isAddress, TransactionResponse, TransactionReceipt } from "ethers";
import acquisitionAbi from "~~/lib/contracts/abi/AcquisitionGateway.json";
import deployments from "~~/lib/contracts/deployments.json";
import { erc20Abi } from "viem";
import type { Token } from "~~/components/constants/tokens";
import { logAcquisitionCommit } from "./logAcquisitionCommit";
import { Address } from "viem";
import { sendReconciliation } from "~~/lib/reconciliatonHelper";
import { sendTransferOnTargetChain } from "~~/utils/targetChain"

interface AcquisitionPayload {
  txhash: string;
  contractaddress: string;
  useraddress: string;
  exchangerate: bigint;
  stablein: bigint;
  gbdout: bigint;
  paymentmethod: string;
  status: string;
  chainstatus: boolean;
  processedat: string | null;
  receipthash: string;
  notes: string;
  timestamp: string;
}

interface UseDepositResult {
  isProcessing: boolean;
  error: Error | null;
  deposit: (
    amountStr: string,
    amountoutStr: string,
    token: Token,
    userAddress: string,
    rate: string,
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

export function useDeposit(): UseDepositResult {
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

  const deposit = useCallback(
    async (
      amountStr: string,
      amountoutStr: string,
      token: Token,
      userAddress: string,
      rate: string,
      provider: any,
    ): Promise<string> => {
      setIsProcessing(true);
      setError(null);

      let parsedValue;
      let parsedValue2;
      let dTxHash;
      let receipt2;

      try {

        const iface = new Interface(acquisitionAbi.abi);
        parsedValue = parseUnits(String(amountStr), 18);
        parsedValue2 = parseUnits(String(amountoutStr), 18);
        const exchangeRate = parseUnits(String(rate), 18);
        //console.log(parsedValue);
        //console.log(parsedValue2);
        //console.log(rate);

        let callAddress;
        if (token.symbol === "ETH") {
          callAddress = "0x00000000000000000000000000000000000000E0";
        } else if (token.symbol === "BTC"){
          callAddress = "0x00000000000000000000000000000000000000b0";
        } else {
          callAddress = token.address;
        }

        const calldata = iface.encodeFunctionData("acquisition", [
          callAddress,
          token.address,
          parsedValue,
          parsedValue2,
          exchangeRate,
        ]);

        let holdingWalletAddress;
        if (token.symbol === "BTC"){
          holdingWalletAddress = process.env.NEXT_PUBLIC_BITCOLLECTOR_ADDRESS!;
        } else {        
          holdingWalletAddress = process.env.NEXT_PUBLIC_ACQUIRE!;
        }

        /*************** CROSS CHAIN TRANSFER CALL ***************/
        if (!provider) {
          throw new Error("No provider available");
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
          btcWallet,
          provider // pass provider here
        ));

        const now = new Date(Date.now()).toISOString();

        const successPayload: AcquisitionPayload = {
          txhash: receipt2 || "",
          contractaddress: deployments.SmartVault,
          useraddress: userAddress,
          exchangerate: exchangeRate,
          stablein: parsedValue,
          gbdout: parsedValue,
          paymentmethod: token.symbol,
          status: "accepted",
          chainstatus: false,
          processedat: now,
          receipthash: receipt2 || "",
          notes: "success:",
          timestamp: now,
        };

        await logAcquisitionCommit(successPayload);

        return dTxHash!.toString() || "";
      } catch (err: any) {
        setError(err);
        console.error("Acquisition error:", err);

        const revertReason =
          err?.error?.data?.message ||
          err?.data?.message ||
          err?.reason ||
          err?.message ||
          "Unknown error";

        console.error("Acqusition failed:", revertReason);

        throw new Error(revertReason);
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return { isProcessing, error, deposit };
}
