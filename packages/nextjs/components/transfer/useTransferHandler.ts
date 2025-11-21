"use client";

import { useState, useEffect } from "react";
import { ethers, Contract, parseUnits, formatUnits, BrowserProvider, isAddress, TransactionResponse, TransactionReceipt } from "ethers";
import deployments from "~~/lib/contracts/deployments.json";
import transferTrackABI from "~~/lib/contracts/abi/TransferTracker.json";
import erc20Abi from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { Interface } from "@ethersproject/abi";
import { useBalance } from "wagmi";
import type { Address } from "viem";
import { resolve } from "dns";
import { dividendTokens } from "~~/components/constants/tokens";
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

      console.log("Selected token:", selectedToken.symbol, selectedToken.chain, selectedToken.address, parsedValue, holdingWalletAddress);

      if (!provider) {
        await window.ethereum?.request({ method: "eth_requestAccounts" });
        // then setProvider again
      }

      const { txHash, receipt } = await sendTransferOnTargetChain(
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
        txhash: txHash ?? "",
        contractaddress: deployments.TransferTracker,
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
        receipthash: receipt?.blockHash ?? "",
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
        txHash,
        recipient,
        amount: amountNum,
        token: selectedToken.symbol ?? "unknown",
        status: "queued",
      };
    } catch (err: any) {
      console.error("Cross-chain transfer failed:", err);

      const errorPayload = {
        txhash: "",
        contractaddress: "",
        sender,
        recipient: recipient ?? "",
        token: selectedToken.symbol ?? "unknown",
        amount: parseFloat(value ?? "0"),
        status: "failed",
        chainstatus: false,
        queuedat: processedAt,
        processedat: null,
        priority: 0,
        retrycount: 0,
        receipthash: "",
        notes: err.message ?? "Unknown error",
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
            params: errorPayload,
          }),
        });
        if (res.ok) await res.json();
      } catch (nestedErr) {
        console.error("Error reporting failure:", nestedErr);
      }

      setLoading(false);
      return { success: false, error: err.message ?? "Unknown error" };
    }
  };

  return { send, loading };
}
