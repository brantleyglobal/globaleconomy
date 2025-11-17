"use client";

import { useState, useEffect } from "react";
import { Contract, parseUnits, formatUnits, Interface, BrowserProvider, isAddress, TransactionResponse, TransactionReceipt } from "ethers";
import GlobalSwapabi from "~~/lib/contracts/abi/GlobalSwap.json";
import GlobalSwapFactoryabi from "~~/lib/contracts/abi/GlobalSwapFactory.json";
import deployments from "~~/lib/contracts/deployments.json";
import { supportedTokens, dividendTokens, Token } from "~~/components/constants/tokens";
import { Address as AddressType } from "viem";
import { getExchangeRates } from "~~/lib/exchangeRates";
import { Address } from "viem";
import { useSelectedTokenBalance } from "~~/lib/chainHelper";
import { sendTransferOnTargetChain } from "~~/utils/targetChain"

interface TransferHandlerProps {
  sender?: string;
  chainId?: number;
  selectedToken?: Token;
  selectedToken2?: Token;
  selectedTokenS?: Token;
  amount?: string;
  amount2?: string;
  recipient?: AddressType;
  recipient2?: AddressType;
  xchangeId?: string;
  isRefundSelected?: boolean;
  isNewContractSelected?: boolean;
  openWalletModal?: () => void;
}

interface BitcoinWallet {
  sendTransaction: (to: string, amount: number) => Promise<string>;
}

type TxResult = {
  txHash: string;
  receipt: any | null;
};

async function convertGbdoToSelectedTokenValue(
  selectedTokenSymbol: string,
  gbdoAmount: string,
): Promise<bigint | null> {
  // Find the selected token's decimals and symbol
  const token = supportedTokens.find((t) => t.symbol === selectedTokenSymbol);
  if (!token) {
    console.error("Token not found");
    return null;
  }

  // Override fixed rates for certain tokens
  let tokenRate: number | null = null;
  if (selectedTokenSymbol === "WBTC" || selectedTokenSymbol === "BTC") {
    tokenRate = 100000.0;
  } else if (selectedTokenSymbol === "WETH" || selectedTokenSymbol === "ETH") {
    tokenRate = 1600.0;
  } else if (selectedTokenSymbol === "GBDo") {
    tokenRate = 1.0;
  }

  // Otherwise fetch dynamic rate

  const { rates, gbdoRate } = await getExchangeRates();

  if (tokenRate === null || tokenRate === undefined) {
    const rateData = rates.find((r) => r.symbol === selectedTokenSymbol);
    if (!rateData || !rateData.rateAgainstGBDo) {
      console.error("Token rate against GBDo not found or invalid");
      return null;
    }
    tokenRate = rateData.rateAgainstGBDo;
  }

  // Suppose GBDo decimals is 18 (adjust if different)
  const gbdoDecimals = 18;

  // Convert 10 GBDo to wei BigNumber
  const gbdoAmountInWei = parseUnits(gbdoAmount, gbdoDecimals);

  if (!tokenRate || tokenRate <= 0) {
    console.error("Token rate against GBDo not found or invalid");
    return null;
  }

  // Calculate token amount by scaling appropriately
  // tokenAmount = (gbdoAmountInWei * 1e18) / (tokenRate * 1e18) simplified:
  // Actually: amount in token * rate against GBDo = GBDo amount
  // So token amount = GBDo amount / rateAgainstGBDo

  // Using BigNumber math
  const tokenDecimals = 18;

  // Convert tokenRate to BigNumber scaled by 18 decimals
  const rateBn = parseUnits(tokenRate.toString(), 18);

  // tokenAmount = gbdoAmountInWei * 1e18 / rateBn
  // Use BigNumber operations: tokenAmount = gbdoAmountInWei.mul(1e18).div(rateBn)
  const scaleFactor = parseUnits("1", 18);

  const tokenAmount = (gbdoAmountInWei * scaleFactor) / rateBn;

  // Format tokenAmount to token decimals units
  const tokenAmountFormatted = formatUnits(tokenAmount, tokenDecimals);

  return tokenAmount;
}

