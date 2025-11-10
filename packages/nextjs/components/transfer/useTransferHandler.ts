"use client";

import { useState } from "react";
import { ethers, Contract, parseUnits, formatUnits, BrowserProvider, isAddress, TransactionResponse, TransactionReceipt } from "ethers";
import deployments from "~~/lib/contracts/deployments.json";
import transferTrackABI from "~~/lib/contracts/abi/TransferTracker.json";
import erc20Abi from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { Interface } from "@ethersproject/abi";
import { useBalance } from "wagmi";
import type { Address } from "viem";
import { resolve } from "dns";
import { dividendTokens } from "~~/components/constants/tokens";

interface TokenType {
  address?: string;
  symbol?: string;
  decimals?: number;
  isNative?: boolean;
}

interface TransferHandlerProps {
  sender?: string;
  chainId?: number;           // Source chain id (Besu)
  selectedToken?: TokenType;
  available?: bigint;
  signature?: string;
  openWalletModal?: () => void;
  setRecipient?: (val: string | undefined) => void;
  setSendValue?: (val: string) => void;
}

interface BitcoinWallet {
  sendTransaction: (to: string, amount: number) => Promise<string>;
}

function useSelectedTokenBalance(
  userAddress: string,
  selectedToken: TokenType,
  chainId: number
) {
  const { data: balanceData } = useBalance({
    address: userAddress,
    token: selectedToken.address,
    chainId,
  });

  const balanceBigInt = balanceData?.value;
  return {
    balanceBigInt,
    decimals: selectedToken.decimals ?? 18,
  };
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

    const tokenContract = new ethers.Contract(selectedToken.address, erc20Abi.abi, signer);
    console.log("address", selectedToken.address);
    console.log("chain", chain);
    console.log("id", selectedTokenChainId);

    const humanReadable = formatUnits(amount, 18);
    const amountBN = parseUnits(humanReadable, selectedToken.decimals);
    
    if (selectedToken.symbol === "ETH" || selectedToken.symbol === "GBDo") {
      const tx = await signer.sendTransaction({
        to,
        value: amountBN,
        gasLimit:  65_000,
      });
      receipt = await tx.wait();
    } else {
      const tx = await tokenContract.transfer(to, amountBN, {
        gasLimit: 65_000,
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

export function useTransferHandler(config: TransferHandlerProps) {
  const {
    sender = "",
    chainId = 0,
    selectedToken = {},
    available = 0n,
    signature,
    openWalletModal,
    setRecipient,
    setSendValue,
  } = config;

  const [loading, setLoading] = useState(false);
  const { balanceBigInt, decimals } = useSelectedTokenBalance(sender, selectedToken, chainId);
  const btcWallet: BitcoinWallet = {
    sendTransaction: async (to, amount) => {
      if (!window.xfi?.bitcoin) {
        throw new Error("XDEFI Bitcoin wallet not available");
      }
      return await window.xfi.bitcoin.sendTransaction(to, amount);
    },
  };

  // Combined send flow
  const send = async (recipient?: string, value?: string) => {
    setLoading(true);
    const processedAt = new Date().toISOString();

    if (!sender || !chainId || !selectedToken.address) {
      //openWalletModal?.();
      //setLoading(false);
      console.log("failed");
      return;
    }

    if (!recipient || !value) {
      setLoading(false);
      return;
    }

    const amountNum = Number(value);
    const parsedValue = parseUnits(value, 18);
    const availableInDecimal = parseFloat(formatUnits(available, decimals ?? 18));
    if (amountNum > availableInDecimal) {
      setLoading(false);
      console.log("Amount exceeds available balance");
    }

    try {

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
      }, 
      btcWallet);

      if (!selectedToken.address) throw new Error("Token address not specified for source chain transfer");
      console.log("checking");

      const provider = new BrowserProvider((window as any).ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      const amount = parseUnits(value, selectedToken.decimals ?? 18);
      const contract = new Contract(deployments.TransferTracker, transferTrackABI.abi, signer);

      let callAddress;
      if (selectedToken.symbol === "ETH") {
        callAddress = "0x00000000000000000000000000000000000000E0";
      } else if (selectedToken.symbol === "BTC"){
        callAddress = "0x00000000000000000000000000000000000000b0";
      } else {
        callAddress = selectedToken.address;
      }

      const iface = new Interface(transferTrackABI.abi);

      const calldata = iface.encodeFunctionData("Transfer", [
        callAddress,
        recipient,
        amount,
        "0x",
      ]);

      let tx: TransactionResponse | undefined;
      let receipt: TransactionReceipt | null = null;
      let chainStatus = true;
      let amountToSend;

      try {
        const tx = await signer.sendTransaction({
          to: deployments.TransferTracker,
          value: 0n,
          data: calldata,
          gasLimit:  65_000n,
        });

        receipt = await tx.wait();

        if (!receipt) throw new Error("No Receipt Generated");

        for (const log of receipt.logs) {
          try {
              const mutableTopics = [...log.topics];
              const parsed = iface.parseLog({ topics: mutableTopics, data: log.data });
              if (parsed?.name === "TransferRecorded") {
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
      
      // Log transfer success
      const transferPayload = {
        txhash: tx?.hash ?? "",
        contractaddress: deployments.TransferTracker,
        sender,
        recipient,
        token: selectedToken.symbol ?? "unknown",
        amount: amountNum.toFixed(2),
        status: "accepted",
        chainstatus: true,
        queuedat: "",
        processedat: processedAt,
        priority: 0,
        retrycount: 0,
        receipthash: receipt?.blockHash ?? "",
        notes: "Transfer successful",
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
            id: "transfers",
            method: "createTransfer",
            params: transferPayload,
          }),
        });
        if (res.ok) await res.json();
      } catch (err) {
        console.error("Error reporting transfer:", err);
      }

      setRecipient?.(undefined);
      setSendValue?.("");
      setLoading(false);

      return {
        success: true,
        txHashOnTarget,
        recipient,
        amount: amountNum,
        token: selectedToken.symbol ?? "unknown",
        status: "queued",
      };
    } catch (err: any) {
      console.error("Cross-chain transfer failed:", err);

      const errorPayload = {
        txhash: "",
        contractaddress: "",
        sender,
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
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "transfers",
            method: "createTransfer",
            params: errorPayload,
          }),
        });
        if (res.ok) await res.json();
      } catch (nestedErr) {
        console.error("Error reporting failure:", nestedErr);
      }

      setLoading(false);
      return { success: false, error: err.message ?? "Unknown error" };
    }
  };

  return { send, loading };
}
