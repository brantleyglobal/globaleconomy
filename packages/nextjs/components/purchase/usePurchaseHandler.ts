"use client";

import { useState, useEffect } from "react";
import { Interface } from "@ethersproject/abi";
import { toast } from "react-hot-toast";
import { parseUnits, formatUnits, Contract, ethers } from "ethers";
import assetPurchaseAbi from "~~/lib/contracts/abi/AssetPurchase.json";
import deployments from "~~/lib/contracts/deployments.json";
import type { ShippingInfo } from "~~/components/purchase/useCheckoutStore";
import { useCheckoutStore } from "~~/components/purchase/useCheckoutStore";
import { shippingRates, Region, ShippingCategory } from "~~/components/shipping/shippingRates";
import { supportedCountries } from "~~/components/shipping/supportedCountries";
import { sendPurchaseEmail } from "~~/components/email/sendPurchaseEmail"
import { getExchangeRates } from "~~/lib/exchangeRates";
import { sendTransferOnTargetChain, ensureGlobalChain } from "~~/utils/targetChain";
import { zeroAddress } from "viem";

type Hex = `0x${string}`;

interface InitiateParams {
  currentStep: number;
  paymentMethod: string;
  checkoutAsset: { id: number; name: string; variant: string;};
  estimatedTotal: string;
  tokenSymbol: string;
  customizations: string;
  bytes32Config: string;
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
        affiliate: "",
        commission: parseFloat(estimatedTotal) || null,
        payout: "",
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
  const shippingAddress = params.shippingInfo.address;
  const city = params.shippingInfo.city;
  const state = params.shippingInfo.state;
  const zip = params.shippingInfo.postalCode;
  const country = params.shippingInfo.country;
  const category = determineCategory(params.quantity, params.checkoutAsset.variant);
  const shippingRate = getShippingRate(region, category);

  const {
    firstname = "",
    lastname = "",
    address = "",
    phone = "",
    email = "",
    promo = "",
    postalCode = "",
  } = useCheckoutStore.getState().shippingInfo ?? {};

  let productAmountCents = Math.round(parseFloat(params.estimatedTotal) * 100);
  if (promo) {
    productAmountCents = productAmountCents - 100; // apply discount
  }

  let productAmount = parseFloat(params.estimatedTotal);
  if (promo) {
    productAmount = productAmount - 100; // apply discount
  }

  /* Affiliate Logic */
  let affiliateAddress;
  let commissionAmount;
  let payout = "";
  if (promo != "") {

    if (params.checkoutAsset.variant === "eseries"){
      commissionAmount = productAmount * .03;
    } else if (params.checkoutAsset.variant === "xseries"){
      commissionAmount = productAmount * .01;
    } else {
      commissionAmount = 0;
    }

    payout = "pending";
  }

  // Stripe requires cents (integer)
  const amountInCents = Math.round(productAmount * 100);
  const shippingAmountCents = shippingRate ? Math.round(shippingRate.Rate) : 0;
  const totalAmountCents = productAmountCents + shippingAmountCents;
  //console.log("shipping", shippingAmountCents);

  // Save params for post-checkout return
  localStorage.setItem("checkoutParams", JSON.stringify(sanitize(params)));
  localStorage.setItem("returnFromStripe", "true");

  const parsedConfig = JSON.parse(params.configuration);
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

  const totalAmount = parseUnits(totalAmountCents.toFixed(2), 18);
  const customizationTotal = parseUnits(params.customizations, 18);
  const shippingTotal = parseUnits(shippingAmountCents.toFixed(2), 18);
  const commmissionTotal = parseUnits(commissionAmount!.toFixed(2), 18);

  let commissionPaid = "";
  if ( affiliateAddress !== zeroAddress && promo!) {
    commissionPaid = "Commission Pending";
  }

  // Step 5: Log purchase to backend
  const purchasePayload = {
    contractaddress: deployments.AssetPurchase.toString(),
    txhash: "",
    receipthash: "",
    useraddress: "",
    affiliate: promo,
    asset: params.checkoutAsset.id,
    amount: totalAmount,
    exchangerate: "",
    shipping: shippingTotal,
    customizations: customizationTotal || "",
    quantity: params.quantity,
    configs: serializedConfig,
    paymentmethod: "stripe",
    address: shippingAddress,
    city: city,
    state: state,
    zip: zip,
    country,
    region,
    carrier: "",
    trackingnumber: "",
    commission: commmissionTotal,
    payout: commissionPaid,
    refund: false,
    refundhash: "",
    status: "pending",
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
    customizations,
    bytes32Config,
    value,
    paymentMethod,
    tokenSymbol,
    tokenRate,
    configuration,
    provider,
  } = params;

