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

function parseLocalNumber (rawNumber: string, locale: string) {
  const amountToFormat = Intl.NumberFormat(locale).format(1.1);
  const decimal = amountToFormat.charAt(amountToFormat.length - 2);

  const normalized = rawNumber.replace(new RegExp(`[^0-9${decimal}-]`,"g"), "");

  return Number(normalized);
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

  // Combined send flow
  const send = async (recipient?: string, value?: string) => {
    setLoading(true);
    const processedAt = new Date(Date.now()).toISOString();

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
    const locale = navigator.language || "en-US";
    const adjustedAmount = parseLocalNumber(value, locale);
    const parsedValue = parseUnits(String(adjustedAmount), 18);
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
        provider // pass provider here
      );

      if (!selectedToken.address) throw new Error("Token address not specified for source chain transfer");
      console.log("checking");

      let noteStatus;

      if (receipt2!) {
        noteStatus = "Tranfser Successful";
      } else {
        noteStatus = "Transfer Pending";
      }
      
      // Log transfer success
      const transferPayload = {
        txhash: receipt2?.toString() ?? "",
        contractaddress: selectedToken.address,
        sender,
        recipient,
        token: selectedToken.symbol ?? "unknown",
        amount: parsedValue,
        status: "accepted",
        chainstatus: false,
        queuedat: "",
        processedat: processedAt,
        priority: 0,
        retrycount: 0,
        receipthash: receipt2?.toString() || "",
        notes: noteStatus,
        timestamp: Date.now().toString(),
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
