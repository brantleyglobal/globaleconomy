"use client";

import { Interface } from "@ethersproject/abi";
import { toast } from "react-hot-toast";
import { parseUnits } from "@ethersproject/units";
import { hexlify } from "ethers/lib/utils";
import { ethers } from "ethers";
import { SimpleAccountAPI } from "@account-abstraction/sdk";
import { customEncodeMultiSend } from "~~/lib/utils/customEncodeMultiSend";
import assetPurchaseAbi from "~~/lib/contracts/abi/AssetPurchase.json";
import deployments from "~~/lib/contracts/deployments.json";
import { loadStripe } from "@stripe/stripe-js";

type Hex = `0x${string}`;

interface InitiateParams {
  currentStep: number;
  paymentMethod: string;
  checkoutAsset: { id: number; name: string };
  estimatedTotal: string;
  tokenSymbol: string;
  quantity: number;
  toast: typeof toast;
  publicClient: {
    getBalance(args: { address: Hex }): Promise<bigint>;
    getTransactionReceipt(args: { hash: Hex }): Promise<any>;
  };
  userAddress: string;
  chainId: number;
  selectedToken: {
    symbol: string;
    address?: string;
    decimals: number;
  };
  value: string;
}

async function resolveHex(input: string | ethers.BytesLike | Promise<ethers.BytesLike>): Promise<Hex> {
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

export async function handleStripeReturn(): Promise<{
  checkoutAsset: any;
  estimatedTotal: string;
} | null> {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");
  const cancelled = urlParams.get("cancelled");
  const returning = localStorage.getItem("returnFromStripe") === "true";
  console.log(cancelled);

  if (sessionId || cancelled) {
    const savedParams = localStorage.getItem("checkoutParams");

    if (!savedParams) throw new Error("Missing saved checkout params");

    const parsedParams: InitiateParams = JSON.parse(savedParams);

    if (sessionId) {
      const {
        checkoutAsset,
        estimatedTotal,
        quantity,
        userAddress,
        paymentMethod,
      } = parsedParams;

      const purchasePayload = {
        contractaddress: null,
        calldata: null,
        txhash: "",
        receipthash: "",
        signature: "",
        smartwallet: null,
        useraddress: userAddress,
        asset: checkoutAsset.id,
        amount: parseFloat(estimatedTotal),
        quantity,
        paymentmethod: paymentMethod,
        status: "accepted",
        chainstatus: false,
        queuedat: new Date().toISOString(),
        processedat: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        priority: 0,
        retrycount: 0,
        notes: `Stripe Checkout completed | sessionId: ${sessionId}`,
      };

      await fetch("https://gateway.brantley-global.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "purchase",
          method: "recordPurchase",
          params: purchasePayload,
        }),
      });

      // Return the needed data for checkout continuation
      localStorage.removeItem("checkoutParams");
      localStorage.removeItem("returnFromStripe");

      return {
        checkoutAsset,
        estimatedTotal,
      };
    }

    if (cancelled) {
      console.log("Checkout was cancelled.");

      localStorage.removeItem("checkoutParams");
      localStorage.removeItem("returnFromStripe");

      // Still return the parsed data so the caller can handle cancellation
      return {
        checkoutAsset: parsedParams.checkoutAsset,
        estimatedTotal: parsedParams.estimatedTotal,
      };
    }
  }

  return null;
}

function sanitize(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

async function initiateStripeCheckout(params: InitiateParams) {
  const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  if (!stripe) throw new Error("Stripe failed to load");

  // Save params for post-checkout return
  localStorage.setItem("checkoutParams", JSON.stringify(sanitize(params)));
  localStorage.setItem("returnFromStripe", "true");

  // Prepare sanitized payload
  const payload = sanitize({
    jsonrpc: "2.0",
    id: "stripeSession",
    method: "createCheckoutSession",
    params: {
      product: params.checkoutAsset.name,
      assetId: params.checkoutAsset.id,
      quantity: params.quantity,
      amount: Math.round(parseFloat(params.estimatedTotal) * 100),
    },
  });

  // Call Cloudflare Worker
  const response = await fetch("https://globalfiat.brantley-global.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.NEXT_PUBLIC_STRIPE_KEY!,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Worker error: ${errorText}`);
  }

  const session = await response.json();
  if (!session?.sessionId) {
    console.error("Unexpected response:", session);
    throw new Error("Failed to create Stripe session");
  }

  await stripe.redirectToCheckout({ sessionId: session.sessionId });
}


async function handleCryptoPurchase(params: InitiateParams) {
  const {
    checkoutAsset,
    estimatedTotal,
    quantity,
    toast,
    userAddress,
    selectedToken,
    value,
    paymentMethod,
    tokenSymbol,
  } = params;

  const accountAPI = await initSmartWallet();
  const smartWalletAddress = await accountAPI.getAccountAddress();

  toast.success(`Smart Wallet Initialized:\n${smartWalletAddress}`, {
    duration: 5000,
    position: "top-right",
    style: {
      whiteSpace: "pre-line",
      fontSize: "0.9rem",
      maxWidth: "400px",
      wordBreak: "break-word",
    },
  });

  const iface = new Interface(assetPurchaseAbi.abi);
  const isERC20 = selectedToken.symbol !== "WGBD" && !!selectedToken.address;
  const parsedValue = parseUnits(value, selectedToken.decimals);
  const calldata = iface.encodeFunctionData("purchase", [
    checkoutAsset.id,
    ethers.BigNumber.from(quantity),
    selectedToken.address ?? ethers.constants.AddressZero,
    parsedValue,
    userAddress,
  ]);

  const txs = [
    {
      to: deployments.AssetPurchase,
      value: isERC20 ? "0" : parsedValue.toString(),
      data: calldata,
    },
  ];

  const multiSendData = customEncodeMultiSend(txs);

  const userOp = {
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

  const purchasePayload = {
    contractaddress: deployments.AssetPurchase,
    calldata: calldataHex,
    txhash: "",
    receipthash: "",
    signature: signatureHex,
    smartwallet: smartWalletAddress,
    useraddress: userAddress,
    asset: checkoutAsset.id,
    amount: parseFloat(estimatedTotal),
    quantity,
    paymentmethod: tokenSymbol,
    status: "accepted",
    chainstatus: false,
    queuedat: new Date().toISOString(),
    processedat: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    priority: 0,
    retrycount: 0,
    notes: "Purchase Pending",
  };
  //Log Payload For Testing
  //console.log("Crypto Purchase Payload:\n", JSON.stringify(purchasePayload, null, 2));

  const res = await fetch("https://gateway.brantley-global.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "purchase",
      method: "recordPurchase",
      params: purchasePayload,
    }),
  });

  const contentType = res.headers.get("Content-Type") ?? "";
  if (res.ok && contentType.includes("application/json")) {
    const result = await res.json();
  } else {
    console.warn("Purchase logging failed or returned unexpected response.");
  }

  toast.success("Transaction successful.");
}

export async function initiatePurchase(params: InitiateParams): Promise<boolean> {
  try {
    if (params.paymentMethod === "cash") {
      await initiateStripeCheckout(params);
      return true;
    } else {
      await handleCryptoPurchase(params);
      return true;
    }
  } catch (err: any) {
    console.error("Purchase failed:", err);
    params.toast.error(err.message ?? "Something went wrong during purchase.");
    return false;
  }
}


