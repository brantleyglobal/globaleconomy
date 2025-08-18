import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying StableSwapGateway (UUPS proxy) from:", deployer.address);

  // Load prior deployments
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  const deployed = fs.existsSync(deploymentsPath)
    ? JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"))
    : {};

  const wgbdAddress = deployed.WGBD;
  if (!wgbdAddress) {
    throw new Error("Missing WGBD address in deployments.json");
  }

  // Replace with your actual initial stablecoin addresses
  const initialStables = [
  "0xStableUSDC",
  "0xStableDAI",
  "0xStableEURC",
  "0xStableFDUSD",
  "0xStableFRAX",
  "0xStableTUSD",
  "0xStablePYUSD",
  "0xStableUSDP",
  "0xStableUSDT",
  "0xStableGUSD",
  "0xStableGBPT",
  "0xStableXAED",
  "0xStableAUDD",
  "0xStableBRL1",
  "0xStableQCAD",
  "0xStableXCHF",
  "0xStableCNHT",
  "0xStableINRX",
  "0xStableJPYC",
  "0xStableKRT",
  "0xStableMMXN",
  "0xStableXSGD",
  "0xStableZARP",
  "0xStableARSX",
  "0xStableTRYX",
  "0xStableNGNT"
];


  const GatewayFactory = await ethers.getContractFactory("StableSwapGateway");
  const gateway = await upgrades.deployProxy(
    GatewayFactory,
    [deployer.address, wgbdAddress, initialStables],
    { initializer: "initialize", kind: "uups" }
  );
  await gateway.waitForDeployment();

  const gatewayAddress = await gateway.getAddress();
  console.log("StableSwapGateway deployed at:", gatewayAddress);

  deployed.StableSwapGateway = gatewayAddress;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployed, null, 2));
  console.log("Updated deployments.json");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
