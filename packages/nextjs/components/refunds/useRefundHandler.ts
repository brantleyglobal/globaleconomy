"use client";

import { useState, useEffect } from "react";
import { Contract } from "ethers";
import { useBalance } from "wagmi";
import purchaseAbi from "~~/lib/contracts/abi/AssetPurchase.json";
import deployments from "~~/lib/contracts/deployments.json";
import { ensureGlobalChain } from "~~/utils/targetChain";

interface TokenType {
  address?: string;
  symbol?: string;
  decimals?: number;
  isNative?: boolean;
  chain?: string;
}

interface ActionHandlerProps {
  sender?: string;
  receipt?: string;
  chainId?: number;
  selectedToken?: TokenType;
  available?: bigint;
  signature?: string;
  openWalletModal?: () => void;
}

interface BitcoinWallet {
  sendTransaction: (to: string, amount: number) => Promise<string>;
}

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

export function useRefundHandler(config: ActionHandlerProps) {
  const {
    sender = "",
    chainId = 0,
    selectedToken = {},
    openWalletModal,
    receipt,
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

  /**
   * Core Polymorphic Execution Gate
   * @param actionType "refund" | "repair" - Passed explicitly by parent modal steps
   */
  const executeAction = async (actionType: "refund" | "repair") => {
    setLoading(true);

    if (!sender || !chainId) {
      openWalletModal?.();
      setLoading(false);
      return { success: false, error: "Wallet context not connected" };
    }

    if (!receipt) {
      setLoading(false);
      return { success: false, error: "Missing purchase receipt target hash" };
    }

    await ensureGlobalChain(window.ethereum);

    try {
      if (!provider) {
        await window.ethereum?.request({ method: "eth_requestAccounts" });
      }

      // Instantiate local browser provider context wrapper
      const ethersProvider = new (window as any).ethers.providers.Web3Provider(provider);
      const signer = ethersProvider.getSigner();

      let receipt2;
      const contract = new Contract(deployments.AssetPurchase, purchaseAbi.abi, signer);

      // Flag matching contract params: processReturn(bytes32 hash, ShippingStatus status, bool isRepair)
      // Standardizes 'ReturnReceived' (usually enum value 1 or 2 depending on your setup)
      const isRepairFlag = actionType === "repair";

      try {
        const dTxHash = await contract.processReturn(
          receipt,
          isRepairFlag,
          {
            gasLimit: 120_000 // Bumped slightly to safely accommodate storage mutation branches
          }
        );
        receipt2 = await dTxHash.wait();
      } catch (err) {
        console.error("Contract runtime pipeline execution failed:", err);
        throw err;
      }

      // Sync backend relational tracking databases
      const syncPayload = {
        purchaseHash: receipt,
        action: actionType, // "refund" or "repair"
        isRepair: isRepairFlag,
        timestamp: new Date().toISOString(),
        txHash: receipt2?.transactionHash || "",
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
            method: "updatePurchaseStatus",
            params: syncPayload,
          }),
        });

        if (!res.ok) {
          console.warn("Backend indexed state notification returned bad status code.");
        }
      } catch (nestedErr) {
        console.error("Error updating centralized cloud ledger index:", nestedErr);
      }

      setLoading(false);

      return {
        success: true,
        receipt2: receipt2?.transactionHash || receipt,
        status: "queued",
      };
    } catch (err: any) {
      setLoading(false);
      console.error("Pipeline failure:", err);

      const revertReason =
        err?.error?.data?.message ||
        err?.data?.message ||
        err?.reason ||
        err?.message ||
        "Unknown pipeline transaction failure";

      return { success: false, error: revertReason };
    }
  };

  return { executeAction, loading };
}