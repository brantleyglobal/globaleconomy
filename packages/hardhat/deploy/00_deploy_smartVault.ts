import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SmartVault from:", deployer.address);

  // Read WGBD from previous deploy
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const wgbdAddress = deployments.WGBD;

  if (!wgbdAddress) {
    throw new Error("Missing WGBD address in deployments.json");
  }

  const deployed: Record<string, string> = deployments;

  const SmartVault = await ethers.getContractFactory("SmartVault");
  const vault = await SmartVault.deploy(deployer.address, wgbdAddress, deployer.address);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log("SmartVault deployed at:", vaultAddress);
  deployed.SmartVault = vaultAddress;

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployed, null, 2));
  console.log("✅ SmartVault address added to deployments.json");
}

main().catch((err) => {
  console.error("SmartVault deploy failed:", err);
  process.exitCode = 1;
});

