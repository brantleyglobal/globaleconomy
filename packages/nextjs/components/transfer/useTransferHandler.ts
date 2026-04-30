"use client";

import { useState, useEffect } from "react";
import { parseUnits, formatUnits } from "ethers";
import deployments from "~~/lib/contracts/deployments.json";
import { useBalance } from "wagmi";
import { sendTransferOnTargetChain } from "~~/utils/targetChain";

interface TokenType {
  address?: string;
  symbol?: string;
  decimals?: number;
  isNative?: boolean;
  chain?: string;
}

interface TransferHandlerProps {
  sender?: string;
  chainId?: number;           // Source chain id (Besu)
  selectedToken?: TokenType;
  available?: bigint;
  signature?: string;
  openWalletModal?: () => void;
  setRecipient?: (val: string | undefined) => void;
  setSendValue?: (val: string) => void;
}

interface BitcoinWallet {
  sendTransaction: (to: string, amount: number) => Promise<string>;
}

type TxResult = {
  txHash: string;
  receipt: any | null;
};

function useSelectedTokenBalance(
  userAddress: string,
  selectedToken: TokenType,
  chainId: number
) {
  const { data: balanceData } = useBalance({
    address: userAddress,
    token: selectedToken.address,
    chainId,
  });

  const balanceBigInt = balanceData?.value;
  return {
    balanceBigInt,
    decimals: selectedToken.decimals ?? 18,
  };
}

export function useTransferHandler(config: TransferHandlerProps) {
  const {
    sender = "",
    chainId = 0,
    selectedToken = {},
    available = 0n,
    signature,
    openWalletModal,
    setRecipient,
    setSendValue,
  } = config;

  const [loading, setLoading] = useState(false);
  const { balanceBigInt, decimals } = useSelectedTokenBalance(sender, selectedToken, chainId);
  const [provider, setProvider] = useState<EthereumProvider | null>(null);
  const [walletName, setWalletName] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ethereum = (window as any).ethereum;
    const xdefi = (window as any).xfi;

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

  // Combined send flow
  const send = async (recipient?: string, value?: string) => {
    setLoading(true);
    const processedAt = new Date().toISOString();

    if (!sender || !chainId || !selectedToken.address) {
      //openWalletModal?.();
      //setLoading(false);
      console.log("failed");
      return;
    }

    if (!recipient || !value) {
      setLoading(false);
      return;
    }

    const amountNum = Number(value);
    const parsedValue = parseUnits(value, 18);
    const availableInDecimal = parseFloat(formatUnits(available, decimals ?? 18));
    if (amountNum > availableInDecimal) {
      setLoading(false);
      console.log("Amount exceeds available balance");
    }

    try {   
          
      const holdingWalletAddress = sender;

      if (!provider) {
        await window.ethereum?.request({ method: "eth_requestAccounts" });
        // then setProvider again
      }

      const { dTxHash, receipt2 } = await sendTransferOnTargetChain(
        holdingWalletAddress,
        parsedValue,
        {
          address: selectedToken.address!,
          decimals: selectedToken.decimals,
          symbol: selectedToken.symbol,
          chain: selectedToken.chain,
        },
        btcWallet,
        provider // pass provider here
      );

      if (!selectedToken.address) throw new Error("Token address not specified for source chain transfer");
      console.log("checking");
      
      // Log transfer success
      const transferPayload = {
        txhash: receipt2 ?? "",
        contractaddress: selectedToken.address,
        sender,
        recipient,
        token: selectedToken.symbol ?? "unknown",
        amount: amountNum.toFixed(2),
        status: "accepted",
        chainstatus: true,
        queuedat: "",
        processedat: processedAt,
        priority: 0,
        retrycount: 0,
        receipthash: receipt2 || "",
        notes: "Transfer successful",
        timestamp: new Date().toISOString(),
      };

      try {
        const res = await fetch("https://gateway.brantley-global.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "transfers",
            method: "createTransfer",
            params: transferPayload,
          }),
        });
        if (res.ok) await res.json();
      } catch (err) {
        console.error("Error reporting transfer:", err);
      }

      setRecipient?.(undefined);
      setSendValue?.("");
      setLoading(false);

      return {
        success: true,
        receipt2,
        recipient,
        amount: amountNum,
        token: selectedToken.symbol ?? "unknown",
        status: "queued",
      };
    } catch (err: any) {
      console.error("Transfer error:", err);

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
