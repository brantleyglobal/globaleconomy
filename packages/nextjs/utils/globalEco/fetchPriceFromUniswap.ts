import { ChainWithAttributes } from "./networks";
import { CurrencyAmount, Token } from "@uniswap/sdk-core";
import { Pair, Route } from "@uniswap/v2-sdk";
import { Address, createPublicClient, http, parseAbi } from "viem";
import scaffoldConfig from "~~/scaffold.config";

const ABI = parseAbi([
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
]);

export const fetchPriceFromUniswap = async (targetNetwork: ChainWithAttributes): Promise<number> => {
  const { nativeCurrency, nativeCurrencyTokenAddress, id: chainId } = targetNetwork;

  if (!nativeCurrencyTokenAddress || (nativeCurrency.symbol !== "GBDO" && nativeCurrency.symbol !== "SEP")) {
    return 0;
  }

  try {
    const rpcUrl = scaffoldConfig.rpcOverrides?.[chainId] || process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpcUrl) throw new Error("No RPC URL available for this network.");

    const publicClient = createPublicClient({
      chain: targetNetwork,
      transport: http(rpcUrl),
    });

    const DAI = new Token(chainId, "0x6B175474E89094C44Da98b954EedeAC495271d0F", 18);
    const TOKEN = new Token(chainId, nativeCurrencyTokenAddress, 18);
    const pairAddress = Pair.getAddress(TOKEN, DAI) as Address;

    const wagmiConfig = { address: pairAddress, abi: ABI };

    const reserves = await publicClient.readContract({ ...wagmiConfig, functionName: "getReserves" });
    const token0Address = await publicClient.readContract({ ...wagmiConfig, functionName: "token0" });
    const token1Address = await publicClient.readContract({ ...wagmiConfig, functionName: "token1" });

    const token0 = [TOKEN, DAI].find(t => t.address === token0Address) as Token;
    const token1 = [TOKEN, DAI].find(t => t.address === token1Address) as Token;

    const pair = new Pair(
      CurrencyAmount.fromRawAmount(token0, reserves[0].toString()),
      CurrencyAmount.fromRawAmount(token1, reserves[1].toString()),
    );

    const route = new Route([pair], TOKEN, DAI);
    return parseFloat(route.midPrice.toSignificant(6));
  } catch (error) {
    console.error(`Error fetching ${nativeCurrency.symbol} price from Uniswap:`, error);
    return 0;
  }
};
