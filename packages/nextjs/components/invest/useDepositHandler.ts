import { useState, useCallback, useEffect } from "react";
import { parseUnits, Interface } from "ethers";
import smartVaultAbi from "~~/lib/contracts/abi/SmartVault.json";
import deployments from "~~/lib/contracts/deployments.json";
import type { Token } from "~~/components/constants/tokens";
import { logVaultCommit } from "./logVaultCommit";
import { sendTransferOnTargetChain } from "~~/utils/targetChain";

// Helper to generate term code (YYQDD)
function generateTermCode(): string {
  const date = new Date();
  const year = date.getFullYear() % 100;
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}${quarter}${day}`;
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
    userAddress: string
  ) => Promise<string>; // returns tx hash
}

interface BitcoinWallet {
  sendTransaction: (to: string, amount: number) => Promise<string>;
}

export function useDeposit(): UseDepositResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [provider, setProvider] = useState<EthereumProvider | null>(null);
  const [walletName, setWalletName] = useState<string>("");
  
  useEffect(() => {
    const ethereum = window.ethereum;
    const xdefi = window.xfi;

    if (ethereum?.isMetaMask) {
      setWalletName("MetaMask");
      setProvider(ethereum);
    } else if (ethereum?.isBraveWallet) {
      setWalletName("Brave Wallet");
      setProvider(ethereum);
    } else if (ethereum) {
      setWalletName("Injected Wallet");
      setProvider(ethereum);
    }

    if (xdefi) {
      setWalletName("XDEFI Wallet");
      setProvider(xdefi.ethereum);
    }
  }, []);

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
      userAddress: string
    ): Promise<string> => {
      setIsProcessing(true);
      setError(null);

      try {

        const iface = new Interface(smartVaultAbi.abi);
        const parsedValue = parseUnits(amountStr, 18);

        let callAddress;
        if (token.symbol === "ETH") {
          callAddress = 0x00000000000000000000000000000000000000E0
        } else if (token.symbol === "BTC"){
          callAddress = 0x00000000000000000000000000000000000000b0;
        } else {
          callAddress = token.address;
        }

        const calldata = iface.encodeFunctionData("deposit", [
          callAddress,
          parsedValue,
          committedQuarters,
          generateTermCode(),
        ]);

        let holdingWalletAddress;
        if (token.symbol === "BTC"){
          holdingWalletAddress = process.env.NEXT_PUBLIC_BITCOLLECTOR_ADDRESS!;
        } else {        
          holdingWalletAddress = deployments.SmartVault;
        }

        /*************** CROSS CHAIN TRANSFER CALL ***************/
        console.log("Selected token:", token.symbol, token.chain, token.address);

        if (!provider) {
          throw new Error("No provider available");
        }
        const { txHash, receipt } = await sendTransferOnTargetChain(
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
        );

        const now = new Date().toISOString();

        const successPayload: VaultPayload = {
          txhash: txHash.toString() ?? "",
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
