import { useState, useCallback, useEffect } from "react";
import { parseUnits, Interface, Contract } from "ethers";
import smartVaultAbi from "~~/lib/contracts/abi/SmartVault.json";
import deployments from "~~/lib/contracts/deployments.json";
import type { Token } from "~~/components/constants/tokens";
import { logVaultCommit } from "./logVaultCommit";
import { sendTransferOnTargetChain } from "~~/utils/targetChain";

// Helper to generate term code (YYQDD)
function generateTermCode(): number {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const day = now.getDate();

  const currentQuarterIndex = year * 4 + quarter;
  let startQuarterIndex = year * 4 + quarter;

  // Grace period rule: after day 15, roll to next quarter
  if (day > 15) {
      startQuarterIndex += 1;
  }

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
        parsedValue = parseUnits(amountStr, 18);

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

        if (!provider) {
          throw new Error("No provider available");
        }

        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();
          
        // Find selected token's rate from rates array
        const exchangeRateFloat = 1;
        const rate = parseUnits(exchangeRateFloat.toFixed(18), token.decimals);

        const startQuarterIndex = generateTermCode();

        const vaultContract = new Contract(deployments.SmartVault, smartVaultAbi.abi, signer);

        let dTxHash;
        let receipt2;

        if (token.symbol == "GBDo") {
          dTxHash = await vaultContract.deposit!(
            holdingWalletAddress,
            token, 
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
          receipt2 = await dTxHash.wait();
        } else {
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
        }

        const now = new Date().toISOString();

        const successPayload: VaultPayload = {
          txhash: receipt2 ?? "",
          contractaddress: deployments.SmartVault,
          useraddress: userAddress,
          depositamount: parsedValue.toString(),
          committedquarters: committedQuarters,
          paymentmethod: token.symbol,
          depositstarttime: startQuarterIndex.toString(),
          ispending: 0,
          isclosed: 0,
          status: "accepted",
          chainstatus: true,
          queuedat: now,
          processedat: now,
          priority: 0,
          retrycount: 0,
          receipthash: receipt2?.blockHash.toString() ?? "",
          notes: "success",
          timestamp: now,
        };

        await logVaultCommit(successPayload);

        return receipt2 ?? "";
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
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return { isProcessing, error, deposit};
}
