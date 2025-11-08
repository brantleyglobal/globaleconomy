import { useState, useCallback } from "react";
import { ethers, Contract, BrowserProvider, parseUnits, formatUnits, Interface, isAddress, TransactionResponse, TransactionReceipt } from "ethers";
import acquisitionAbi from "~~/lib/contracts/abi/AcquisitionGateway.json";
import deployments from "~~/lib/contracts/deployments.json";
import { erc20Abi } from "viem";
import type { Token } from "~~/components/constants/tokens";
import { logAcquisitionCommit } from "./logAcquisitionCommit";
import { Address } from "viem";
import { sendReconciliation } from "~~/lib/reconciliatonHelper";

interface AcquisitionPayload {
  txhash: string;
  contractaddress: string;
  useraddress: string;
  stablein: string;
  gbdout: string;
  paymentmethod: string;
  status: string;
  chainstatus: boolean;
  processedat: string | null;
  receipthash: string;
  notes: string;
  timestamp: string;
}

interface UseDepositResult {
  isProcessing: boolean;
  error: Error | null;
  deposit: (
    amountStr: string,
    amountoutStr: string,
    token: Token,
    userAddress: string
  ) => Promise<string>;
}

interface BitcoinWallet {
  sendTransaction: (to: string, amount: number) => Promise<string>;
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

export function useDeposit(): UseDepositResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const btcWallet: BitcoinWallet = {
    sendTransaction: async (to, amount) => {
      if (!window.xfi?.bitcoin) {
        throw new Error("XDEFI Bitcoin wallet not available");
      }
      return await window.xfi.bitcoin.sendTransaction(to, amount);
    },
  };

  const deposit = useCallback(
    async (
      amountStr: string,
      amountoutStr: string,
      token: Token,
      userAddress: string
    ): Promise<string> => {
      setIsProcessing(true);
      setError(null);

      try {

        const iface = new Interface(acquisitionAbi.abi);
        const parsedValue = parseUnits(amountStr, 18);
        const parsedValue2 = parseUnits(amountoutStr, 18);

        let callAddress;
        if (token.symbol === "ETH") {
          callAddress = 0x00000000000000000000000000000000000000E0
        } else if (token.symbol === "BTC"){
          callAddress = 0x00000000000000000000000000000000000000b0;
        } else {
          callAddress = token.address;
        }

        const calldata = iface.encodeFunctionData("deposit", [
          callAddress,
          parsedValue,
          parsedValue2,
        ]);

        let holdingWalletAddress;
        if (token.symbol === "BTC"){
          holdingWalletAddress = process.env.NEXT_PUBLIC_BITCOLLECTOR_ADDRESS!;
        } else {        
          holdingWalletAddress = process.env.NEXT_PUBLIC_COLLECTOR_ADDRESS!;
        }

        /*************** CROSS CHAIN TRANSFER CALL ***************/
        const txHashOnTarget = await sendTransferOnTargetChain(holdingWalletAddress, parsedValue, {
          address: token.address!,
          decimals: token.decimals,
          symbol: token.symbol,
        });
        
        if (!window.ethereum) {
          throw new Error("Ethereum provider not found.");
        }

        const provider = new BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();

        let tx: TransactionResponse | undefined;
        let receipt: TransactionReceipt | null = null;
        let chainStatus = true;
        let amountToSend;
    
        try {
          // Step 3: Send transaction directly to contract
          const tx = await signer.sendTransaction({
            to: deployments.SmartVault,
            value: 0n,
            data: calldata,
            gasLimit: 50_000n,
          });

          receipt = await tx.wait();

          if(!receipt){
            throw new Error("No Receipt Generated")
          }
          for (const log of receipt.logs) {
            try {
              const mutableTopics = [...log.topics];
              const parsed = iface.parseLog({ topics: mutableTopics, data: log.data });
              if (parsed?.name === "Deposited") {
                amountToSend = parsed.args.amountOut ?? parsed.args[0];
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
        
        const signerForTransfer = "global";
        const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

        sendReconciliation({
          apiKey: process.env.NEXT_PUBLIC_API_SECRET!,
          to: userAddress,
          amount: amountToSend,
          tokenAddress: ZERO_ADDRESS,
          chain: signerForTransfer
        }).then(({ txHash, status }) => {
          console.log(`Refund sent! Tx: ${txHash}, Status: ${status}`);
        }).catch(console.error);

        const now = new Date().toISOString();

        const successPayload: AcquisitionPayload = {
          txhash: tx?.hash || "",
          contractaddress: deployments.SmartVault,
          useraddress: userAddress,
          stablein: amountStr,
          gbdout: amountStr,
          paymentmethod: token.symbol,
          status: "accepted",
          chainstatus: true,
          processedat: now,
          receipthash: receipt?.blockHash || "",
          notes: "success",
          timestamp: now,
        };

        await logAcquisitionCommit(successPayload);

        return tx?.hash || "";
      } catch (e: any) {
        setError(e);

        const now = new Date().toISOString();

        const errorPayload: AcquisitionPayload = {
          txhash: "",
          contractaddress: deployments.SmartVault,
          useraddress: userAddress,
          stablein: amountStr,
          gbdout: amountStr,
          paymentmethod: token.symbol ?? "unknown",
          status: "failed",
          chainstatus: false,
          processedat: null,
          receipthash: "",
          notes: e.message ?? "Signing failed",
          timestamp: now,
        };

        await logAcquisitionCommit(errorPayload);

        throw e;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return { isProcessing, error, deposit };
}
