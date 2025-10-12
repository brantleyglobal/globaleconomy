import { useState, useCallback } from "react";
import { ethers, Contract } from "ethers";
import smartVaultAbi from "~~/lib/contracts/abi/SmartVault.json";
import deployments from "~~/lib/contracts/deployments.json";
import { erc20Abi } from "viem";
import type { Token } from "~~/components/constants/tokens";
import { logVaultCommit } from "./logVaultCommit";

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
    userAddress: string
  ) => Promise<string>; // returns tx hash
}

export function useDeposit(): UseDepositResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deposit = useCallback(
    async (
      amountStr: string,
      committedQuarters: number,
      token: Token,
      userAddress: string
    ): Promise<string> => {
      setIsProcessing(true);
      setError(null);

      try {
        if (!window.ethereum) throw new Error("Ethereum provider not found.");

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();

        const iface = new ethers.utils.Interface(smartVaultAbi.abi);
        const parsedValue = ethers.utils.parseUnits(amountStr, 18);
        const calldata = iface.encodeFunctionData("deposit", [
          token.address,
          parsedValue,
          committedQuarters,
          generateTermCode(),
        ]);

        // Check if token needs approval (ERC20)
        const isERC20 = token.symbol !== "GBDo" && !!token.address;

        if (isERC20) {
          const stablecoinContract = new Contract(token.address!, erc20Abi, signer);
          const allowance = await stablecoinContract.allowance(
            userAddress,
            deployments.SmartVault
          );

          if (allowance.lt(parsedValue)) {
            const approveTx = await stablecoinContract.approve(deployments.SmartVault, parsedValue);
            await approveTx.wait();
          }
        }

        // Send deposit transaction
        const tx = await signer.sendTransaction({
          to: deployments.SmartVault,
          value: 0n,
          data: calldata,
          gasLimit: ethers.BigNumber.from(2_000_000),
        });

        // Wait for confirmation
        const receipt = await tx.wait();

        const now = new Date().toISOString();

        const successPayload: VaultPayload = {
          txhash: tx.hash,
          contractaddress: deployments.SmartVault,
          useraddress: userAddress,
          depositamount: amountStr,
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
          receipthash: receipt.transactionHash,
          notes: "success",
          timestamp: now,
        };

        await logVaultCommit(successPayload);

        return tx.hash; // Return transaction hash here to caller

      } catch (e: any) {
        setError(e);

        const now = new Date().toISOString();

        const errorPayload: VaultPayload = {
          txhash: "",
          contractaddress: deployments.SmartVault,
          useraddress: userAddress,
          depositamount: amountStr,
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

  return { isProcessing, error, deposit };
}
