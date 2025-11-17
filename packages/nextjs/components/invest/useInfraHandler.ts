

import { useState, useCallback, useEffect } from "react";
import { Interface, parseUnits, } from "ethers";
import smartVaultAbi from "~~/lib/contracts/abi/SmartVault.json";
import deployments from "~~/lib/contracts/deployments.json";
import type { Token } from "~~/components/constants/tokens";
import { logInfraCommit } from "./logInfraCommit";
import { useWalletClient } from "wagmi";
import { Address } from "viem";
import { useSelectedTokenBalance } from "~~/lib/chainHelper";
import { sendTransferOnTargetChain } from "~~/utils/targetChain";

// Helper to generate term code (YYQDD)
function generateTermCode(): string {
  const date = new Date();
  const year = date.getFullYear() % 100;
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}${quarter}${day}`;
}

interface VaultPayload {
  txhash: string;
  contractaddress: string;
  useraddress: string;
  depositamount: string;
  committedquarters: number;
  paymentmethod: string;
  depositstarttime: string;
  venture: string;
  ispending: number;
  isclosed: number;
  status: string;
  chainstatus: boolean;
  queuedat: string;
  processedat: string | null;
  priority: number;
  retrycount: number;
  receipthash: string;
  notes: string;
  timestamp: string;
}

interface UseDepositResult {
  isProcessing: boolean;
  error: Error | null;
  infra: (
    amountStr: string,
    ventureAddress: Token,
    token: Token,
    userAddress: string,
    committedQuarters: number,
  ) => Promise<string>; 
}

interface BitcoinWallet {
  sendTransaction: (to: string, amount: number) => Promise<string>;
}

type TxResult = {
  txHash: string;
  receipt: any | null;
};

export function useInfra(): UseDepositResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
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

  const btcWallet: BitcoinWallet = {
    sendTransaction: async (to, amount) => {
      if (!window.xfi?.bitcoin) {
        throw new Error("XDEFI Bitcoin wallet not available");
      }
      return await window.xfi.bitcoin.sendTransaction(to, amount);
    },
  };
  
  const infra = useCallback(
    async (
      amountStr: string,
      ventureAddress: Token,
      token: Token,
      userAddress: string,
      committedQuarters: number,
    ): Promise<string> => {
      setIsProcessing(true);
      setError(null);

      try {
        if (!window.ethereum) throw new Error("Ethereum provider not found.");

        const iface = new Interface(smartVaultAbi.abi);
        const parsedValue = parseUnits(amountStr, token.decimals);

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
    
        const isOnMyChain = myChainSupportedTokenAddresses.has(token.address as Address);
        const isOnPoly = polyAddresses.has(token.address as Address);
        const isOnEthChain = !isOnMyChain && !isOnPoly;
    
        let selectedTokenChainId;
        if(isOnMyChain){
          selectedTokenChainId = 38391207;
        }else if(isOnPoly){
          selectedTokenChainId = 137;
        }else{
          selectedTokenChainId = 1;
        }
        
        const { balanceBigInt, balanceBigNumber, decimals, isLoading } = useSelectedTokenBalance(
          userAddress,
          token,
          selectedTokenChainId
        );
    
        if (!isLoading && balanceBigNumber !== undefined) {
          //const requiredAmount = ethers.utils.parseUnits(value, decimals);
          if (balanceBigNumber < parsedValue) {
            console.log(`Insufficient ${token.symbol} balance.`);
          }
        }

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
          ventureAddress.address,
          generateTermCode(),
        ]);

        let holdingWalletAddress;
        if (token.symbol === "BTC"){
          holdingWalletAddress = process.env.NEXT_PUBLIC_BITCOLLECTOR_ADDRESS!;
        } else {        
          holdingWalletAddress = deployments.RegionInfrastructure;
        }

        /*************** CROSS CHAIN TRANSFER CALL ***************/
        console.log("Selected token:", token.symbol, token.chain, token.address);

        if (!provider) {
          throw new Error("No provider available");
        }
        const { txHash, receipt } = await sendTransferOnTargetChain(
          holdingWalletAddress,
          parsedValue,
          {
            address: token.address!,
            decimals: token.decimals,
            symbol: token.symbol,
            chain: token.chain,
          },
          btcWallet,
          provider // pass provider here
        );

        const now = new Date().toISOString();

        const successPayload: VaultPayload = {
          txhash: txHash.toString() ?? "",
          contractaddress: deployments.RegionInfrastructure,
          useraddress: userAddress,
          depositamount: amountStr,
          committedquarters: committedQuarters,
          paymentmethod: token.symbol,
          depositstarttime: now,
          venture: ventureAddress.address,
          ispending: 0,
          isclosed: 0,
          status: "accepted",
          chainstatus: true,
          queuedat: now,
          processedat: now,
          priority: 0,
          retrycount: 0,
          receipthash: receipt?.blockHash.toString()  ?? "",
          notes: "success",
          timestamp: now,
        };

        await logInfraCommit(successPayload);

        return txHash.toString() ?? "";
      } catch (e: any) {
        setError(e);

        const now = new Date().toISOString();

        const errorPayload: VaultPayload = {
          txhash: "",
          contractaddress: deployments.RegionInfrastructure,
          useraddress: userAddress,
          depositamount: amountStr,
          committedquarters: 0,
          paymentmethod: token.symbol ?? "unknown",
          depositstarttime: now,
          venture: ventureAddress.address,
          ispending: 1,
          isclosed: 0,
          status: "failed",
          chainstatus: false,
          queuedat: now,
          processedat: null,
          priority: 0,
          retrycount: 0,
          receipthash: "",
          notes: e.message ?? "Signing failed",
          timestamp: now,
        };

        await logInfraCommit(errorPayload);

        throw e;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return { isProcessing, error, infra };
}
