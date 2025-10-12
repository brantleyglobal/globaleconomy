"use client";

import { Interface } from "@ethersproject/abi";
import { toast } from "react-hot-toast";
import { parseUnits } from "@ethersproject/units";
import { hexlify } from "ethers/lib/utils";
import { ethers, Contract } from "ethers";
import assetPurchaseAbi from "~~/lib/contracts/abi/AssetPurchase.json";
import deployments from "~~/lib/contracts/deployments.json";
import { loadStripe } from "@stripe/stripe-js";
import erc20Abi from '@openzeppelin/contracts/build/contracts/ERC20.json';
import type { ShippingInfo } from "~~/components/purchase/useCheckoutStore";
import { useCheckoutStore } from "~~/components/purchase/useCheckoutStore";
import { shippingRates, Region, ShippingCategory } from "~~/components/shipping/shippingRates";
import { supportedCountries } from "~~/components/shipping/supportedCountries";
import { sendPurchaseEmail } from "~~/components/email/sendPurchaseEmail"
import { getExchangeRates } from "~~/lib/exchangeRates";

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
  };
  value: string;
  shippingInfo: ShippingInfo;
}

async function resolveHex(input: string | ethers.BytesLike | Promise<ethers.BytesLike>): Promise<Hex> {
  const resolved = await Promise.resolve(input);
  const hex = typeof resolved === "string" ? resolved : hexlify(resolved);
  if (!hex.startsWith("0x")) throw new Error("Resolved value is not a valid hex string");
  return hex as Hex;
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
  const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  if (!stripe) throw new Error("Stripe failed to load");

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
  console.log("shipping", shippingAmountCents);

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
      //amount: Math.round(parseFloat(params.estimatedTotal) * 100),
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
    tokenRate,
    configuration,
  } = params;

  try {
    // Step 1: Encode calldata for asset purchase
    const iface = new Interface(assetPurchaseAbi.abi);
    const isERC20 = selectedToken.symbol !== "GBDO" && !!selectedToken.address;
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

    // Total cost in fiat dollars including shipping
    const totalCost = productAmount + shippingCost;

    // Convert total cost in fiat to token units (scaled BigNumber)
    // tokenRate is token per USD, so multiply total USD by tokenRate to get token amount

    const { rates, gbdoRate } = await getExchangeRates();

    // Find selected token's rate from rates array
    const selectedTokenRateObj = rates.find(r => r.symbol === tokenSymbol);

    if (!selectedTokenRateObj) {
      throw new Error(`Exchange rate for token symbol ${tokenSymbol} not found`);
    }

    const tokenRate = selectedTokenRateObj.rate; // rate of selected token

    const exchangeRateFloat = gbdoRate / tokenRate;
    console.log("exchangeRateFloat (gbdoRate / tokenRate):", exchangeRateFloat);

    const totalTokenAmountFloat = totalCost * exchangeRateFloat;

    // Convert to ethers.BigNumber assuming 18 decimals (full precision)
    const totalTokenAmount = ethers.utils.parseUnits(totalTokenAmountFloat.toFixed(18), 18);

    // Also parse with limited 2 decimals (for display rounding / testing)
    const totalTokenAmountF = ethers.utils.parseUnits(totalTokenAmountFloat.toFixed(2), 18);

    const exchangeRate = ethers.utils.parseUnits(exchangeRateFloat.toFixed(18), 18);

    // Format totalTokenAmountF back to float for display
    const totalTokenAmountNumber = parseFloat(ethers.utils.formatUnits(totalTokenAmountF, 18));

    const totalTokenAmountDisplay = totalTokenAmountNumber.toFixed(2);
    console.log("totalTokenAmountDisplay (string with 2 decimals):", totalTokenAmountDisplay);

    const calldata = iface.encodeFunctionData("purchase", [
      userAddress,
      selectedToken.address,
      checkoutAsset.id,
      totalTokenAmount,
      ethers.BigNumber.from(quantity),
      exchangeRate,
      region,
    ]);

    console.log("Total Amount:", totalTokenAmountFloat);

    // Step 2: Connect to wallet
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const signerAddress = await signer.getAddress();
    console.log("Connected wallet:", signerAddress);

    if (!selectedToken.address) {
      throw new Error("Token address is undefined");
    }

    const stablecoinContract = new Contract(selectedToken.address, erc20Abi.abi, signer);
    
    console.log("Approving vault to spend stablecoin...");
    const approveTx = await stablecoinContract.approve(deployments.AssetPurchase, totalTokenAmount);
    await approveTx.wait();
    console.log("Stablecoin approved");

    const eventFragment = assetPurchaseAbi.abi.find((frag: any) => frag.name === "PurchaseMade" && frag.type === "event");

    const formattedAmount = totalTokenAmountNumber?.toString();
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

    // Step 3: Send transaction directly to contract
    const tx = await signer.sendTransaction({
      to: deployments.AssetPurchase,
      value: 0n,
      data: calldata,
      gasLimit: ethers.BigNumber.from(100_000),
    });

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    // Step 5: Log purchase to backend
    const purchasePayload = {
      contractaddress: deployments.AssetPurchase.toString(),
      txhash: tx.hash,
      receipthash: receipt.blockHash,
      useraddress: userAddress,
      asset: checkoutAsset.id,
      amount: totalTokenAmountDisplay,
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

      const purchaseMadeEvents = receipt.logs
        .map(log => {
          try {
            return iface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter(parsed => parsed && parsed.name === "PurchaseMade");

      await sendPurchaseEmail({
        firstname,
        lastname,
        email,
        tx,
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
        receipt: receipt.blockHash,
        purchaseMadeEvents,
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


