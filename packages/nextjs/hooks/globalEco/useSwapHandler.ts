"use client";
import { Interface } from "@ethersproject/abi";
import { toast } from "react-hot-toast";
import { parseUnits } from "@ethersproject/units";
import { hexlify } from "ethers/lib/utils";
import { ethers, BytesLike } from "ethers";
import { SimpleAccountAPI } from "@account-abstraction/sdk";
import { customEncodeMultiSend } from "~~/lib/utils/customEncodeMultiSend";
import swapGateway from "~~/lib/contracts/abi/StableSWapGateway.json";
import deployments from "~~/lib/contracts/deployments.json";
import { useAccount } from "wagmi";


type Hex = `0x${string}`;
type Direction = "toGBD" | "fromGBD";

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

interface TokenType {
  address?: string;
  symbol?: string;
  decimals: number;
}

interface SwapHandlerConfig {
  address: string;
  chainId: number;
  selectedToken: TokenType;
  amountin: bigint;
  amountout: bigint;
  direction: Direction;
  exchangerate: number;
}

async function resolveHex(input: string | BytesLike | Promise<BytesLike>): Promise<Hex> {
  const resolved = await Promise.resolve(input);
  const hex = typeof resolved === "string" ? resolved : hexlify(resolved);
  if (!hex.startsWith("0x")) throw new Error("Resolved value is not a valid hex string");
  return hex as Hex;
}

async function initSmartWallet(): Promise<SimpleAccountAPI> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Ethereum provider not available");
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  return new SimpleAccountAPI({
    provider,
    entryPointAddress: deployments.EntryPoint,
    owner: signer,
    factoryAddress: deployments.SimpleAccountFactory,
  });
}

export function useSwapHandler(config: SwapHandlerConfig) {
  const { address: connectedAddress } = useAccount();
  const handleSwap = async () => {
    const { address, chainId, selectedToken, amountin, amountout, exchangerate, direction } = config;
    const userAddress = connectedAddress ?? config.address;

    if (!address || !chainId || !selectedToken.address || !selectedToken.decimals || !direction) {
      toast.error("Swap unavailable — wallet or config incomplete.");
      return;
    }

    try {
      const accountAPI = await initSmartWallet();
      const smartWalletAddress = await accountAPI.getAccountAddress();

      const iface = new Interface(swapGateway.abi);
      const parsedAmount = parseUnits(amountin.toString(), selectedToken.decimals);

      const calldata =
        direction === "toGBD"
          ? iface.encodeFunctionData("swapStableForGBD", [selectedToken.address, parsedAmount])
          : iface.encodeFunctionData("swapGBDForStable", [selectedToken.address, parsedAmount]);

      const txs = [
        {
          to: deployments.StableSwapGateway,
          value: "0",
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
      const calldataHex = await resolveHex(signedUserOp.callData);
      const signatureHex = await resolveHex(signedUserOp.signature);

      /*const txHash = ethers.utils.keccak256(calldataHex);
      const receiptHash = ethers.utils.keccak256(signatureHex);*/

      const swapPayload = {
        contractaddress: deployments.StableSwapGateway,
        calldata: calldataHex,
        txhash: "",
        receipthash: "",
        signature: signatureHex,
        useraddress: userAddress,
        smartwallet: smartWalletAddress,
        selectedtoken: selectedToken,
        direction,
        amountin,
        amountout, // or calculate based on swap logic
        exchangerate,
        status: "queued",
        chainstatus: true,
        timestamp: new Date().toISOString(),
        queuedat: new Date().toISOString(),
        processedat: new Date().toISOString(),
        priority: 0,
        retrycount: 0,
        notes: "Swap intent captured"
      };

      const res = await fetch("https://gateway.brantley-global.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_API_SECRET! // optional, if your Worker requires it
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "swap",
          method: "executeSwap",
          params: swapPayload
        }),
      });

      const contentType = res.headers.get("Content-Type") ?? "";
      if (res.ok && contentType.includes("application/json")) {
        const result = await res.json();
      }else {
        console.warn("Swap logging failed or returned unexpected response.");
      }

      toast.success("Swap intent captured.");
    } catch (err: any) {
      console.error("Swap failed:", err);
      toast.error(err.message ?? "Something went wrong during swap.");
    }
  };

  return { handleSwap };
}
