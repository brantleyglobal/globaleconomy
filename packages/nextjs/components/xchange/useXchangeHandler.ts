"use client";

import { useState } from "react";
import { Contract, parseUnits, formatUnits, Interface, BrowserProvider, TransactionResponse } from "ethers";
import GlobalSwapabi from "~~/lib/contracts/abi/GlobalSwap.json";
import GlobalSwapRegistryAbi from "~~/lib/contracts/abi/GlobalSwapRegistry.json";
import deployments from "~~/lib/contracts/deployments.json";
import { supportedTokens, Token } from "~~/components/constants/tokens";
import { Address as AddressType } from "viem";
import { getExchangeRates } from "~~/lib/exchangeRates";
import { sendTransferOnTargetChain, CHAINS, switchOrAddChain, ensureGlobalChain } from "~~/utils/targetChain"

interface TransferHandlerProps {
  sender?: string;
  chainId?: number;
  selectedToken?: Token;
  selectedToken2?: Token;
  amount?: string;
  amount2?: string;
  recipient?: AddressType;
  recipient2?: AddressType;
  xchangeId?: string;
  isRefundSelected?: boolean;
  isNewContractSelected?: boolean;
  provider?: any;
  openWalletModal?: () => void;
}

interface BitcoinWallet {
  sendTransaction: (to: string, amount: number) => Promise<string>;
}

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
    amount = "",
    amount2 = "",
    recipient = undefined,
    recipient2 = undefined,
    xchangeId = "",
    isRefundSelected = false,
    isNewContractSelected = false,
    provider = undefined,
    openWalletModal,
  } = config;

  const [loading, setLoading] = useState(false);

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
    let receipt: any;
    let payoutFormatted = ""; 
    let swapAddress: string | undefined;
    let tokenTx: TransactionResponse | undefined;
    let chainStatus = false;
    let amountToSend;
    let dTxHash: string | undefined;
    let receipt2: any;
    
    if (!selectedToken.address) {
      throw new Error("Token address is undefined");
    }       

    let parsedValue;
    let parsedValue2;
    let hash;
    let hash2;

    try {
      console.log("Executing...");
      if (!window.ethereum) {
        throw new Error("No Ethereum provider found. Please install MetaMask.");
      }
      
      const provider = new BrowserProvider(window.ethereum);
      if (!provider) throw new Error("No wallet provider available");
    
      const chainInfo = CHAINS.global;
      if (!chainInfo) throw new Error(`Unknown chain: ${selectedToken.chain}`);
    
      const hexChainId = "0x" + chainInfo.chainId.toString(16);
    
      // Ethereum‑style chains
      await switchOrAddChain(window.ethereum, chainInfo);

      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      if ((signerAddress === recipient || signerAddress === recipient2) && isNewContractSelected) {
        console.log("Creating AssetXchange Contract");

        const xchangeFactory = new Contract(deployments.GlobalSwapRegistry, GlobalSwapRegistryAbi.abi, signer);

        const iface = new Interface(GlobalSwapRegistryAbi.abi);
        //const iface2 = new Interface(GlobalSwapabi.abi);
        parsedValue = parseUnits(amount, 18);   // bigint
        parsedValue2 = parseUnits(amount2, 18); // bigint

        let callAddress;
        if (selectedToken.symbol === "ETH") {
          callAddress = "0x00000000000000000000000000000000000000E0";
        } else if (selectedToken.symbol === "BTC"){
          callAddress = "0x00000000000000000000000000000000000000b0";
        } else {
          callAddress = selectedToken.address;
        }

        let callAddress2;
        if (selectedToken2.symbol === "ETH") {
          callAddress2 = "0x00000000000000000000000000000000000000E0";
        } else if (selectedToken2.symbol === "BTC"){
          callAddress2 = "0x00000000000000000000000000000000000000b0";
        } else {
          callAddress2 = selectedToken2.address;
        }

        const decimalString = formatUnits(parsedValue, 18);

        const amountInSelectedToken = await convertGbdoToSelectedTokenValue(selectedToken.symbol, decimalString);

        const holdingWalletAddress = process.env.NEXT_PUBLIC_XCHANGE!;
        
        /*************** CROSS CHAIN TRANSFER CALL ***************/

        if (!provider) {
          throw new Error("No provider available");
        }

        if (selectedToken.chain !== "solana") {
          await ensureGlobalChain(window.ethereum);
        }

        ({ dTxHash, receipt2 } = await sendTransferOnTargetChain(
          holdingWalletAddress,
          parsedValue,
          {
            address: selectedToken.address!,
            decimals: selectedToken.decimals,
            symbol: selectedToken.symbol,
            chain: selectedToken.chain,
          },
          provider
        ));
        
        if (dTxHash! && signerAddress === recipient){
          hash = receipt2;
          hash2 = 0;
        } else if (dTxHash! && signerAddress === recipient2){
          hash = 0;
          hash2 = receipt2;
        }

        const ts = Math.floor(Date.now() / 1000);

        try {
          // Step 3: Send transaction directly to contract
          tokenTx = await xchangeFactory.createSwap(
            recipient,
            recipient2,
            callAddress,
            parsedValue,
            hash,
            callAddress2,
            parsedValue2,
            hash2,
            ts,
            { gasLimit: 750_000 }
          );
          txhash = tokenTx?.hash ?? "";
          receipt = tokenTx ? await tokenTx.wait() : null;
          console.log("AssetXchange creation confirmed");

          if (!receipt) throw new Error("Transaction receipt is null");
          if (receipt!) {
            chainStatus = true;
          }
          
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

      /*********************************************DEPOSIT****************************************************************/
      
      } else if (xchangeId! && !isRefundSelected && !isNewContractSelected) {

        const iface = new Interface(GlobalSwapabi.abi);

        //const parsedValue = parseUnits(amount, 18);

        let holdingWalletAddress;
        if (selectedToken.symbol === "BTC"){
          holdingWalletAddress = process.env.NEXT_PUBLIC_BITCOLLECTOR_ADDRESS!;
        } else {        
          holdingWalletAddress = process.env.NEXT_PUBLIC_XCHANGE!;
        }

        const res = await fetch("https://gateway.brantley-global.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "swaps",
            method: "getSwap",
            params: {
              contractaddress: swapAddress,
              page: 1,
              pageSize: 1
            }
          }),
        });

        const data = await res.json();
        const swap = data.result?.swaps?.[0];
        
        let parsedValue;
        let tokenAddress;

        if (signerAddress === swap.initiator && (swap.newcontract === 2 || swap.newcontract === 0 || swap.depositahash === "")){
          parsedValue = BigInt(swap.amounta) * 10n ** 18n;
          tokenAddress = swap.tokena;
        } else if (signerAddress === swap.counterparty  && (swap.newcontract === 1 || swap.newcontract === 0 || swap.depositahash === "")){
          parsedValue = BigInt(swap.amounta) * 10n ** 18n;
          tokenAddress = swap.tokenb;
        }

        /*************** CROSS CHAIN TRANSFER CALL ***************/

        if (!provider) {
          throw new Error("No provider available");
        }
        const { dTxHash, receipt2 } = await sendTransferOnTargetChain(
          holdingWalletAddress,
          parsedValue!,
          {
            address: tokenAddress!,
            decimals: selectedToken.decimals,
            symbol: selectedToken.symbol,
            chain: selectedToken.chain,
          },
          window.ethereum // pass provider here
        );

        const xchange = new Contract(xchangeId, GlobalSwapabi.abi, signer);
        const xchangeFactory = new Contract(deployments.GlobalSwapRegistry, GlobalSwapRegistryAbi.abi, signer);

        try {
          // Step 3: Send transaction directly to contract
          const tokenTx = await xchangeFactory.deposit(
            signerAddress,
            signerAddress,
            dTxHash,
            { gasLimit: 600_000 },
          );
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
        }

      /********************************************************************************************************************/

      } else if (xchangeId! && isRefundSelected!) {
        //console.log("Refunding from Contract: ", xchangeId);
        const iface = new Interface(GlobalSwapRegistryAbi.abi);

        // Deposit existing swap
        const xchange = new Contract(xchangeId, GlobalSwapabi.abi, signer);
        const xchangeFactory = new Contract(deployments.GlobalSwapRegistry, GlobalSwapRegistryAbi.abi, signer);

        try {
          // Step 3: Send transaction directly to contract
          const tokenTx = await xchange.refund(
            signerAddress,
            0,
            { gasLimit: 600_000 },
          );
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
        }

      /************************************************************************************************************************/     
        
      } else if (signerAddress !== recipient || signerAddress !== recipient2 && isNewContractSelected!) {
        console.log("Initiating Contract");

        const xchangeFactory = new Contract(deployments.GlobalSwapFactory, GlobalSwapRegistryAbi.abi, signer);

        // New swap xchange fallback
        const parsedValue = parseUnits(amount, 18);
        const parsedValue2 = parseUnits(amount2, 18);


        const iface = new Interface(GlobalSwapRegistryAbi.abi);

        let callAddress;
        if (selectedToken.symbol === "ETH") {
          callAddress = "0x00000000000000000000000000000000000000E0";
        } else if (selectedToken.symbol === "BTC"){
          callAddress = "0x00000000000000000000000000000000000000b0";
        } else {
          callAddress = selectedToken.address;
        }

        let callAddress2;
        if (selectedToken.symbol === "ETH") {
          callAddress2 = "0x00000000000000000000000000000000000000E0";
        } else if (selectedToken2.symbol === "BTC"){
          callAddress2 = "0x00000000000000000000000000000000000000b0";
        } else {
          callAddress2 = selectedToken2.address;
        }

        try {
          // Step 3: Send transaction directly to contract
          const tokenTx = await xchangeFactory.createSwap(
            recipient,
            recipient2,
            callAddress,
            parsedValue,
            0,
            callAddress2,
            parsedValue2,
            0,
            { gasLimit: 1_500_000 }
          );
          txhash = tokenTx.hash;
          receipt = await tokenTx.wait();
          console.log("AssetXchange creation confirmed");

          if (!receipt) throw new Error("Transaction receipt is null");
          if (receipt!) {
            chainStatus = true;
          }

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

      const shouldInsert = isNewContractSelected === true;
      const isCreate = isNewContractSelected === true;
      const isRefund = isRefundSelected === true;
      const isDeposit = !isCreate && !isRefund;

      let paymentmethod = "Unknown";
      let xchangePayload;
      if (selectedToken2?.symbol) paymentmethod = selectedToken2.symbol;
      else if (selectedToken?.symbol) paymentmethod = selectedToken.symbol;

      if ( isNewContractSelected! ) {
        let newContract = 0;

        if (signerAddress === recipient && dTxHash!){
          newContract = 1;

        } else if (signerAddress === recipient2 && dTxHash!){
          newContract = 2;
        }

        xchangePayload = {
          txhash: dTxHash,
          contractaddress: swapAddress || "",
          useraddress: signerAddress,
          initiator: recipient || "",
          counterparty: recipient2 || "",
          amounta: parsedValue?.toString(),
          tokena: selectedToken.address,
          depositahash: hash,
          amountb: parsedValue2?.toString(),
          tokenb: selectedToken2.address,
          depositbhash: hash2,
          paymentmethod: JSON.stringify([selectedToken?.symbol, selectedToken2?.symbol].filter(Boolean)),
          refund: isRefundSelected ? 1 : 0,
          newcontract: newContract,
          status: "accepted",
          chainstatus: chainStatus,
          queuedat: processedAt,
          processedat: null,
          priority: 0,
          retrycount: 0,
          notes: "Xchange Initiated",
          timestamp: new Date().toISOString(),
        };
      }

      if ( isRefundSelected! || !isNewContractSelected) {

        const res = await fetch("https://gateway.brantley-global.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "swaps",
            method: "getSwap",
            params: {
              contractaddress: swapAddress,
              page: 1,
              pageSize: 1
            }
          }),
        });

        const data = await res.json();
        const swap = data.result?.swaps?.[0];

        const isInitiator = signerAddress.toLowerCase() === swap.initiator.toLowerCase();
        const isCounterparty = signerAddress.toLowerCase() === swap.counterparty.toLowerCase();


        if (isRefundSelected) {
          xchangePayload = {
            refund: 1,
            newcontract: 0,
            timestamp: new Date().toISOString(),
          } as any;

          if (isInitiator) {
            xchangePayload.amounta = -Math.abs(swap.amounta);
          }

          if (isCounterparty) {
            xchangePayload.amountb = -Math.abs(swap.amountb);
          }
        }

        //****Deposit Log Exception*****//
        if (!isNewContractSelected && !isRefundSelected) {
          let newContractFlag;
          let depositahash = swap.depositahash;
          let depositbhash = swap.depositbhash;

          if (swap.newcontract === 2 && isInitiator && dTxHash) {
            newContractFlag = 3;
            depositahash = dTxHash;
          } else if (swap.newcontract === 0 && isInitiator && dTxHash) {
            newContractFlag = 1;
            depositahash = dTxHash;
          }

          if (swap.newcontract === 1 && isCounterparty && dTxHash) {
            newContractFlag = 3;
            depositbhash = dTxHash;
          } else if (swap.newcontract === 0 && isCounterparty && dTxHash) {
            newContractFlag = 2;
            depositbhash = dTxHash;
          }

          xchangePayload = {
            newcontract: newContractFlag,
            depositahash,
            depositbhash,
            timestamp: new Date().toISOString(),
          };
        }

      }

      try {
        const method = shouldInsert ? "executeSwap" : "updateSwap";

        const res = await fetch("https://gateway.brantley-global.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "swaps",
            method,
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

      return {
        success: true,
        txHash: txhash,
        receiptHash: receipt,
        xchangeId: xchangeId,
        amount: payoutFormatted,
        token: selectedToken.symbol ?? "unknown",
        status: "queued",
      };
    } catch (err: any) {
      console.error("Xchange error:", err);

      const revertReason =
        err?.error?.data?.message ||
        err?.data?.message ||
        err?.reason ||
        err?.message ||
        "Unknown error";

      console.error("Purchase failed:", revertReason);

      throw new Error(revertReason);

      return { success: false, error: err.message ?? "Unknown error" };
    }
  };

  return { send, loading };
}
