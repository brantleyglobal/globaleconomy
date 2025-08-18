import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PoolManagerLib from:", deployer.address);

  // Load prior deployments
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  const deployed = fs.existsSync(deploymentsPath)
    ? JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"))
    : {};

  // Replace these with your actual addresses
  const poolAddress = "0xYourPoolAddressHere"; // <-- your pool contract address
  const queryHubAddress = "0xYourQueryHubAddressHere"; // <-- your query hub contract address
  const adminAddress = deployer.address; // Or specify another admin address

  // Deploy the contract as a UUPS upgradeable proxy
  const PoolManagerLibFactory = await ethers.getContractFactory("PoolManagerLib");
  const poolManagerLib = await upgrades.deployProxy(
    PoolManagerLibFactory,
    [poolAddress, queryHubAddress, adminAddress],
    { initializer: "initialize", kind: "uups" }
  );
  await poolManagerLib.waitForDeployment();

  const poolManagerAddress = await poolManagerLib.getAddress();
  console.log("PoolManagerLib deployed at:", poolManagerAddress);

  // Save deployment info
  deployed.PoolManagerLib = poolManagerAddress;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployed, null, 2));
  console.log("Updated deployments.json");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exitCode = 1;
});