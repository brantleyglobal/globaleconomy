import { useBalance } from "wagmi";
import { BrowserProvider, ethers, toBeHex, formatUnits } from "ethers";
import type { Address } from "viem";

interface TokenType {
  address?: string;
  decimals?: number;
}

export function detectWalletClient() {
  if (typeof window === "undefined") return null;
  const { ethereum } = window as any;
  if (!ethereum) return null;

  if (ethereum.isMetaMask) return ethereum;
  if (ethereum.isTrust) return ethereum;
  // fallback or add other wallets detection here
  return ethereum;
}

export async function switchToChain(chainIdDecimal: number) {
  const wallet = detectWalletClient();
  if (!wallet) throw new Error("No wallet detected");
  const chainIdHex = toBeHex(chainIdDecimal);

  try {
    await wallet.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    console.log(`Switched to chain ${chainIdHex}`);
  } catch (switchError: any) {
    // 4902 = chain not added to wallet
    if (switchError.code === 4902) {
      // You can optionally add chain here via wallet_addEthereumChain
      console.warn("Chain not found in wallet. Please add it manually or via wallet_addEthereumChain.");
      throw switchError;
    } else {
      console.error("Switch chain error:", switchError);
      throw switchError;
    }
  }
}

// Hook to get user's selected token balance on given chain
export function useSelectedTokenBalance(
  userAddress: string,
  selectedToken: TokenType,
  chainId: number
) {
  const { data: balanceData, isLoading, isError } = useBalance({
    address: userAddress,
    token: selectedToken.address,
    chainId,
  });

  const balanceBigInt = balanceData?.value;
  let balanceBigNumber;
  if (balanceBigInt !== undefined) {
    const balanceBigNumber = formatUnits(balanceBigInt, 18);
  }


  return {
    balanceBigInt,
    balanceBigNumber,
    decimals: selectedToken.decimals ?? 18,
    isLoading,
    isError,
  };
}

// Obtain ethers signer after optionally switching to correct chain
export async function getSignerForChain(chainId: number) {
  const wallet = detectWalletClient();
  if (!wallet) throw new Error("No wallet detected");

  const provider = new BrowserProvider(wallet);

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== chainId) {
    await switchToChain(chainId);
  }

  return provider.getSigner();
}
