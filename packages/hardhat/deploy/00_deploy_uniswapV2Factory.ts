import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying UniswapV2Factory from:", deployer.address);

  // You can set the deployer as the feeToSetter or replace with another address
  const feeToSetter = deployer.address;

  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(feeToSetter);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("UniswapV2Factory deployed at:", factoryAddress);

  // Save to deployments.json
  const file = path.join(__dirname, "..", "deployments.json");
  const existing = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf-8"))
    : {};

  fs.writeFileSync(
    file,
    JSON.stringify({ ...existing, UniswapV2Factory: factoryAddress }, null, 2)
  );

  console.log("Deployment saved to deployments.json");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});
