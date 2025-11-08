"use client";

import { useState } from "react";
import { ethers, Contract, parseUnits, formatUnits, Interface, BrowserProvider, isAddress, TransactionResponse, TransactionReceipt } from "ethers";
import GlobalSwapabi from "~~/lib/contracts/abi/GlobalSwap.json";
import GlobalSwapFactoryabi from "~~/lib/contracts/abi/GlobalSwapFactory.json";
import deployments from "~~/lib/contracts/deployments.json";
import { erc20Abi } from "viem";
import { supportedTokens, dividendTokens, Token } from "~~/components/constants/tokens";
import { Address as AddressType } from "viem";
import { getExchangeRates } from "~~/lib/exchangeRates";
import { useWalletClient } from "wagmi";
import { Address } from "viem";
import { useSelectedTokenBalance } from "~~/lib/chainHelper";
import { sendReconciliation } from "~~/lib/reconciliatonHelper";

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
  }

  // Otherwise fetch dynamic rate
  if (tokenRate === null) {
    const { rates, gbdoRate } = await getExchangeRates();
    const rateData = rates.find((r) => r.symbol === selectedTokenSymbol);
    if (!rateData || !rateData.rateAgainstGBDO) {
      console.error("Token rate against GBDO not found or invalid");
      return null;
    }
    tokenRate = rateData.rateAgainstGBDO;
  }

  // Suppose GBDO decimals is 18 (adjust if different)
  const gbdoDecimals = 18;

  // Convert 10 GBDO to wei BigNumber
  const gbdoAmountInWei = parseUnits(gbdoAmount, gbdoDecimals);

  if (!tokenRate || tokenRate <= 0) {
    console.error("Token rate against GBDO not found or invalid");
    return null;
  }

  // Calculate token amount by scaling appropriately
  // tokenAmount = (gbdoAmountInWei * 1e18) / (tokenRate * 1e18) simplified:
  // Actually: amount in token * rate against GBDO = GBDO amount
  // So token amount = GBDO amount / rateAgainstGBDO

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
    ...dividendTokens.map(t => t.address as Address),
  ]);

  const polyAddresses = new Set<Address>([
    "0x5C067C80C00eCd2345b05E83A3e758eF799C40B5",
    "0x6AE7Dfc73E0dDE2aa99ac063DcF7e8A63265108c",
    "0xb755506531786c8ac63b756bab1ac387bacb0c04",
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

    const tokenContract = new ethers.Contract(selectedToken.address, erc20Abi, signer);

    const humanReadable = formatUnits(amount, 18);
    const amountBN = parseUnits(humanReadable, selectedToken.decimals);
    
    if (selectedToken.symbol === "ETH") {
      const tx = await signer.sendTransaction({
        to,
        value: amountBN,
        gasLimit: 30_000,
      });
      receipt = await tx.wait();
    } else {
      const tx = await tokenContract.transfer(to, amountBN, {
        gasLimit: 60_000,
      });
      receipt = await tx.wait();
    }
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

    /*if (!recipient || !chainId || selectedToken.decimals == null) {
      openWalletModal?.();
      return { success: false, error: "Missing recipient or chain info" };
    }*/
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
      selectedTokenChainId = 3503995874081207;
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

        const {
          balanceBigInt: feeBalanceBigInt,
          balanceBigNumber: feeBalanceBigNumber,
          decimals: feeDecimals,
          isLoading: feeLoading,
        } = useSelectedTokenBalance(
          signerAddress,
          selectedTokenS,
          selectedTokenChainId
        );

        if (!feeLoading && feeBalanceBigNumber !== undefined) {
          //const requiredAmount = ethers.utils.parseUnits(value, decimals);
          if (feeBalanceBigNumber < amountInSelectedFeeToken!) {
            console.log(`Insufficient ${selectedToken.symbol} balance.`);
          }
        }

        /*************** CROSS CHAIN TRANSFER CALL ***************/

        let holdingWalletAddress;
        if (selectedToken.symbol === "BTC"){
          holdingWalletAddress = process.env.NEXT_PUBLIC_BITCOLLECTOR_ADDRESS!;
        } else {        
          holdingWalletAddress = process.env.NEXT_PUBLIC_COLLECTOR_ADDRESS!;
        }

        if (amountInSelectedFeeToken !== null) {
          const serviceTxHashOnTarget = await sendTransferOnTargetChain(holdingWalletAddress, amountInSelectedFeeToken, {
            address: selectedToken.address!,
            decimals: selectedToken.decimals,
            symbol: selectedToken.symbol,
          });
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
            { gasLimit: 500_000 }
          );
          txhash = tokenTx.hash;
          receipt = await tokenTx.wait();
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
        
        /*************** CROSS CHAIN TRANSFER CALL ***************/

        const txHashOnTarget = await sendTransferOnTargetChain(holdingWalletAddress, parsedValue, {
          address: selectedToken.address!,
          decimals: selectedToken.decimals,
          symbol: selectedToken.symbol,
        });
          
        try {
          // Step 3: Send transaction directly to contract
          tokenTx2 = await xchange.deposit({ gasLimit: 100_000 });
          txhash = tokenTx2.hash;
          receipt = await tokenTx2.wait();
          console.log("AssetXchange deposit confirmed");

          if (!receipt) throw new Error("Transaction receipt is null");

          let amountToSend;
          for (const log of receipt.logs) {
            try {
              const mutableTopics = [...log.topics];
              const parsed = iface2.parseLog({ topics: mutableTopics, data: log.data });
              if (parsed?.name === "SwapJoined") {
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
          holdingWalletAddress = process.env.NEXT_PUBLIC_COLLECTOR_ADDRESS!;
        }

        /*************** CROSS CHAIN TRANSFER CALL ***************/
        const txHashOnTarget = await sendTransferOnTargetChain(holdingWalletAddress, parsedValue, {
          address: selectedToken.address!,
          decimals: selectedToken.decimals,
          symbol: selectedToken.symbol,
        });

        // Deposit existing swap
        const xchange = new Contract(xchangeId, GlobalSwapabi.abi, signer);
        let amountToSendA;
        let amountToSendB;
        let partyA;
        let partyB;
        let tokenA;
        let tokenB;

        try {
          // Step 3: Send transaction directly to contract
          const tokenTx = await xchange.deposit({
            gasLimit: 100_000,
          });
          txhash = tokenTx.hash;
          receipt = await tokenTx.wait();
          console.log("AssetXchange deposit confirmed");

          if (!receipt) throw new Error("Transaction receipt is null");

          for (const log of receipt.logs) {
            try {
              const mutableTopics = [...log.topics];
              const parsed = iface.parseLog({ topics: mutableTopics, data: log.data });
              if (parsed?.name === "SwapCompleted") {
                amountToSendA = parsed.args.amountA ?? parsed.args[0];
                amountToSendB = parsed.args.amountB ?? parsed.args[0];
                partyA = parsed.args.partyA ?? parsed.args[0];
                partyB = parsed.args.partyB ?? parsed.args[0];
                tokenA = parsed.args.tokenA ?? parsed.args[0];
                tokenB = parsed.args.tokenB ?? parsed.args[0];
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

        let signerForTransfer;

        isOnMyChain = myChainSupportedTokenAddresses.has(tokenA as Address);
        isOnPoly = polyAddresses.has(tokenA as Address);
        isBitcoin = selectedToken.symbol === "BTC";
        isOnEthChain = !isOnMyChain && !isOnPoly && !isBitcoin;
    
        if (isOnMyChain) {
          signerForTransfer = "global";
        } else if (isOnPoly) {
          signerForTransfer = "polygon";
        } else if (isOnEthChain) {
          signerForTransfer = "ethereum";
        } else if (isBitcoin){
          signerForTransfer = "bitcoin";
        } else {
          throw new Error("Unsupported token chain");
        }

        sendReconciliation({
          apiKey: process.env.NEXT_PUBLIC_API_SECRET!,
          to: signerAddress,
          amount: amountToSendA,
          tokenAddress: tokenA,
          chain: signerForTransfer
        }).then(({ txHash, status }) => {
          console.log(`Refund sent! Tx: ${txHash}, Status: ${status}`);
        }).catch(console.error);

        isOnMyChain = myChainSupportedTokenAddresses.has(tokenB as Address);
        isOnPoly = polyAddresses.has(tokenB as Address);
        isBitcoin = selectedToken.symbol === "BTC";
        isOnEthChain = !isOnMyChain && !isOnPoly && !isBitcoin;

        if (isOnMyChain) {
          signerForTransfer = "global";
        } else if (isOnPoly) {
          signerForTransfer = "polygon";
        } else if (isOnEthChain) {
          signerForTransfer = "ethereum";
        } else if (isBitcoin){
          signerForTransfer = "bitcoin";
        } else {
          throw new Error("Unsupported token chain");
        }

        sendReconciliation({
          apiKey: process.env.NEXT_PUBLIC_API_SECRET!,
          to: signerAddress,
          amount: amountToSendB,
          tokenAddress: tokenB,
          chain: signerForTransfer
        }).then(({ txHash, status }) => {
          console.log(`Refund sent! Tx: ${txHash}, Status: ${status}`);
        }).catch(console.error);

/********************************************************************************************************************/

      } else if (xchangeId! && isRefundSelected!) {
        console.log("Refunding from Contract: ", xchangeId);
        const iface = new Interface(GlobalSwapabi.abi);

        // Deposit existing swap
        const xchange = new Contract(xchangeId, GlobalSwapabi.abi, signer);

        try {
          // Step 3: Send transaction directly to contract
          const tokenTx = await xchange.refund({
            gasLimit: 40_000,
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
        
        let signerForTransfer;
    
        if (isOnMyChain) {
          signerForTransfer = "global";
        } else if (isOnPoly) {
          signerForTransfer = "polygon";
        } else if (isOnEthChain) {
          signerForTransfer = "ethereum";
        } else {
          throw new Error("Unsupported token chain");
        }

        sendReconciliation({
          apiKey: process.env.NEXT_PUBLIC_API_SECRET!,
          to: signerAddress,
          amount: amountToSend,
          tokenAddress: selectedToken.address,
          chain: signerForTransfer
        }).then(({ txHash, status }) => {
          console.log(`Refund sent! Tx: ${txHash}, Status: ${status}`);
        }).catch(console.error);

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

        let holdingWalletAddress;
        if (selectedToken.symbol === "BTC"){
          holdingWalletAddress = process.env.NEXT_PUBLIC_BITCOLLECTOR_ADDRESS!;
        } else {        
          holdingWalletAddress = process.env.NEXT_PUBLIC_COLLECTOR_ADDRESS!;
        }

        /*************** CROSS CHAIN TRANSFER CALL ***************/
        const txHashOnTarget = await sendTransferOnTargetChain(holdingWalletAddress, parsedValue, {
          address: selectedToken.address!,
          decimals: selectedToken.decimals,
          symbol: selectedToken.symbol,
        });

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
            { gasLimit: 500_000 }
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
