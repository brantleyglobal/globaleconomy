import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying UserQueryHub (UUPS proxy) from:", deployer.address);

  // Load previously deployed dependencies
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  const deployed = fs.existsSync(deploymentsPath)
    ? JSON.parse(fs.readFileSync(deploymentsPath, "utf8"))
    : {};

  const { TransferTracker: tracker, AssetPurchase: asset, SmartVault: vault, StableSwapGateway: swap } = deployed;

  if (!(tracker && asset && vault && swap)) {
    throw new Error("One or more dependency addresses missing in deployments.json");
  }

  // Deploy UserQueryHub proxy
  const HubFactory = await ethers.getContractFactory("UserQueryHub");
  const hub = await upgrades.deployProxy(HubFactory, [tracker, asset, vault, swap], {
    initializer: "initialize",
    kind: "uups",
  });
  await hub.waitForDeployment();

  const hubAddress = await hub.getAddress();
  console.log("UserQueryHub proxy deployed at:", hubAddress);

  // Save address
  deployed.UserQueryHub = hubAddress;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployed, null, 2));
  console.log("UserQueryHub address saved to deployments.json");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
