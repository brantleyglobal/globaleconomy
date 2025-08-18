import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";
import { isAddress } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying UniswapV2Router02 (UUPS proxy) from: ${deployer.address}`);

  // Load addresses
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  const deployed = fs.existsSync(deploymentsPath)
    ? JSON.parse(fs.readFileSync(deploymentsPath, "utf8"))
    : {};

  const factoryAddress = deployed.UniswapV2Factory;
  const wgbdAddress = deployed.WGBD;

  if (!isAddress(factoryAddress) || !isAddress(wgbdAddress)) {
    throw new Error("Invalid or missing UniswapV2Factory or WGBD in deployments.json");
  }

  // Deploy UniswapV2Router02 as UUPS proxy
  const Router = await ethers.getContractFactory("UniswapV2Router02");
  const router = await upgrades.deployProxy(Router, [factoryAddress, wgbdAddress], {
    initializer: "initialize",
    kind: "uups"
  });

  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log(`UniswapV2Router02 deployed at: ${routerAddress}`);

  // Save to deployments.json
  deployed.UniswapV2Router02 = routerAddress;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployed, null, 2));
  console.log("Router address saved to deployments.json");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
