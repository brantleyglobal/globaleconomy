"use client";

import { useState, useEffect } from "react";
import { Interface } from "@ethersproject/abi";
import { toast } from "react-hot-toast";
import { parseUnits, formatUnits } from "ethers";
import assetPurchaseAbi from "~~/lib/contracts/abi/AssetPurchase.json";
import deployments from "~~/lib/contracts/deployments.json";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import type { ShippingInfo } from "~~/components/purchase/useCheckoutStore";
import { useCheckoutStore } from "~~/components/purchase/useCheckoutStore";
import { shippingRates, Region, ShippingCategory } from "~~/components/shipping/shippingRates";
import { supportedCountries } from "~~/components/shipping/supportedCountries";
import { sendPurchaseEmail } from "~~/components/email/sendPurchaseEmail"
import { getExchangeRates } from "~~/lib/exchangeRates";
import { Address } from "viem";
import { useSelectedTokenBalance } from "~~/lib/chainHelper";
import { sendTransferOnTargetChain } from "~~/utils/targetChain";

type Hex = `0x${string}`;

interface InitiateParams {
  currentStep: number;
  paymentMethod: string;
  checkoutAsset: { id: number; name: string; variant: string;};
  estimatedTotal: string;
  tokenSymbol: string;
  quantity: number;
  tokenRate: number;
  configuration: string;
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
    decimals?: number;
    chain?: string
  };
  value: string;
  shippingInfo: ShippingInfo;
  provider?: any,
}

interface BitcoinWallet {
  sendTransaction: (to: string, amount: number) => Promise<string>;
}

type TxResult = {
  txHash: string;
  receipt: any | null;
};

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
        region: "",
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

function determineCategory(quantity: number, variant: string): ShippingCategory {
  return variant.toLowerCase().startsWith("xseries") ? "heavy" : "standard";
}

function mapCountryToRegion(countryCode: string): Region {
  const country = supportedCountries.find(c => c.code === countryCode);
  return country ? country.region : Region.NorthAmerica; // default fallback region
}

async function initiateStripeCheckout(params: InitiateParams) {
  const getShippingRate = (region: Region, category: ShippingCategory) => {
    return shippingRates.find(
      (rate) => rate.region === region && rate.category === category
    );
  };

  const region = mapCountryToRegion(params.shippingInfo.country);
  const category = determineCategory(params.quantity, params.checkoutAsset.variant);
  const shippingRate = getShippingRate(region, category);

  const productAmountCents = Math.round(parseFloat(params.estimatedTotal) * 100);
  const shippingAmountCents = shippingRate ? Math.round(shippingRate.Rate) : 0;
  const totalAmountCents = productAmountCents + shippingAmountCents;
  //console.log("shipping", shippingAmountCents);

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
      amount: totalAmountCents,
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
  if (!session?.url) {
    console.error("Unexpected response:", session);
    throw new Error("Failed to create Stripe session");
  }

  // Redirect using window.location.href
  window.location.href = session.url;
}

