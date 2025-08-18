import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

// Deployment Registry
type DeployedContracts = Record<string, string>;
const deploymentsPath = path.join(__dirname, "..", "deployments.json");

function loadDeployments(): DeployedContracts {
  return fs.existsSync(deploymentsPath)
    ? JSON.parse(fs.readFileSync(deploymentsPath, "utf8"))
    : {};
}

function saveDeployment(name: string, address: string, registry: DeployedContracts) {
  registry[name] = address;
  fs.writeFileSync(deploymentsPath, JSON.stringify(registry, null, 2));
  console.log(` Saved: ${name} → ${address}`);
}

// Deploy UUPS Proxy
async function deployProxy(
  name: string,
  registry: DeployedContracts,
  args: unknown[] = [],
  initializer = "initialize"
): Promise<string> {
  const factory = await ethers.getContractFactory(name);
  const proxy = await upgrades.deployProxy(factory, args, {
    kind: "uups",
    initializer,
  });

  await proxy.waitForDeployment();
  const address = await proxy.getAddress();
  saveDeployment(name, address, registry);
  return address;
}

// Deploy Standard Contract
async function deployContract(
  name: string,
  registry: DeployedContracts,
  args: unknown[] = []
): Promise<string> {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  saveDeployment(name, address, registry);
  return address;
}

// Main Deployment Flow
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(` Deploying contracts with signer: ${deployer.address}\n`);

  const deployed = loadDeployments();

  // Deploy EntryPoint (standard contract)
  const EntryPoint = await deployContract("EntryPoint", deployed);

  // Deploy SimpleAccountFactory with EntryPoint address
  const SimpleAccountFactory = await deployContract("SimpleAccountFactory", deployed, [
    EntryPoint,
  ]); // I believe the error is here

  // Deploy Simple7702Account (standard contract or proxy depending on your design)
  const Simple7702Account = await deployContract("Simple7702Account", deployed);

  // Core Infrastructure
  const WGBD = await deployProxy("WGBD", deployed, [deployer.address]);

  const UniswapV2Factory = await deployProxy("UniswapV2Factory", deployed, [
    deployer.address,
    deployer.address,
  ]);

  const UniswapV2Router02 = await deployProxy("UniswapV2Router02", deployed, [
    UniswapV2Factory,
    WGBD,
    deployer.address,
  ]);

  const StableSwapGateway = await deployProxy("StableSwapGateway", deployed, [
    deployer.address,
    WGBD,
    [],
    25,
  ]);

  const AssetPurchase = await deployProxy("AssetPurchase", deployed, [
    deployer.address,
    25,
  ]);

  const SmartVault = await deployProxy("SmartVault", deployed, [
    deployer.address,
    WGBD,
    UniswapV2Factory,
  ]);

  const TransferTracker = await deployProxy("TransferTracker", deployed, [
    deployer.address,
  ]);

  const UserQueryHub = await deployProxy("UserQueryHub", deployed, [
    deployer.address,
    deployed["TransferTracker"],
    deployed["AssetPurchase"],
    deployed["SmartVault"],
    deployed["StableSwapGateway"],
  ]);

  const MainPoolManager = await deployProxy("PoolManager", deployed, [
    deployer.address,
    deployed["SmartVault"],
    deployed["UserQueryHub"],
  ]);

  // ABI Generation
  const generateTsAbis = await import("./generateTsAbis").then((m) => m.default);
  await generateTsAbis({hre}); // Adjust if generateTsAbis expects hre
  console.log(" TypeScript ABIs generated.");
}

main().catch((err) => {
  console.error(" Deployment failed:", err);
  process.exit(1);
});