  try {
    // Step 1: Encode calldata for asset purchase

    await ensureGlobalChain(window.ethereum);

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
    const shippingAddress = params.shippingInfo.address;
    const city = params.shippingInfo.city;
    const state = params.shippingInfo.state;
    const zip = params.shippingInfo.postalCode;
    const country = params.shippingInfo.country;
    const category = determineCategory(quantity, checkoutAsset.variant);
    const shippingRate = getShippingRate(region, category);

    // Shipping cost in fiat dollars (e.g., USD)
    const shippingCost = shippingRate ? (shippingRate.Rate * quantity) : 0;

    const {
      firstname = "",
      lastname = "",
      address = "",
      phone = "",
      email = "",
      promo = "",
      postalCode = "",
    } = useCheckoutStore.getState().shippingInfo ?? {};

    // Convert estimated total string to number (fiat dollars)
    let productAmount = parseFloat(estimatedTotal);
    if (promo){
      productAmount = parseFloat(estimatedTotal) - 500;
    }

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
    const totalTokenAmount = parseUnits(totalTokenAmountFloat.toFixed(18), 18);
    const shipping = parseUnits(shippingCostFloat.toString(), 18);

    // Also parse with limited 2 decimals (for display rounding / testing)
    const totalTokenAmountF = parseUnits(totalTokenAmountFloat.toFixed(2), selectedToken.decimals);

    const precision = selectedToken.decimals; // e.g. 6, 8, 10
    const exchangeRateStr = exchangeRateFloat.toFixed(precision);
    const exchangeRate = parseUnits(exchangeRateStr, precision);

    // Format totalTokenAmountF back to float for display
    const totalTokenAmountNumber = parseFloat(formatUnits(totalTokenAmountF, precision));

    const totalTokenAmountDisplay = totalTokenAmountNumber.toFixed(2);
    const ts = Math.floor(Date.now() / 1000);
    const now = ts.toString();

    let dTxHash: string = "";
    let receipt2: any = null;
    let chainStatus = false;

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
      holdingWalletAddress = process.env.NEXT_PUBLIC_ASSETPURCHASE!;
    }

    /*************** CROSS CHAIN TRANSFER CALL ***************/
    
    if (!provider) {
      throw new Error("No provider available");
    }

    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
      
    // Find selected token's rate from rates array
    const rate = parseUnits(exchangeRateFloat.toFixed(18), selectedToken.decimals);

    const purchaseContract = new Contract(deployments.AssetPurchase, assetPurchaseAbi.abi, signer);
    const customizationTotal = parseUnits(customizations, 18);
    /* Affiliate Logic */
    let affiliateAddress = promo;
    let commissionAmount = 0;
    let payout = "";
    if (promo != ""){

      if (checkoutAsset.variant === "eseries"){
        commissionAmount = productAmount * .03;
      } else if (checkoutAsset.variant === "xseries"){
        commissionAmount = productAmount * .01;
      } else {
        commissionAmount = 0;
      }

      payout = "pending";
    }

    const commmissionTotal = parseUnits(commissionAmount!.toFixed(2), 18);
    
    if (selectedToken.symbol == "GBDo") {
      try {
        const txResponse = await purchaseContract.purchase!(
          holdingWalletAddress,
          selectedToken,
          checkoutAsset.id,
          totalTokenAmount,
          shipping,
          customizationTotal,
          bytes32Config,
          quantity,
          exchangeRate,
          affiliateAddress,
          commmissionTotal,
          region,
          ethers.ZeroHash,
          ts,
          {
            value: totalTokenAmount,
            gasLimit: 3_000_000
          }
          
        );
        receipt2 = await txResponse.wait();
        dTxHash = txResponse.hash;
        chainStatus = true;
      } catch (err) {
        console.error("Xchange Creation failed")
      }

      console.log("after try/catch")
      
    } else {
      
      ({ dTxHash, receipt2 } = await sendTransferOnTargetChain(
        holdingWalletAddress,
        totalTokenAmount,
        {
          address: selectedToken.address!,
          decimals: selectedToken.decimals,
          symbol: selectedToken.symbol,
          chain: selectedToken.chain,
        },
        provider // pass provider here
      ));
    }

    // Step 5: Log purchase to backend
    const purchasePayload = {
      contractaddress: deployments.AssetPurchase.toString(),
      txhash: dTxHash?.toString() || "",
      receipthash: receipt2?.toString() || "",
      useraddress: userAddress,
      affiliate: affiliateAddress || "",
      asset: checkoutAsset.id,
      amount: totalTokenAmount.toString(),
      shipping: shipping.toString(),
      customizations: customizationTotal.toString(),
      exchangerate: exchangeRate.toString(),
      quantity,
      configs: bytes32Config,
      paymentmethod: tokenSymbol,
      address: shippingAddress,
      city,
      state,
      zipcode: zip,
      country,
      region, 
      commission: commmissionTotal.toString() || "",
      payout,
      refund: false,
      refundhash: "",
      status: "accepted",
      chainstatus: chainStatus,
      queuedat: now,
      processedat: now,
      timestamp: now,
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
        promo = "",
        postalCode = "",
      } = useCheckoutStore.getState().shippingInfo ?? {};

      const formattedAmount = totalTokenAmountNumber.toFixed(2);
      const parsedConfig = JSON.parse(configuration);
      const selectedVariations = parsedConfig?.system?.selectedVariations ?? {};
      const customizeKey = parsedConfig?.system?.customizeGroupKey;
      const output = parsedConfig?.output ?? {};

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
        tx: dTxHash,
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
        receipt: dTxHash || "",
        promo: promo || "",
        purchaseMadeEvents: [purchaseMade],
      });
    } else {
      console.warn("Purchase logging failed or returned unexpected response.");
    }

    const finalHashString = typeof dTxHash === "string" ? dTxHash : (dTxHash || "");

    if (finalHashString) {
      useCheckoutStore.getState().setField('txhash', finalHashString);
    }

    toast.success("Transaction successful.");
  } catch (err: any) {
    console.error("Purchase error:", err);

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


