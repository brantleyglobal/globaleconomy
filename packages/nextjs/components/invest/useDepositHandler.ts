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

        let txHash;
        let receipt;

        if (token.symbol == "GBDo") {
          txHash = await vaultContract.deposit!(
            holdingWalletAddress,
            token, 
            parsedValue,
            committedQuarters,
            startQuarterIndex,
            rate,
            {
              value: parsedValue,
              gasLimit: 1_500_000
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
          txhash: txHash.hash ?? "",
          contractaddress: deployments.SmartVault,
          useraddress: userAddress,
          depositamount: parsedValue.toString(),
          committedquarters: committedQuarters,
          paymentmethod: token.symbol,
          depositstarttime: now,
          ispending: 0,
          isclosed: 0,
          status: "accepted",
          chainstatus: true,
          queuedat: now,
          processedat: now,
          priority: 0,
          retrycount: 0,
          receipthash: receipt?.blockHash.toString() ?? "",
          notes: "success",
          timestamp: now,
        };

        await logVaultCommit(successPayload);

        return txHash.toString() ?? "";
      } catch (e: any) {
        setError(e);

        const now = new Date().toISOString();

        const errorPayload: VaultPayload = {
          txhash: "",
          contractaddress: deployments.SmartVault,
          useraddress: userAddress,
          depositamount: parsedValue?.toString() || "",
          committedquarters: committedQuarters,
          paymentmethod: token.symbol ?? "unknown",
          depositstarttime: now,
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

        await logVaultCommit(errorPayload);

        throw e;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return { isProcessing, error, deposit};
}
