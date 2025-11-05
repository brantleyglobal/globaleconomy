"use client";

import { Interface } from "@ethersproject/abi";
import { toast } from "react-hot-toast";
import { ethers, Contract, parseUnits, BrowserProvider, isAddress, formatUnits } from "ethers";
import assetPurchaseAbi from "~~/lib/contracts/abi/AssetPurchase.json";
import deployments from "~~/lib/contracts/deployments.json";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import erc20Abi from '@openzeppelin/contracts/build/contracts/ERC20.json';
import type { ShippingInfo } from "~~/components/purchase/useCheckoutStore";
import { useCheckoutStore } from "~~/components/purchase/useCheckoutStore";
import { shippingRates, Region, ShippingCategory } from "~~/components/shipping/shippingRates";
import { supportedCountries } from "~~/components/shipping/supportedCountries";
import { sendPurchaseEmail } from "~~/components/email/sendPurchaseEmail"
import { getExchangeRates } from "~~/lib/exchangeRates";
import { Address } from "viem";
import { useSelectedTokenBalance } from "~~/lib/chainHelper";

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

interface BitcoinWallet {
  sendTransaction: (to: string, amount: number) => Promise<string>;
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

async function sendTransferOnTargetChain(recipient: string, tamount: bigint, selectedToken: { address?: string, decimals?: number, symbol?: string }, btcWallet?: BitcoinWallet) {
  if (!selectedToken.address) throw new Error("Token address required");

  const myChainSupportedTokenAddresses = new Set<Address>([
    deployments.Copian,
    deployments.GlobalDollarX,
    deployments.GlobalDollar,
    deployments.BGFFS,
    deployments.BGFRS,
    deployments.TGMX,
    deployments.TGUSA,
    deployments.Globe,
  ]);

  const polyAddresses = new Set<Address>([
    "0x5C067C80C00eCd2345b05E83A3e758eF799C40B5",
    "0x6AE7Dfc73E0dDE2aa99ac063DcF7e8A63265108c",
  ]);

  const isOnMyChain = myChainSupportedTokenAddresses.has(selectedToken.address as Address);
  const isOnPoly = polyAddresses.has(selectedToken.address as Address);
  const isBitcoin = selectedToken.symbol === "BTC";
  const isOnEthChain = !isOnMyChain && !isOnPoly && !isBitcoin;


  let selectedTokenChainId: number;
  let chain: "global" | "polygon" | "ethereum" | "bitcoin";
  if (isBitcoin) {
    selectedTokenChainId = 0; // optional placeholder
    chain = "bitcoin";
  } else if (isOnMyChain) {
    selectedTokenChainId = 3503995874081207;
    chain = "global";
  } else if (isOnPoly) {
    selectedTokenChainId = 137;
    chain = "polygon";
  } else {
    selectedTokenChainId = 1;
    chain = "ethereum";
  }

  console.log("checking3");

  // Validate recipient and amount
  const to = recipient;
  const amount = tamount;

  let receipt;

  // Helper to await the chainChanged event matching the target network
  async function waitForChainChanged(expectedChainIdHex: string): Promise<void> {
    const start = Date.now();

    while (true) {
      if (!window.ethereum) {
        throw new Error("No Ethereum provider found. Please install MetaMask.");
      }
      const currentChainId = await window.ethereum.request({ method: "eth_chainId" });

      if (currentChainId === expectedChainIdHex) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 250)); // Poll every 250ms
    }
  }

  async function waitForBitcoinReady(timeoutMs = 10000): Promise<void> {
    const start = Date.now();

    while (true) {
      if (!window.xfi || !window.xfi.bitcoin) {
        throw new Error("XDEFI Bitcoin provider not found. Please install or enable XDEFI Wallet.");
      }

      try {
        const address = await window.xfi.bitcoin.getAddress();
        if (address) {
          return; // Wallet is ready
        }
      } catch (err) {
        // Wallet not ready yet — keep polling
      }

      if (Date.now() - start > timeoutMs) {
        throw new Error("Timeout waiting for XDEFI Bitcoin wallet to become ready.");
      }

      await new Promise(resolve => setTimeout(resolve, 250)); // Poll every 250ms
    }
  }

  if (chain === "bitcoin") {
    if (!btcWallet) throw new Error("Bitcoin wallet not connected");

    const humanAmount = formatUnits(tamount, 18);
    const sats = parseUnits(humanAmount, 8);
    await waitForBitcoinReady();
    const txid = await btcWallet.sendTransaction(recipient, Number(sats));
    console.log("Bitcoin TXID:", txid);
    return txid;
  } else {

    if (!isAddress(to)) throw new Error("Invalid recipient address");
    if (!amount) throw new Error("Amount missing");

    const hexChainId = "0x" + selectedTokenChainId.toString(16);

    if (!window.ethereum) throw new Error("MetaMask not detected");

    const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
    if (currentChainId !== hexChainId) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexChainId }],
        });
        await waitForChainChanged(hexChainId);
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          throw new Error("Requested chain is not available in MetaMask. Please add it manually.");
        } else {
          throw switchError;
        }
      }
    }

    console.log(selectedTokenChainId);

    // Continue with contract, amount formatting and sending as you currently do:
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();

    if (Number(network.chainId) !== selectedTokenChainId) {
      console.log(`MetaMask is connected to the wrong network: ${network.chainId}`);
    }

    const tokenContract = new ethers.Contract(selectedToken.address, erc20Abi.abi, signer);

    const humanReadable = formatUnits(amount, 18);
    const amountBN = parseUnits(humanReadable, selectedToken.decimals);
    
    const tx = await tokenContract.transfer(to, amountBN, { gasLimit: 50_000 } );
    receipt = await tx.wait();
    console.log("Status:", receipt.status ? "Success" : "Failed");
  }
  selectedTokenChainId = 3503995874081207;

  const resethexChainId = "0x" + selectedTokenChainId.toString(16);
  const homeChainId = 3503995874081207;
  const homeHexChainId = "0x" + homeChainId.toString(16);


  const resetChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (resetChainId !== homeHexChainId) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: resethexChainId }],
      });
      await waitForChainChanged(resethexChainId);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        throw new Error("Requested chain is not available in MetaMask. Please add it manually.");
      } else {
        throw switchError;
      }
    }
  }    

  return receipt.transactionHash;
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
    const totalTokenAmount = parseUnits(totalTokenAmountFloat.toString(), 18);

    // Also parse with limited 2 decimals (for display rounding / testing)
    const totalTokenAmountF = parseUnits(totalTokenAmountFloat.toFixed(2), selectedToken.decimals);

    const exchangeRate = parseUnits(exchangeRateFloat.toFixed(18), selectedToken.decimals);

    // Format totalTokenAmountF back to float for display
    const totalTokenAmountNumber = parseFloat(formatUnits(totalTokenAmountF, 18));

    const totalTokenAmountDisplay = totalTokenAmountNumber.toFixed(2);
    console.log("totalTokenAmountDisplay (string with 2 decimals):", totalTokenAmountDisplay);

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

    console.log("Total Amount:", totalTokenAmountFloat);
    
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
      holdingWalletAddress = process.env.NEXT_PUBLIC_COLLECTOR_ADDRESS!;
    }

    /*************** CROSS CHAIN TRANSFER CALL ***************/
    const txHashOnTarget = await sendTransferOnTargetChain(holdingWalletAddress, totalTokenAmount, {
      address: selectedToken.address!,
      decimals: selectedToken.decimals,
      symbol: selectedToken.symbol,
    });

    // Step 2: Connect to wallet
    if (!window.ethereum) {
      throw new Error("No Ethereum provider found. Please install MetaMask.");
    }
    const provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    console.log("Connected wallet:", signerAddress);

    /*************** SOURCE CHAIN TRANSFER CALL ***************/

    // Step 3: Send transaction directly to contract
    const tx = await signer.sendTransaction({
      to: deployments.AssetPurchase,
      value: 0n,
      data: calldata,
      gasLimit: 1_500_000n,
    });

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt?.blockNumber);

    let amountToSend;
    if (!receipt) {
      throw new Error("No Receipt Generated");
    }
    for (const log of receipt.logs) {
      try {
        const mutableTopics = [...log.topics];
        const parsed = iface.parseLog({ topics: mutableTopics, data: log.data });
        if (parsed.name === "PurchaseMade") {
          amountToSend = parsed.args.baseAmount ?? parsed.args[0];
          break;
        }
      } catch {
        // Ignore error for non-matching logs
      }
    }

    console.log(`Token transferred on chain for ${selectedToken.symbol}`);

    // Step 5: Log purchase to backend
    const purchasePayload = {
      contractaddress: deployments.AssetPurchase.toString(),
      txhash: tx.hash,
      receipthash: receipt?.blockHash,
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

      const purchaseMadeEvents = receipt?.logs
      .map(log => {
        try {
          return iface.parseLog({
            topics: [...log.topics],
            data: log.data,
          });
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


