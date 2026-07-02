import { useState, useCallback } from "react";
import { parseUnits, Interface, Contract, ethers } from "ethers";
import smartVaultAbi from "~~/lib/contracts/abi/SmartVault.json";
import deployments from "~~/lib/contracts/deployments.json";
import type { Token } from "~~/components/constants/tokens";
import { logVaultCommit } from "./logVaultCommit";
import { sendTransferOnTargetChain, ensureGlobalChain } from "~~/utils/targetChain";

// Helper to generate term code (YYQDD)
function generateTermCode() {
  const now = new Date();
  const year = now.getFullYear();
  const day = now.getDate();

  // JS months: 0–11 → convert to 1–12
  let month = now.getMonth() + 1;

  // Quarter: 1–4
  const quarter = Math.floor((month - 1) / 3);

  const currentQuarterIndex = year * 4 + quarter;
  let startQuarterIndex = currentQuarterIndex;

  // 15‑day grace: apply to month
  if (day > 15) {
    const wasLastMonthOfQuarter = month % 3 === 0;

    // move to next month (with wrap)
    month = (month % 12) + 1;

    // if we were in the last month of the quarter, use next quarter index
    if (wasLastMonthOfQuarter) {
      startQuarterIndex += 1;
    }
  }

  // return both, preserving your index logic
  return startQuarterIndex;
}



type TxResult = {
  txHash: string;
  receipt: any | null;
};

interface VaultPayload {
  txhash: string;
  contractaddress: string;
  useraddress: string;
  exchangerate: string;
  depositamount: string;
  committedquarters: number;
  paymentmethod: string;
  depositstarttime: string;
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
  deposit: (
    amountStr: string,
    committedQuarters: number,
    token: Token,
    userAddress: string,
    provider: any,
  ) => Promise<string>; // returns tx hash
}

interface BitcoinWallet {
  sendTransaction: (to: string, amount: number) => Promise<string>;
}

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
      amountStr: string,
      committedQuarters: number,
      token: Token,
      userAddress: string,
      provider: any,
    ): Promise<string> => {
      setIsProcessing(true);
      setError(null);

      let parsedValue;
      console.log("Deposit Initated");

      try {

        const iface = new Interface(smartVaultAbi.abi);
        const locale = navigator.language || "en-US";
        const adjustedAmount = parseLocalNumber(amountStr, locale);
        parsedValue = parseUnits(String(adjustedAmount), 18);

        let callAddress;
        if (token.symbol === "ETH") {
          callAddress = "0x00000000000000000000000000000000000000E0";
        } else if (token.symbol === "BTC"){
          callAddress = "0x00000000000000000000000000000000000000b0";
        } else {
          callAddress = token.address;
        }

        console.log("Deposit Initated");

        let holdingWalletAddress;
        if (token.symbol === "BTC"){
          holdingWalletAddress = process.env.NEXT_PUBLIC_BITCOLLECTOR_ADDRESS!;
        } else {        
          holdingWalletAddress = process.env.NEXT_PUBLIC_SMARTVAULT!;
        }

        /*************** CROSS CHAIN TRANSFER CALL ***************/
        //console.log("Selected token:", token.symbol, token.chain, token.address);

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

        const vaultContract = new Contract(deployments.SmartVault, smartVaultAbi.abi, signer);
        const ts = Math.floor(Date.now() / 1000);
        const now = ts.toString();

        let dTxHash: string = "";
        let receipt2: any = null;
        let chainStatus = false;

        if (token.symbol == "GBDo") {
          try  {
            const txResponse = await vaultContract.deposit!(
              ts,
              holdingWalletAddress,
              token, 
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
            console.error("Vault Deposit failed")
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
          contractaddress: deployments.SmartVault,
          useraddress: userAddress,
          exchangerate: rate.toString(),
          depositamount: parsedValue.toString(),
          committedquarters: committedQuarters,
          paymentmethod: token.symbol,
          depositstarttime: startQuarterIndex.toString(),
          ispending: 0,
          isclosed: 0,
          status: "accepted",
          chainstatus: chainStatus,
          queuedat: now,
          processedat: now,
          priority: 0,
          retrycount: 0,
          receipthash: receipt2?.toString() ?? "",
          notes: "success",
          timestamp: now,
        };

        await logVaultCommit(successPayload);

        return dTxHash ?? "";
      } catch (err: any) {
        setError(err);
        console.error("Vault Deposit error:", err);

        const revertReason =
          err?.error?.data?.message ||
          err?.data?.message ||
          err?.reason ||
          err?.message ||
          "Unknown error";

        console.error("Vault Deposit failed:", revertReason);
        throw new Error(revertReason);

      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return { isProcessing, error, deposit};
}
