import { ethers } from "hardhat";
import { isAddress } from "ethers";
import deployments from "../deployments.json";



async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying UniswapV2Router02 from: ${deployer.address}`);

  const factoryAddress = deployments.UniswapV2Factory;
  const wgbdAddress = deployments.WGBD; // or however you named it in your deploy script


  if (!isAddress(factoryAddress) || !isAddress(wgbdAddress)) {
    throw new Error("Invalid address");
  }


  const Router = await ethers.getContractFactory("UniswapV2Router02");
  const router = await Router.deploy(factoryAddress, wgbdAddress);

  await router.waitForDeployment(); // Newer ethers v6-style (optional if using v5)
  console.log(`UniswapV2Router02 deployed at: ${await router.getAddress()}`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});

