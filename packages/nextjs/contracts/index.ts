import { ethers } from "ethers";
import deployments from "../../hardhat/deployments.json";


// Typechain-generated factories
import {
  AssetPurchase__factory,
  AssetStore__factory,
  SmartVault__factory,
  StableSwapGateway__factory,
  UniswapV2Router02__factory,
  WETH9__factory
} from "../../../packages/hardhat/typechain-types";

export function getContracts(provider: ethers.Signer | ethers.Provider) {
  return {
    assetPurchase: AssetPurchase__factory.connect(deployments.AssetPurchase, provider),
    assetStore: AssetStore__factory.connect(deployments.AssetStore, provider),
    smartVault: SmartVault__factory.connect(deployments.SmartVault, provider),
    stableSwapGateway: StableSwapGateway__factory.connect(deployments.StableSwapGateway, provider),
    wgbd: WETH9__factory.connect(deployments.WGBD, provider),
    uniswapRouter: UniswapV2Router02__factory.connect(deployments.UniswapV2Router02, provider),
  };
}
