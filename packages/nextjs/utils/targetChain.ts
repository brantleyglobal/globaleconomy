import { erc20Abi } from 'viem';
import Web3 from "web3";

export interface ChainInfo {
  chainId: number;
  chainName: string;
  rpcUrls: string[];
  nativeCurrency: { name: string; symbol: string; decimals: number };
  blockExplorerUrls?: string[];
  isSolana?: boolean;
}

export const CHAINS: Record<string, ChainInfo> = {
  ethereum: {
    chainId: 1,
    chainName: "Ethereum Mainnet",
    rpcUrls: ["https://cloudflare-eth.com"], 
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://etherscan.io"],
  },
  base: {
    chainId: 8453,
    chainName: "Base Mainnet",
    rpcUrls: ["https://mainnet.base.org"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://basescan.org"],
  },
  polygon: {
    chainId: 137,
    chainName: "Polygon Mainnet",
    rpcUrls: ["https://polygon-rpc.com"], 
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    blockExplorerUrls: ["https://polygonscan.com"],
  },
  global: {
    chainId: 38391207,
    chainName: "GlobalChain",
    rpcUrls: ["https://rpc.brantley-global.com"],
    nativeCurrency: { name: "GBDo", symbol: "GBDo", decimals: 18 },
    blockExplorerUrls: ["https://brantley-global.com/dashboard"],
  },
};

export function normalizeChainId(chainId: number | string): string {
  if (typeof chainId === "number") return "0x" + chainId.toString(16);
  if (typeof chainId === "string") {
    return chainId.startsWith("0x")
      ? "0x" + parseInt(chainId, 16).toString(16)
      : "0x" + parseInt(chainId, 10).toString(16);
  }
  throw new Error("Invalid chainId");
}

export async function switchOrAddChain(provider: any, chain: ChainInfo): Promise<void> {
  if (chain.isSolana) return;
  const targetHex = normalizeChainId(chain.chainId);
  const currentChainId = normalizeChainId(await provider.request({ method: "eth_chainId" }));
  
  if (currentChainId === targetHex) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetHex }],
    });
  } catch (err: any) {
    // Error code 4902 means the chain hasn't been added to the wallet yet
    if (err.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: targetHex,
          chainName: chain.chainName,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: chain.rpcUrls.length > 0 ? chain.rpcUrls : ["https://cloudflare-eth.com"],
          blockExplorerUrls: chain.blockExplorerUrls,
        }],
      });
    } else {
      throw err;
    }
  }

  // Await consensus mapping acknowledgment from the provider loop
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      provider.removeListener?.("chainChanged", handler);
      reject(new Error("Timeout waiting for chainChanged confirmation"));
    }, 15000);

    function handler(chainId: string) {
      if (normalizeChainId(chainId) === targetHex) {
        clearTimeout(timeout);
        provider.removeListener?.("chainChanged", handler);
        resolve();
      }
    }

    provider.on?.("chainChanged", handler);
  });
}

function rescaleAmount(amount: bigint, fromDecimals: number, toDecimals: number): string {
  if (fromDecimals === toDecimals) return amount.toString();

  if (fromDecimals > toDecimals) {
    const factor = BigInt(10) ** BigInt(fromDecimals - toDecimals);
    return (amount / factor).toString();
  } else {
    const factor = BigInt(10) ** BigInt(toDecimals - fromDecimals);
    return (amount * factor).toString();
  }
}

export async function sendTransferOnTargetChain(
  recipient: string,
  tamount: bigint, // input assumes base scale notation
  selectedToken: { address?: string; decimals?: number; symbol?: string; chain?: keyof typeof CHAINS },
  provider?: any
) {
  let receipt2: any;
  let dTxHash;

  const chainInfo = CHAINS[selectedToken.chain!];
  if (!chainInfo) throw new Error(`Unknown chain: ${selectedToken.chain}`);

  // ==========================================
  // EVM EXECUTION ROUTINE
  // ==========================================

  if (!selectedToken.address) throw new Error("Token address required");

  const activeProvider = provider || (typeof window !== "undefined" ? (window as any).ethereum : null);
  if (!activeProvider) throw new Error("No wallet provider available");

  await switchOrAddChain(activeProvider, chainInfo);

  const verifiedChainId = normalizeChainId(await activeProvider.request({ method: "eth_chainId" }));
  if (verifiedChainId !== normalizeChainId(chainInfo.chainId)) {
    throw new Error(`Wallet not on target chain ${chainInfo.chainName}, aborting transaction`);
  }

  const web3 = new Web3(activeProvider);
  const accounts = await web3.eth.getAccounts();
  const from = accounts[0];

  // 3. Execution payload delivery
  if (selectedToken.symbol === "GBDo") {
    const value = rescaleAmount(tamount, 18, chainInfo.nativeCurrency.decimals);
    
    receipt2 = await web3.eth.sendTransaction({
      from,
      to: recipient,
      value: value,
      gas: "150000",
    });
    dTxHash = receipt2.transactionHash;

  } else {
    const decimals = selectedToken.decimals ?? 18;
    const value = rescaleAmount(tamount, 18, decimals);
    
    // Pass standard JSON ABI mapping directly to the Web3 contract interpreter
    const tokenContract = new web3.eth.Contract(erc20Abi as any, selectedToken.address);
    
    receipt2 = await (tokenContract.methods.transfer as any)(recipient, value)
      .send({ from, gas: "80000" });
    dTxHash = receipt2.transactionHash;
  }

  // Return user environment securely back to base chain layout rules
  await switchOrAddChain(activeProvider, CHAINS.global);

  return { dTxHash, receipt2 };
}

export async function ensureGlobalChain(provider: any) {
  const target = CHAINS.global;
  const current = await provider.request({ method: "eth_chainId" });

  if (normalizeChainId(current) !== normalizeChainId(target.chainId)) {
    await switchOrAddChain(provider, target);
  }
}