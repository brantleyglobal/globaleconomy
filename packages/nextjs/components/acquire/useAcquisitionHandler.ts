import { useState, useCallback } from "react";
import { parseUnits, Interface, Contract } from "ethers";
import acquisitionAbi from "~~/lib/contracts/abi/AcquisitionGateway.json";
import deployments from "~~/lib/contracts/deployments.json";
import type { Token } from "~~/components/constants/tokens";
import { logAcquisitionCommit } from "./logAcquisitionCommit";
import { sendTransferOnTargetChain, ensureGlobalChain } from "~~/utils/targetChain"

interface AcquisitionPayload {
  txhash: string;
  contractaddress: string;
  useraddress: string;
  exchangerate: string;
  amountin: string;
  amountout: string;
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
    useraction: string,
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

function parseLocalNumber (rawNumber: string, locale: string) {
  const amountToFormat = Intl.NumberFormat(locale).format(1.1);
  const decimal = amountToFormat.charAt(amountToFormat.length - 2);

  const normalized = rawNumber.replace(new RegExp(`[^0-9${decimal}-]`,"g"), "");

  return Number(normalized);
}

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
      useraction: string,
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
      let dTxHash: string = "";
      let receipt2: any = null;
      let chainStatus = false;
      const timeStamp = Math.floor(Date.now() / 1000);

      try {

        const iface = new Interface(acquisitionAbi.abi);
        const locale = navigator.language || "en-US";
        const adjustedAmount = parseLocalNumber(amountStr, locale);
        const adjustedOutAmount = parseLocalNumber(amountoutStr, locale);
        parsedValue = parseUnits(String(adjustedAmount), 18);
        parsedValue2 = parseUnits(String(adjustedOutAmount), 18);
        const exchangeRate = parseUnits(String(rate), 18);

        const signer = await provider.getSigner();

        const purchaseContract = new Contract(deployments.AcquisitionGateway, acquisitionAbi.abi, signer);

        if (useraction === "acquire") {
          let holdingWalletAddress;
          if (token.symbol === "BTC"){
            holdingWalletAddress = process.env.NEXT_PUBLIC_BITCOLLECTOR_ADDRESS!;
          } else {        
            holdingWalletAddress = process.env.NEXT_PUBLIC_ACQUIRE!;
          }

          /*************** CROSS CHAIN TRANSFER CALL ***************/

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
        } else if (useraction === "liquidate") {

          const txResponse = await purchaseContract.liquidate!(
            token.address,
            parsedValue,
            timeStamp,
            {
              value: parsedValue,
              gasLimit: 1_500_000
            }
          );
          receipt2 = await txResponse.wait();
          dTxHash = txResponse.hash;
          chainStatus = true;
        }

        console.log("after try/catch")

        const ts = Math.floor(Date.now() / 1000);
        const now = ts.toString();

        const successPayload: AcquisitionPayload = {
          txhash: dTxHash?.toString() || "",
          contractaddress: deployments.AcquisitionGateway,
          useraddress: userAddress,
          exchangerate: exchangeRate.toString(),
          amountin: parsedValue.toString(),
          amountout: parsedValue2.toString(),
          paymentmethod: token.symbol,
          status: "accepted",
          chainstatus: false,
          processedat: now,
          receipthash: receipt2?.toString() || "",
          notes: "success",
          timestamp: timeStamp.toString(),
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
