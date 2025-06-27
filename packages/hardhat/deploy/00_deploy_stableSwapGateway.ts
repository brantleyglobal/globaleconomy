import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { isAddress } from "ethers";
import deployments from "../deployments.json";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying StableSwapGateway from:", deployer.address);

  // Replace with your actual deployed GBD/WGBD token address
  const wgbdAddress = deployments.WGBD; // or however you named it in your deploy script

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
    "0xStableAUDT",
    "0xStableBRZ",
    "0xStableQCAD",
    "0xStableXCHF",
    "0xStableCNHT",
    "0xStableXINR",
    "0xStableJPYC",
    "0xStableKRT",
    "0xStableMMXN",
    "0xStableXSGD",
    "0xStableXZAR"
  ];

  const Gateway = await ethers.getContractFactory("StableSwapGateway");
  const gateway = await Gateway.deploy(deployer.address, wgbdAddress, initialStables);
  await gateway.waitForDeployment();

  const deployedAddress = await gateway.getAddress();
  console.log("StableSwapGateway deployed at:", deployedAddress);

  // Save to deployments.json
  const file = path.join(__dirname, "..", "deployments.json");
  const existing = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf-8"))
    : {};

  fs.writeFileSync(
    file,
    JSON.stringify({ ...existing, StableSwapGateway: deployedAddress }, null, 2)
  );

  console.log("Saved to deployments.json");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
