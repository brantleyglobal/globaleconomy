"use client";

import { useState, useEffect } from "react";
import { Contract } from "ethers";
import { useBalance } from "wagmi";
import { Interface } from "@ethersproject/abi";
import assetPurchaseAbi from "~~/lib/contracts/abi/AssetPurchase.json";
import acquisitionAbi from "~~/lib/contracts/abi/AcquisitionGateway.json";
import deployments from "~~/lib/contracts/deployments.json";
import { ensureGlobalChain } from "~~/utils/targetChain";

interface TokenType {
  address?: string;
  symbol?: string;
  decimals?: number;
  isNative?: boolean;
  chain?: string;
}

interface TransferHandlerProps {
  sender?: string;
  receipt?: string;
  contractAddress: string;
  chainId?: number;           // Source chain id (Besu)
  selectedToken?: TokenType;
  available?: bigint;
  signature?: string;
  openWalletModal?: () => void;
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

function parseLocalNumber (rawNumber: string, locale: string) {
  const amountToFormat = Intl.NumberFormat(locale).format(1.1);
  const decimal = amountToFormat.charAt(amountToFormat.length - 2);

  const normalized = rawNumber.replace(new RegExp(`[^0-9${decimal}-]`,"g"), "");

  return Number(normalized);
}

export function useRefundHandler(config: TransferHandlerProps) {
  const {
    sender = "",
    chainId = 0,
    selectedToken = {},
    signature,
    openWalletModal,
    receipt,
    contractAddress,
  } = config;

  const [loading, setLoading] = useState(false);
  const { balanceBigInt, decimals } = useSelectedTokenBalance(sender, selectedToken, chainId);
  const [provider, setProvider] = useState<any | null>(null);
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

    await ensureGlobalChain(window.ethereum);

    try {   
          
      const holdingWalletAddress = sender;

      if (!provider) {
        await window.ethereum?.request({ method: "eth_requestAccounts" });
        // then setProvider again
      }

      const signer = await provider.getSigner();

      let receipt2;
      
      const contract = new Contract(deployments.AssetPurchase, assetPurchaseAbi.abi, signer);

      try {
        const dTxHash = await contract?.refund!(
          receipt,
          {
            gasLimit: 70_000
          }
        );
        receipt2 = await dTxHash.wait();
      } catch (err) {
        console.error("Xchange Creation failed")
      }

      console.log("after try/catch")

      if (!selectedToken.address) throw new Error("Token address not specified for source chain transfer");
      console.log("checking");

      const refundPayload = {
        refund: true,
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
            id: "purchases",
            method: "updatePurchase",
            params: refundPayload,
          }),
        });

        const contentType = res.headers.get("Content-Type") ?? "";
        if (res.ok && contentType.includes("application/json")) {
          const result = await res.json();
        }
      } catch (nestedErr: any) {
        console.error("Error reporting failed:", nestedErr);
      }

      receipt2?.(undefined);
      setLoading(false);

      return {
        success: true,
        receipt2,
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
