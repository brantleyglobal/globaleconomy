import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying all contracts from:", deployer.address);

  const deployed: Record<string, string> = {};

  // === Stablecoins ===
  /*const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy(ethers.parseUnits("1000000", 6));
  await usdc.waitForDeployment();
  deployed.MockUSDC = await usdc.getAddress();
  console.log("MockUSDC deployed at:", deployed.MockUSDC);*/

  /*const GBDToken = await ethers.getContractFactory("GBDToken");
  const gbd = await GBDToken.deploy(ethers.parseUnits("1000000", 18));
  await gbd.waitForDeployment();
  deployed.GBDToken = await gbd.getAddress();
  console.log("GBDToken deployed at:", deployed.GBDToken);*/

  const WGBD = await ethers.getContractFactory("WETH9");
  const wgbd = await WGBD.deploy();
  await wgbd.waitForDeployment();
  deployed.WGBD = await wgbd.getAddress();
  console.log("WGBD deployed at:", deployed.WGBD);

  // === Uniswap (Mock) ===
  const [uniSwapV2Factorydeployer] = await ethers.getSigners(); // Grab the signer address
  const uniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
  const uniSwapV2Factory = await uniswapV2Factory.deploy(deployer.address); // Pass as _feeToSetter
  await uniSwapV2Factory.waitForDeployment();

  deployed.UniswapV2Factory = await uniSwapV2Factory.getAddress();
  console.log("UniswapV2Factory deployed at:", deployed.UniswapV2Factory);



  const Router = await ethers.getContractFactory("UniswapV2Router02");
  if (!deployed.UniswapV2Factory) {
    throw new Error("Missing deployed address for UniswapV2Factory");
  }
  if (!deployed.WGBD) {
    throw new Error("Missing deployed address for WGBD");
  }

  const router = await Router.deploy(deployed.UniswapV2Factory, deployed.WGBD);
  await router.waitForDeployment();
  deployed.UniswapV2Router02 = await router.getAddress();
  console.log("UniswapV2Router02 deployed at:", deployed.UniswapV2Router02);

  // === StableSwap Gateway ===
  const StableSwapGateway = await ethers.getContractFactory("StableSwapGateway");
  const gateway = await StableSwapGateway.deploy(
    deployer.address,
    deployed.WGBD, // use WGBD instead of GBDToken
    [] // placeholder stablecoin array
  );
  await gateway.waitForDeployment();
  deployed.StableSwapGateway = await gateway.getAddress();
  console.log("StableSwapGateway deployed at:", deployed.StableSwapGateway);


  await gateway.waitForDeployment();
  deployed.StableSwapGateway = await gateway.getAddress();
  console.log("StableSwapGateway deployed at:", deployed.StableSwapGateway);

  // === DApp Contracts ===
  const AssetPurchase = await ethers.getContractFactory("AssetPurchase");
  const purchase = await AssetPurchase.deploy();
  await purchase.waitForDeployment();
  deployed.AssetPurchase = await purchase.getAddress();
  console.log("AssetPurchase deployed at:", deployed.AssetPurchase);

  const AssetStore = await ethers.getContractFactory("AssetStore");
  const store = await AssetStore.deploy();
  await store.waitForDeployment();
  deployed.AssetStore = await store.getAddress();
  console.log("AssetStore deployed at:", deployed.AssetStore);

 // === Deploy SmartVault with WGBD ===
  const wgbdAddress = deployed.WGBD;
  if (!wgbdAddress) {
    throw new Error("WGBD must be deployed before deploying SmartVault.");
  }

  const SmartVault = await ethers.getContractFactory("SmartVault");
  const smartVault = await SmartVault.deploy(deployer.address, wgbdAddress, deployer.address);
  await smartVault.waitForDeployment();

  const smartVaultAddress = await smartVault.getAddress();
  deployed.SmartVault = smartVaultAddress;
  console.log("SmartVault deployed at:", smartVaultAddress);


  // === Output addresses to file ===
  fs.writeFileSync("deployments.json", JSON.stringify(deployed, null, 2));
  console.log("\nAll contract addresses saved to deployments.json");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
