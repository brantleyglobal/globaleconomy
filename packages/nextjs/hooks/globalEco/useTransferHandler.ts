"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { formatUnits, parseUnits } from "@ethersproject/units";
import { Interface } from "@ethersproject/abi";
import { hexlify } from "ethers/lib/utils";
import { ethers, BytesLike } from "ethers";
import type { Bytes } from "ethers";
import { SimpleAccountAPI } from "@account-abstraction/sdk";
import { customEncodeMultiSend } from "~~/lib/utils/customEncodeMultiSend";
import deployments from "~~/lib/contracts/deployments.json";

interface UserOperationStruct {
  sender: string;
  nonce: bigint;
  initCode: string;
  callData: string;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: string;
  signature: string;
}

type Hex = `0x${string}`;

interface TokenType {
  address?: string;
  symbol?: string;
  decimals?: number;
  isNative?: boolean;
}

interface TransferHandlerProps {
  sender?: string;
  chainId?: number;
  signature: string;
  selectedToken?: TokenType;
  available?: bigint;
  openWalletModal?: () => void;
  setRecipient?: (val: string | undefined) => void;
  setSendValue?: (val: string) => void;
}

export function useTransferHandler(config: TransferHandlerProps) {
  const {
    sender = "",
    chainId = 0,
    selectedToken = {},
    available = 0n,
    openWalletModal,
    setRecipient,
    setSendValue,
    signature,
  } = config;

  const [accountAPI, setAccountAPI] = useState<SimpleAccountAPI | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function initAccountAPI() {
      if (typeof window === "undefined" || !window.ethereum) return;

      try {
        setLoading(true);
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        const simpleAccountAPI = new SimpleAccountAPI({
          provider,
          entryPointAddress: deployments.EntryPoint,
          owner: signer,
          factoryAddress: deployments.SimpleAccountFactory,
        });

        setAccountAPI(simpleAccountAPI);
      } catch (err: any) {
        setAccountAPI(null);
      } finally {
        setLoading(false);
      }
    }

    initAccountAPI();
  }, []);

  const send = async (recipient?: string, value?: string) => {
    const processedAt = new Date().toISOString();

    if (!sender || !chainId || selectedToken.decimals == null) {
      openWalletModal?.();
      return;
    }

    if (!recipient || !value) {
      return;
    }

    const amount = Number(value);
    const availableInDecimal = parseFloat(formatUnits(available, selectedToken.decimals));

    if (amount > availableInDecimal) {
      return;
    }

    if (!accountAPI) {
      return;
    }

    try {
      const smartWalletAddress = await accountAPI.getAccountAddress();

      const erc20Abi = [
        "function transfer(address to, uint256 amount)",
        "function balanceOf(address account) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ];
      const iface = new Interface(erc20Abi);

      const isERC20 = selectedToken.symbol !== "WGBD" && !!selectedToken.address;
      const parsedValue = parseUnits(value, selectedToken.decimals);
      const calldata = isERC20
        ? iface.encodeFunctionData("transfer", [recipient, parsedValue])
        : "0x";

      const txs = [
        {
          to: isERC20 ? selectedToken.address! : recipient!,
          value: isERC20 ? "0" : parsedValue.toString(),
          data: calldata,
        },
      ];

      const multiSendData = customEncodeMultiSend(txs);

      const userOp: UserOperationStruct = {
        sender: smartWalletAddress,
        nonce: (await accountAPI.getNonce()).toBigInt(),
        initCode: await accountAPI.getInitCode(),
        callData: multiSendData,
        callGasLimit: 0n,
        verificationGasLimit: 0n,
        preVerificationGas: 0n,
        maxFeePerGas: 0n,
        maxPriorityFeePerGas: 0n,
        paymasterAndData: "0x",
        signature: "",
      };

      const signedUserOp = await accountAPI.signUserOp(userOp);
      async function resolveHex(input: string | Bytes | Promise<BytesLike>) {
        const resolved = await Promise.resolve(input);
        return typeof resolved === "string" ? resolved : hexlify(resolved);
      }

      const calldataHex = await resolveHex(signedUserOp.callData);
      const signatureHex = await resolveHex(signedUserOp.signature);

      const transferPayload = {
        txhash: "",
        contractaddress: deployments["StableSwapGateway"],
        calldata: calldataHex,
        signature: signatureHex,
        sender,
        smartwallet: smartWalletAddress,
        recipient,
        token: selectedToken.symbol ?? "unknown",
        amount,
        status: "queued",
        chainstatus: false,
        queuedat: processedAt,
        processedat: null,
        priority: 0,
        retrycount: 0,
        receipthash: "",
        notes: "Transfer intent captured — awaiting runner",
        timestamp: new Date().toISOString(),
      };

      /*toast(
        `txhash: ${transferPayload.txhash}
      contractaddress: ${transferPayload.contractaddress}
      calldata: ${transferPayload.calldata}
      signature: ${transferPayload.signature}
      sender: ${transferPayload.sender}
      smartwallet: ${transferPayload.smartwallet}
      recipient: ${transferPayload.recipient}
      token: ${transferPayload.token}
      amount: ${transferPayload.amount}
      status: ${transferPayload.status}
      chainstatus: ${transferPayload.chainstatus}
      queuedat: ${transferPayload.queuedat}
      processedat: ${transferPayload.processedat}
      priority: ${transferPayload.priority}
      retrycount: ${transferPayload.retrycount}
      receipthash: ${transferPayload.receipthash}
      notes: ${transferPayload.notes}
      timestamp: ${transferPayload.timestamp}`,
        {
          duration: 10000,
          position: "top-right",
          style: {
            whiteSpace: "pre-line",
            fontSize: "0.85rem",
            maxWidth: "400px",
          },
        }
      );*/

      try {
        const res = await fetch("https://gateway.brantley-global.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET! // optional, if your Worker requires it
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "transfers",
            method: "createTransfer",
            params: transferPayload
          }),
        });

        const contentType = res.headers.get("Content-Type") ?? "";
        if (res.ok && contentType.includes("application/json")) {
          const result = await res.json();
        }
      } catch (nestedErr: any) {
        console.error("Error reporting failed:", nestedErr);
      }

      setRecipient?.(undefined);
      setSendValue?.("");

      return {
        success: true,
        txHash: "",
        receiptHash: "",
        recipient,
        amount,
        token: selectedToken.symbol ?? "unknown",
        status: "queued",
        smartWallet: smartWalletAddress,
      };
    } catch (err: any) {
      console.error("Transfer error:", err);

      const errorPayload = {
        txhash: "",
        contractaddress: "",
        calldata: "",
        signature: "",
        sender,
        smartwallet: "",
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
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET! // optional, if your Worker requires it
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "transfers",
            method: "createTransfer",
            params: errorPayload
          }),
        });

        const contentType = res.headers.get("Content-Type") ?? "";
        if (res.ok && contentType.includes("application/json")) {
          const result = await res.json();
        }
      } catch (nestedErr: any) {
        console.error("Error reporting failed:", nestedErr);
      }

      return { success: false, error: err.message ?? "Unknown error" };
    }
  };

  return { send, loading, accountAPI };
}