export function useXchangeHandler(config: TransferHandlerProps) {
  const {
    chainId = 0,
    selectedToken = {} as Token,
    selectedToken2 = {} as Token,
    selectedTokenS = {} as Token,
    amount = "",
    amount2 = "",
    recipient = undefined,
    recipient2 = undefined,
    xchangeId = "",
    isRefundSelected = false,
    isNewContractSelected = false,
    openWalletModal,
  } = config;

  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<EthereumProvider | null>(null);
  const [walletName, setWalletName] = useState<string>("");
  
  useEffect(() => {
    const ethereum = window.ethereum;
    const xdefi = window.xfi;

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

  const send = async () => {
    const processedAt = new Date().toISOString();

    const btcWallet: BitcoinWallet = {
      sendTransaction: async (to, amount) => {
        if (!window.xfi?.bitcoin) {
          throw new Error("XDEFI Bitcoin wallet not available");
        }
        return await window.xfi.bitcoin.sendTransaction(to, amount);
      },
    };

    console.log("SafeCheck...");

    let txhash = "";
    let receipt: TransactionReceipt | null = null;
    let payoutFormatted = ""; 
    let swapAddress: string | undefined;
    let tokenTx2;
    let tokenTx: TransactionResponse | undefined;
    let chainStatus = true;
    let amountToSend;
    
    if (!selectedToken.address) {
      throw new Error("Token address is undefined");
    }

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

    let isOnMyChain;
    let isOnPoly;
    let isOnEthChain;
    let isBitcoin;

    isOnMyChain = myChainSupportedTokenAddresses.has(selectedToken.address as Address);
    isOnPoly = polyAddresses.has(selectedToken.address as Address);
    isBitcoin = selectedToken.symbol === "BTC";
    isOnEthChain = !isOnMyChain && !isOnPoly && !isBitcoin;

    let selectedTokenChainId;
    if(isOnMyChain){
      selectedTokenChainId = 38391207;
    }else if(isOnPoly){
      selectedTokenChainId = 137;
    }else{
      selectedTokenChainId = 1;
    }        

    try {
      console.log("Executing...");
      if (!window.ethereum) {
        throw new Error("No Ethereum provider found. Please install MetaMask.");
      }
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      console.log("Connected wallet:", signerAddress);

      if (signerAddress === recipient && isNewContractSelected!) {
        console.log("Creating AssetXchange Contract");

        const xchangeFactory = new Contract(deployments.GlobalSwapFactory, GlobalSwapFactoryabi.abi, signer);

        const amountInSelectedFeeToken = await convertGbdoToSelectedTokenValue(selectedTokenS.symbol, "10");

        const iface = new Interface(GlobalSwapFactoryabi.abi);
        const iface2 = new Interface(GlobalSwapabi.abi);
        const parsedValue = parseUnits(amount, 18);
        const parsedValue2 = parseUnits(amount2, 18);
        console.log("value1", parsedValue);
        console.log("value2", parsedValue2);

        let callAddressS;
        if (selectedToken.symbol === "ETH") {
          callAddressS = 0x00000000000000000000000000000000000000E0
        } else if (selectedToken.symbol === "BTC"){
          callAddressS = 0x00000000000000000000000000000000000000b0;
        } else {
          callAddressS = selectedToken.address;
        }

        let callAddress;
        if (selectedToken.symbol === "ETH") {
          callAddress = 0x00000000000000000000000000000000000000E0
        } else if (selectedToken.symbol === "BTC"){
          callAddress = 0x00000000000000000000000000000000000000b0;
        } else {
          callAddress = selectedToken.address;
        }

        let callAddress2;
        if (selectedToken.symbol === "ETH") {
          callAddress2 = 0x00000000000000000000000000000000000000E0
        } else if (selectedToken.symbol === "BTC"){
          callAddress2 = 0x00000000000000000000000000000000000000b0;
        } else {
          callAddress2 = selectedToken.address;
        }

        try {
          // Step 3: Send transaction directly to contract
          const tokenTx = await xchangeFactory.createSwap(
            callAddressS,
            recipient,
            recipient2,
            callAddress,
            parsedValue,
            callAddress2,
            parsedValue2,
            { gasLimit: 1_000_000 }
          );
          txhash = tokenTx.hash;
          const receipt = await tokenTx.wait();
          console.log("AssetXchange creation confirmed");

          if (!receipt) throw new Error("Transaction receipt is null");
          
          let feeAmount;
          // Parse logs to extract swapAddress
          for (const log of receipt.logs) {
            try {
              const mutableTopics = [...log.topics];
              const parsed = iface.parseLog({ topics: mutableTopics, data: log.data });
              if (parsed?.name === "SwapCreated") {
                swapAddress = parsed.args.swapAddress ?? parsed.args[0];
                feeAmount = parsed.args.fee ?? parsed.args[0];
                break;
              }
            } catch {
              // skip non-matching logs
            }
          }
    
        } catch (err) {
          console.error("Swap Creation failed:", err);
        }

        if (!swapAddress) throw new Error("SwapCreated event not found, missing swap address");

        const xchange = new Contract(swapAddress, GlobalSwapabi.abi, signer);

        const decimalString = formatUnits(parsedValue, 18);

        const amountInSelectedToken = await convertGbdoToSelectedTokenValue(selectedToken.symbol, decimalString);

        const { balanceBigInt, balanceBigNumber, decimals, isLoading } = useSelectedTokenBalance(
          signerAddress,
          selectedToken,
          selectedTokenChainId
        );

        if (!isLoading && balanceBigNumber !== undefined) {
          //const requiredAmount = ethers.utils.parseUnits(value, decimals);
          if (balanceBigNumber < amountInSelectedToken!) {
            console.log(`Insufficient ${selectedToken.symbol} balance.`);
          }
        }

        const holdingWalletAddress = swapAddress;
        
        /*************** CROSS CHAIN TRANSFER CALL ***************/
        console.log("Selected token:", selectedToken.symbol, selectedToken.chain, selectedToken.address);

        if (!provider) {
          throw new Error("No provider available");
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

/*************************************************************************************************************/
      
      } else if (xchangeId! && !isRefundSelected && !isNewContractSelected) {
        console.log("Depositing to Contract: ", xchangeId);

        const iface = new Interface(GlobalSwapabi.abi);

        const parsedValue = parseUnits(amount, 18);

        const {
          balanceBigInt: mainBalanceBigInt,
          balanceBigNumber: mainBalanceBigNumber,
          decimals: mainDecimals,
          isLoading: mainLoading,
        }= useSelectedTokenBalance(
          signerAddress,
          selectedToken,
          selectedTokenChainId
        );

        if (!mainLoading && mainBalanceBigNumber !== undefined) {
          //const requiredAmount = ethers.utils.parseUnits(value, decimals);
          if (mainBalanceBigNumber < parsedValue!) {
            console.log(`Insufficient ${selectedToken.symbol} balance.`);
          }
        }

        let holdingWalletAddress;
        if (selectedToken.symbol === "BTC"){
          holdingWalletAddress = process.env.NEXT_PUBLIC_BITCOLLECTOR_ADDRESS!;
        } else {        
          holdingWalletAddress = xchangeId;
        }

        /*************** CROSS CHAIN TRANSFER CALL ***************/
        console.log("Selected token:", selectedToken.symbol, selectedToken.chain, selectedToken.address);

        if (!provider) {
          throw new Error("No provider available");
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

/********************************************************************************************************************/

      } else if (xchangeId! && isRefundSelected!) {
        console.log("Refunding from Contract: ", xchangeId);
        const iface = new Interface(GlobalSwapabi.abi);

        // Deposit existing swap
        const xchange = new Contract(xchangeId, GlobalSwapabi.abi, signer);

        try {
          // Step 3: Send transaction directly to contract
          const tokenTx = await xchange.refund({
            gasLimit:  200_000,
          });
          txhash = tokenTx.hash;
          receipt = await tokenTx.wait();
          console.log("AssetXchange Refund confirmed");

          if (!receipt) throw new Error("Transaction receipt is null");

          for (const log of receipt.logs) {
            try {
              const mutableTopics = [...log.topics];
              const parsed = iface.parseLog({ topics: mutableTopics, data: log.data });
              if (parsed?.name === "Refund") {
                amountToSend = parsed.args.amount ?? parsed.args[0];
                break;
              }
            } catch {
              // Ignore error for non-matching logs
            }
          }
    
        } catch (err) {
          console.error("My chain call failed:", err);
          chainStatus = false;
        }

 /************************************************************************************************************************/     
        
      } else if (signerAddress !== recipient && isNewContractSelected!) {
        console.log("Initiating Contract");

        const xchangeFactory = new Contract(deployments.GlobalSwapFactory, GlobalSwapFactoryabi.abi, signer);

        // New swap xchange fallback
        const parsedValue = parseUnits(amount, 18);
        const parsedValue2 = parseUnits(amount2, 18);
        const amountInSelectedFeeToken = await convertGbdoToSelectedTokenValue(selectedTokenS.symbol, "10");


        const iface = new Interface(GlobalSwapFactoryabi.abi);

        const { balanceBigInt, balanceBigNumber, decimals, isLoading } = useSelectedTokenBalance(
          signerAddress,
          selectedToken,
          selectedTokenChainId
        );

        if (!isLoading && balanceBigNumber !== undefined) {
          //const requiredAmount = ethers.utils.parseUnits(value, decimals);
          if (balanceBigNumber < amountInSelectedFeeToken!) {
            console.log(`Insufficient ${selectedToken.symbol} balance.`);
          }
        }

        let callAddressS;
        if (selectedToken.symbol === "ETH") {
          callAddressS = 0x00000000000000000000000000000000000000E0
        } else if (selectedToken.symbol === "BTC"){
          callAddressS = 0x00000000000000000000000000000000000000b0;
        } else {
          callAddressS = selectedToken.address;
        }

        let callAddress;
        if (selectedToken.symbol === "ETH") {
          callAddress = 0x00000000000000000000000000000000000000E0
        } else if (selectedToken.symbol === "BTC"){
          callAddress = 0x00000000000000000000000000000000000000b0;
        } else {
          callAddress = selectedToken.address;
        }

        let callAddress2;
        if (selectedToken.symbol === "ETH") {
          callAddress2 = 0x00000000000000000000000000000000000000E0
        } else if (selectedToken.symbol === "BTC"){
          callAddress2 = 0x00000000000000000000000000000000000000b0;
        } else {
          callAddress2 = selectedToken.address;
        }

        try {
          // Step 3: Send transaction directly to contract
          const tokenTx = await xchangeFactory.createSwap(
            callAddressS,
            recipient,
            recipient2,
            callAddress,
            parsedValue,
            callAddress2,
            parsedValue2,
            { gasLimit: 1_000_000 }
          );
          txhash = tokenTx.hash;
          receipt = await tokenTx.wait();
          console.log("AssetXchange creation confirmed");

          if (!receipt) throw new Error("Transaction receipt is null");

          // Parse logs
          let amountToSend;
          for (const log of receipt.logs) {
            try {
              const mutableTopics = [...log.topics];
              const parsed = iface.parseLog({ topics: mutableTopics, data: log.data });
              if (parsed?.name === "SwapCreated") {
                swapAddress = parsed.args.swapAddress ?? parsed.args[0];
                amountToSend = parsed.args.fee ?? parsed.args[0];
                break;
              }
            } catch {
              // Ignore error for non-matching logs
            }
          }
        } catch (err) {
          console.error("Swap Creation failed:", err);
        }
      }

      let paymentmethod = "Unknown";
      if (selectedTokenS?.symbol) paymentmethod = selectedTokenS.symbol;
      else if (selectedToken2?.symbol) paymentmethod = selectedToken2.symbol;
      else if (selectedToken?.symbol) paymentmethod = selectedToken.symbol;

      if ( isNewContractSelected! ) {
        const xchangePayload = {
          txhash,
          contractaddress: swapAddress ?? xchangeId,
          useraddress: signerAddress,
          initiator: recipient || "",
          counterparty: recipient2 || "",
          amounta: amount ? parseFloat(amount) : null,
          amountb: amount2 ? parseFloat(amount2) : null,
          paymentmethod: JSON.stringify([selectedToken?.symbol, selectedToken2?.symbol, selectedTokenS?.symbol].filter(Boolean)),
          refund: isRefundSelected ? 1 : 0,
          newcontract: isNewContractSelected ? 1 : 0,
          status: "accepted",
          chainstatus: true,
          queuedat: processedAt,
          processedat: null,
          priority: 0,
          retrycount: 0,
          notes: "Xchange Successful",
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
              id: "swaps",
              method: "executeSwap",
              params: xchangePayload,
            }),
          });

          const contentType = res.headers.get("Content-Type") ?? "";
          if (res.ok && contentType.includes("application/json")) {
            const result = await res.json();
          }
        } catch (nestedErr: any) {
          console.error("Error reporting failed:", nestedErr);
        }
      }

        //****Deposit Log Exception*****//
      if (tokenTx2 || !isNewContractSelected) {
          const xchangePayload = {
          txhash,
          contractaddress: swapAddress,
          useraddress: signerAddress,
          initiator: "",
          counterparty: "",
          amounta: amount ? parseFloat(amount) : "",
          amountb: "",
          paymentmethod: selectedToken.symbol,
          refund: 0,
          newcontract: 0,
          status: "accepted",
          chainstatus: true,
          queuedat: processedAt,
          processedat: null,
          priority: 0,
          retrycount: 0,
          notes: "Xchange Successful",
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
              id: "swaps",
              method: "executeSwap",
              params: xchangePayload,
            }),
          });

          const contentType = res.headers.get("Content-Type") ?? "";
          if (res.ok && contentType.includes("application/json")) {
            const result = await res.json();
          }
        } catch (nestedErr: any) {
          console.error("Error reporting failed:", nestedErr);
        }
      }

      return {
        success: true,
        txHash: txhash,
        receiptHash: receipt?.blockHash ?? "",
        xchangeId: swapAddress,
        amount: payoutFormatted,
        token: selectedToken.symbol ?? "unknown",
        status: "queued",
      };
    } catch (err: any) {
      console.error("Transfer error:", err);

      const errorPayload = {
        txhash: "",
        contractaddress: "",
        useraddress: recipient,
        initiator: recipient ?? "unknown",
        counterparty: recipient2 ?? "unknown",
        paymentmethod: selectedToken.symbol ?? "unknown",
        amount: "",
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
            id: "swap",
            method: "executeSwap",
            params: errorPayload,
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

  return { send, loading };
}
