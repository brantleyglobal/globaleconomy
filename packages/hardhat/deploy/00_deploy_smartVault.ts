import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SmartVault (UUPS proxy) from:", deployer.address);

  // Load prior deployments
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  const deployed = fs.existsSync(deploymentsPath)
    ? JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"))
    : {};

  const wgbdAddress = deployed.WGBD;
  if (!wgbdAddress) {
    throw new Error("Missing WGBD address in deployments.json");
  }

  // Deploy SmartVault proxy
  const VaultFactory = await ethers.getContractFactory("SmartVault");
  const vault = await upgrades.deployProxy(
    VaultFactory,
    [deployer.address, wgbdAddress, deployer.address],
    { initializer: "initialize", kind: "uups" }
  );
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  console.log("SmartVault proxy deployed at:", vaultAddress);

  // Save to deployments
  deployed.SmartVault = vaultAddress;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployed, null, 2));
  console.log("Updated deployments.json");
}

main().catch((err) => {
  console.error("SmartVault deploy failed:", err);
  process.exitCode = 1;
});
