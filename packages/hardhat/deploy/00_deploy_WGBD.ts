import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying WGBD (UUPS proxy) from:", deployer.address);

  // Deploy WGBD proxy
  const WGBD = await ethers.getContractFactory("WGBD");
  const wgbd = await upgrades.deployProxy(WGBD, [], {
    initializer: "initialize",
    kind: "uups"
  });

  await wgbd.waitForDeployment();
  const address = await wgbd.getAddress();
  console.log("WGBD proxy deployed at:", address);

  // Save to deployments.json
  const file = path.join(__dirname, "..", "deployments.json");
  const existing = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf-8"))
    : {};

  fs.writeFileSync(
    file,
    JSON.stringify({ ...existing, WGBD: address }, null, 2)
  );

  console.log("Address saved to deployments.json");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