function useWalletProvider() {
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

  return { provider, walletName };
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
    tokenRate,
    configuration,
    provider,
  } = params;

  try {
    // Step 1: Encode calldata for asset purchase

    const btcWallet: BitcoinWallet = {
      sendTransaction: async (to, amount) => {
        if (!window.xfi?.bitcoin) {
          throw new Error("XDEFI Bitcoin wallet not available");
        }
        return await window.xfi.bitcoin.sendTransaction(to, amount);
      },
    };
    const iface = new Interface(assetPurchaseAbi.abi);
    const isERC20 = selectedToken.symbol !== "GBDo" && !!selectedToken.address;
    const parsedValue = parseUnits(value, 18);
    const dbval = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(value));
    //console.log("current rate:", tokenRate);

   const getShippingRate = (region: Region, category: ShippingCategory) => {
      return shippingRates.find(
        (rate) => rate.region === region && rate.category === category
      );
    };
    const region = mapCountryToRegion(params.shippingInfo.country);
    const category = determineCategory(quantity, checkoutAsset.variant);
    const shippingRate = getShippingRate(region, category);

    // Shipping cost in fiat dollars (e.g., USD)
    const shippingCost = shippingRate ? (shippingRate.Rate * quantity) : 0;

    // Convert estimated total string to number (fiat dollars)
    const productAmount = parseFloat(estimatedTotal);

    // Convert total cost in fiat to token units (scaled BigNumber)
    // tokenRate is token per USD, so multiply total USD by tokenRate to get token amount

    const { rates, gbdoRate } = await getExchangeRates();

    // Find selected token's rate from rates array
    let exchangeRateFloat: number;
    if (selectedToken.symbol === "GBDo") {
      exchangeRateFloat = 1;
    } else if (selectedToken.symbol === "WBNB") {
      exchangeRateFloat = 900;
    } else if (selectedToken.symbol === "WBTC") {
      exchangeRateFloat = 90000;
    } else if (selectedToken.symbol === "WETH") {
      exchangeRateFloat = 3000;
    } else {
      const selectedTokenRateObj = rates.find(r => r.symbol === tokenSymbol);

      if (!selectedTokenRateObj) {
        throw new Error(`Exchange rate for token symbol ${tokenSymbol} not found`);
      }
      const tokenRate = selectedTokenRateObj.rate;
      exchangeRateFloat = (gbdoRate / tokenRate);
    }

    const shippingCostFloat = shippingCost * exchangeRateFloat;

    const totalTokenAmountFloat = productAmount + shippingCostFloat

    // Convert to ethers.BigNumber assuming 18 decimals (full precision)
    const totalTokenAmount = parseUnits(totalTokenAmountFloat.toString(), 18);

    // Also parse with limited 2 decimals (for display rounding / testing)
    const totalTokenAmountF = parseUnits(totalTokenAmountFloat.toFixed(2), selectedToken.decimals);

    const precision = selectedToken.decimals; // e.g. 6, 8, 10
    const exchangeRateStr = exchangeRateFloat.toFixed(precision);
    const exchangeRate = parseUnits(exchangeRateStr, precision);

    //console.log(exchangeRate);

    // Format totalTokenAmountF back to float for display
    const totalTokenAmountNumber = parseFloat(formatUnits(totalTokenAmountF, 18));

    const totalTokenAmountDisplay = totalTokenAmountNumber.toFixed(2);

    let callAddress;
    if (selectedToken.symbol === "ETH") {
      callAddress = 0x00000000000000000000000000000000000000E0
    } else if (selectedToken.symbol === "BTC"){
      callAddress = 0x00000000000000000000000000000000000000b0;
    } else {
      callAddress = selectedToken.address;
    }

    const calldata = iface.encodeFunctionData("purchase", [
      userAddress,
      callAddress,
      checkoutAsset.id,
      totalTokenAmount,
      BigInt(quantity),
      exchangeRate,
      region,
    ]);

    const purchaseMade = {
      userAddress,
      id: checkoutAsset.id,
      quantity,
      exchangeRate,
      totalTokenAmount,
      region,
    };

    //console.log("Total Amount:", totalTokenAmountFloat);
    
    if (!selectedToken.address) {
      throw new Error("Token address is undefined");
    }

    const parsedConfig = JSON.parse(configuration);
    const selectedVariations = parsedConfig?.system?.selectedVariations ?? {};
    const customizeKey = parsedConfig?.system?.customizeGroupKey;
    const output = parsedConfig?.output ?? {};

    let formattedConfig: string;

    if (customizeKey && selectedVariations[customizeKey]?.label === "Customize") {
      const voltage = output.selectedVoltage ? `${output.selectedVoltage}V` : null;
      const frequency = output.selectedFrequency;
      const phase = output.selectedPhase;

      formattedConfig = [voltage, frequency, phase]
        .filter(Boolean)
        .map(String) // ensure all values are strings
        .join(" / ");
    } else {
      formattedConfig = Object.values(selectedVariations)
        .map(v => (v as { label: string }).label)
        .filter(Boolean)
        .join(" / ");
    }
    
    const serializedConfig = JSON.stringify(formattedConfig);

    let holdingWalletAddress;
    if (selectedToken.symbol === "BTC"){
      holdingWalletAddress = process.env.NEXT_PUBLIC_BITCOLLECTOR_ADDRESS!;
    } else {        
      holdingWalletAddress = deployments.AssetPurchase;
    }

    /*************** CROSS CHAIN TRANSFER CALL ***************/
    //console.log("Selected token:", selectedToken.symbol, selectedToken.chain, selectedToken.address);
    
    if (!provider) {
      throw new Error("No provider available");
    }
    const { txHash, receipt } = await sendTransferOnTargetChain(
      holdingWalletAddress,
      totalTokenAmount,
      {
        address: selectedToken.address!,
        decimals: selectedToken.decimals,
        symbol: selectedToken.symbol,
        chain: selectedToken.chain,
      },
      btcWallet,
      provider // pass provider here
    );

    // Step 5: Log purchase to backend
    const purchasePayload = {
      contractaddress: deployments.AssetPurchase.toString(),
      txhash: txHash || "",
      receipthash: receipt?.blockHash || "",
      useraddress: userAddress,
      asset: checkoutAsset.id,
      amount: totalTokenAmount,
      exchangerate: tokenRate,
      quantity,
      configs: serializedConfig,
      paymentmethod: tokenSymbol,
      region, 
      status: "accepted",
      chainstatus: true,
      queuedat: new Date().toISOString(),
      processedat: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      priority: 0,
      retrycount: 0,
      notes: "Purchase Submitted",
    };

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
      console.log("Purchase logged:", result);

      const {
        firstname = "",
        lastname = "",
        address = "",
        phone = "",
        email = "",
        country = "",
        postalCode = "",
      } = useCheckoutStore.getState().shippingInfo ?? {};

      const formattedAmount = totalTokenAmountNumber.toFixed(2);
      const parsedConfig = JSON.parse(configuration);
      const selectedVariations = parsedConfig?.system?.selectedVariations ?? {};
      const customizeKey = parsedConfig?.system?.customizeGroupKey;
      const output = parsedConfig?.output ?? {};

      let formattedConfig: string;

      if (customizeKey && selectedVariations[customizeKey]?.label === "Customize") {
        const voltage = output.selectedVoltage ? `${output.selectedVoltage}V` : null;
        const frequency = output.selectedFrequency;
        const phase = output.selectedPhase;

        formattedConfig = [voltage, frequency, phase]
          .filter(Boolean)
          .map(String)
          .join(" / ");
      } else {
        formattedConfig = Object.values(selectedVariations)
          .map(v => (v as { label: string }).label)
          .filter(Boolean)
          .join(" / ");
      }

      await sendPurchaseEmail({
        firstname,
        lastname,
        email,
        tx: txHash,
        checkoutAsset,
        quantity,
        totalTokenAmount: formattedAmount,
        userAddress,
        tokenSymbol,
        configuration: formattedConfig,
        address,
        phone,
        country,
        postalCode,
        receipt: receipt?.blockHash || "",
        purchaseMadeEvents: [purchaseMade],
      });
    } else {
      console.warn("Purchase logging failed or returned unexpected response.");
    }

    toast.success("Transaction successful.");
  } catch (err: any) {
    const revertReason =
      err?.error?.data?.message ||
      err?.data?.message ||
      err?.reason ||
      err?.message ||
      "Unknown error";

    console.error("Purchase failed:", revertReason);

    throw new Error(revertReason);
  }

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


