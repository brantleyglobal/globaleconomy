import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TransferTracker (UUPS proxy) from:", deployer.address);

  // Deploy TransferTracker as UUPS proxy
  const TrackerFactory = await ethers.getContractFactory("TransferTracker");
  const tracker = await upgrades.deployProxy(TrackerFactory, [], {
    initializer: "initialize",
    kind: "uups"
  });
  await tracker.waitForDeployment();

  const trackerAddress = await tracker.getAddress();
  console.log("TransferTracker proxy deployed at:", trackerAddress);

  // Save to deployments.json
  const filePath = path.resolve(__dirname, "..", "deployments.json");
  const existing = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, "utf-8"))
    : {};

  const updated = { ...existing, TransferTracker: trackerAddress };
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
  console.log("Address saved to deployments.json");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
