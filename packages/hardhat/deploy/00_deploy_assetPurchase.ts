import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AssetPurchase with:", deployer.address);

  // Replace with actual deployed gateway address
  const redemptionGatewayAddress = "0xYourStableSwapGatewayAddressHere";

  // Deploy AssetPurchase
  const PurchaseFactory = await ethers.getContractFactory("AssetPurchase");
  const purchase = await PurchaseFactory.deploy();
  await purchase.waitForDeployment();

  const assetPurchaseAddress = await purchase.getAddress();
  console.log("AssetPurchase deployed at:", assetPurchaseAddress);

  // Set redemption gateway
  const tx = await purchase.setRedemptionGateway(redemptionGatewayAddress);
  await tx.wait();
  console.log("Redemption gateway set to:", redemptionGatewayAddress);

  // Save deployment
  const file = path.join(__dirname, "..", "deployments.json");
  const existing = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf-8"))
    : {};

  fs.writeFileSync(
    file,
    JSON.stringify({ ...existing, AssetPurchase: assetPurchaseAddress }, null, 2)
  );

  console.log("Saved to deployments.json");
}

main().catch((error) => {
  console.error("Deployment error:", error);
  process.exit(1);
});
