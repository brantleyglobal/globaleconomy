import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying UniswapV2Factory (UUPS proxy) from:", deployer.address);

  const feeToSetter = deployer.address;

  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await upgrades.deployProxy(Factory, [feeToSetter], {
    initializer: "initialize",
    kind: "uups"
  });

  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("UniswapV2Factory proxy deployed at:", factoryAddress);

  // Save to deployments.json
  const file = path.join(__dirname, "..", "deployments.json");
  const existing = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf-8"))
    : {};

  fs.writeFileSync(
    file,
    JSON.stringify({ ...existing, UniswapV2Factory: factoryAddress }, null, 2)
  );

  console.log("Address saved to deployments.json");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});
