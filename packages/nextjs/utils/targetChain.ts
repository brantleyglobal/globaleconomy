import { useSwitchChain, useAccount } from 'wagmi';
import { erc20Abi } from 'viem';
import Web3 from "web3";

interface BitcoinWallet {
  sendTransaction: (to: string, amount: number) => Promise<string>;
}

interface ChainInfo {
  chainId: number;
  chainName: string;
  rpcUrls: string[];
  nativeCurrency: { name: string; symbol: string; decimals: number };
  blockExplorerUrls?: string[];
}

const CHAINS: Record<string, ChainInfo> = {
  ethereum: {
    chainId: 1,
    chainName: "Ethereum Mainnet",
    rpcUrls: [], // built-in, no need to add
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://etherscan.io"],
  },
  polygon: {
    chainId: 137,
    chainName: "Polygon Mainnet",
    rpcUrls: [], // built-in, no need to add
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    blockExplorerUrls: ["https://polygonscan.com"],
  },
  global: {
    chainId: 38391207,
    chainName: "GlobalChain",
    rpcUrls: ["https://your-global-rpc-url"],
    nativeCurrency: { name: "GBDo", symbol: "GBDo", decimals: 18 },
    blockExplorerUrls: ["https://brantley-global.com/dashboard"],
  },
  bitcoin: {
    chainId: 0,
    chainName: "Bitcoin",
    rpcUrls: [],
    nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 8 },
  },
};

async function waitForChainChanged(provider: any, expectedChainIdHex: string, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: any;

    function handler(chainId: string) {
      if (chainId === expectedChainIdHex) {
        clearTimeout(timer);
        provider.removeListener?.("chainChanged", handler);
        resolve();
      }
    }

    timer = setTimeout(() => {
      provider.removeListener?.("chainChanged", handler);
      reject(new Error("Timeout waiting for chain switch"));
    }, timeoutMs);

    provider.on?.("chainChanged", handler);
  });
}

async function switchOrAddChain(provider: any, chain: ChainInfo): Promise<void> {
  const hexChainId = "0x" + chain.chainId.toString(16);

  try {
    const currentChainId = await provider.request({ method: "eth_chainId" });
    if (currentChainId === hexChainId) return;

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });

    // 🔎 Wait until the wallet actually reports the new chain
    await waitForChainChanged(provider, hexChainId);

  } catch (err: any) {
    if (err.code === 4902) {
      if (chain.chainId === 1 || chain.chainId === 137) {
        throw new Error(`Chain ${chain.chainName} should already exist in wallet`);
      }
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [chain],
      });
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });

      // 🔎 Wait again after adding
      await waitForChainChanged(provider, hexChainId);

    } else {
      throw err;
    }
  }
}

function rescaleAmount(amount: bigint, fromDecimals: number, toDecimals: number): string {
  if (fromDecimals === toDecimals) return amount.toString();

  if (fromDecimals > toDecimals) {
    const factor = BigInt(10) ** BigInt(fromDecimals - toDecimals);
    return (amount / factor).toString(); // downscale
  } else {
    const factor = BigInt(10) ** BigInt(toDecimals - fromDecimals);
    return (amount * factor).toString(); // upscale
  }
}

export async function sendTransferOnTargetChain(
  recipient: string,
  tamount: bigint, // always scaled to 18 decimals
  selectedToken: { address?: string; decimals?: number; symbol?: string; chain?: keyof typeof CHAINS },
  btcWallet?: BitcoinWallet,
  provider?: any
) {
  if (!selectedToken.address) throw new Error("Token address required");

  const activeProvider = provider || window.ethereum;
  if (!activeProvider) throw new Error("No wallet provider available");

  const chainInfo = CHAINS[selectedToken.chain!];
  if (!chainInfo) throw new Error(`Unknown chain: ${selectedToken.chain}`);

  // Bitcoin branch
  if (selectedToken.chain === "bitcoin") {
    if (!btcWallet) throw new Error("Bitcoin wallet not connected");
    const sats = tamount * 100_000_000n; // BTC → satoshis
    const txid = await btcWallet.sendTransaction(recipient, Number(sats));
    return { txHash: txid, receipt: null };
  }

  // Ethereum‑style chains
  await switchOrAddChain(activeProvider, chainInfo);

  const web3 = new Web3(activeProvider);
  const accounts = await web3.eth.getAccounts();
  const from = accounts[0];

  let receipt;
  if (selectedToken.symbol === "ETH" || selectedToken.symbol === "GBDo") {
    // Native transfer: input is already 18 decimals, chain uses 18 → no rescale
    const value = rescaleAmount(tamount, 18, chainInfo.nativeCurrency.decimals);
    receipt = await web3.eth.sendTransaction({
      from,
      to: recipient,
      value,
      gas: "80000",
    });
  } else {
    // ERC20 transfer: rescale from 18 → token.decimals
    const decimals = selectedToken.decimals ?? 18;
    const value = rescaleAmount(tamount, 18, decimals);
    const tokenContract = new web3.eth.Contract(erc20Abi, selectedToken.address);
    receipt = await tokenContract.methods
      .transfer(recipient, value)
      .send({ from, gas: "80000" });
  }

  // Reset back to GlobalChain if required
  await switchOrAddChain(activeProvider, CHAINS.global);

  return { txHash: receipt.transactionHash, receipt };
}