import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AssetPurchase (UUPS proxy) with:", deployer.address);

  // Replace with your actual StableSwapGateway proxy address
  const redemptionGatewayAddress = "0xYourStableSwapGatewayAddressHere";

  // Deploy AssetPurchase as UUPS proxy
  const PurchaseFactory = await ethers.getContractFactory("AssetPurchase");
  const purchase = await upgrades.deployProxy(PurchaseFactory, [deployer.address], {
    initializer: "initialize",
    kind: "uups"
  });
  await purchase.waitForDeployment();

  const assetPurchaseAddress = await purchase.getAddress();
  console.log("AssetPurchase proxy deployed at:", assetPurchaseAddress);

  // Set the redemption gateway after deployment
  const tx = await purchase.setRedemptionGateway(redemptionGatewayAddress);
  await tx.wait();
  console.log(`Redemption gateway set to: ${redemptionGatewayAddress}`);

  // Save to deployments.json
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  const existing = fs.existsSync(deploymentsPath)
    ? JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"))
    : {};

  fs.writeFileSync(
    deploymentsPath,
    JSON.stringify({ ...existing, AssetPurchase: assetPurchaseAddress }, null, 2)
  );

  console.log("Deployment complete. Address saved to deployments.json");
}

main().catch((error) => {
  console.error("Deployment error:", error);
  process.exit(1);
});
