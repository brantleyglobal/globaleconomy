import { ethers, upgrades, } from "hardhat";
import fs from "fs";
import path from "path";
import { parseUnits } from "ethers";
import hre from "hardhat";
import gbdoxxAbi from "../artifacts/contracts/dividend/Dividend121.sol/Dividend121.json";

// Deployment Registry
type DeployedContracts = Record<string, string>;
const deploymentsPath = path.join(__dirname, "..", "deployments.json");
const DeploymentsPath = path.join(__dirname, "..", "..", "nextjs", "lib", "contracts", "deployments.json");

function loadDeployments(): DeployedContracts {
  let deployments: DeployedContracts = {};
  if (fs.existsSync(deploymentsPath)) {
    deployments = { ...deployments, ...JSON.parse(fs.readFileSync(deploymentsPath, "utf8")) };
  }
  if (fs.existsSync(DeploymentsPath)) {
    deployments = { ...deployments, ...JSON.parse(fs.readFileSync(DeploymentsPath, "utf8")) };
  }
  return deployments;
}

function saveDeployment(name: string, address: string, registry: DeployedContracts) {
  // Save to both files if you want to keep them in sync,
  // or only to one if preferred.
  registry[name] = address;
  fs.writeFileSync(deploymentsPath, JSON.stringify(registry, null, 2));
  fs.writeFileSync(DeploymentsPath, JSON.stringify(registry, null, 2));
  console.log(`Saved: ${name} → ${address} in both deployments files`);
}

// Deploy UUPS Proxy
async function deployProxy( //Uprgrade Functionality Added
  name: string,
  registry: DeployedContracts,
  args: unknown[] = [],
  initializer = "initialize"
): Promise<string> {
  const factory = await ethers.getContractFactory(name);

  if (registry[name]) {
    console.log(` Upgrading ${name} at ${registry[name]}`);
    const upgraded = await upgrades.upgradeProxy(registry[name], factory);
    await upgraded.waitForDeployment();
    const address = await upgraded.getAddress();
    saveDeployment(name, address, registry); // Optional: re-save to confirm
    return address;
  } else {
    console.log(` Deploying new proxy for ${name}`);
    const proxy = await upgrades.deployProxy(factory, args, {
      kind: "uups",
      initializer,
      timeout: 600000, // 10 minutes in ms
      pollingInterval: 15000, // 15 seconds polling
    });
    await proxy.waitForDeployment();
    const address = await proxy.getAddress();
    saveDeployment(name, address, registry);
    return address;
  }
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

  // Create array of contract names based on your digits pattern
  const contractNames: string[] = [];
  for (let middle = 2; middle <= 8; middle++) {
    let maxDigit = middle + 2;
    for (let fl = 1; fl <= maxDigit; fl++) {
      contractNames.push(`Dividend${fl}${middle}${fl}`);
    }
  }

  // Loop through all contract names and deploy each
  for (const name of contractNames) {
    // Customize constructor/initializer args if needed; here just using deployer address as example
    const args = [deployer.address];

    try {
      await deployProxy(name, deployed, args);
      console.log(`Successfully deployed or upgraded ${name}`);
    } catch (error) {
      console.error(`Failed deployment for ${name}:`, error);
    }
  }

   const stakeablecoinAddresses: string[] = [];

  // Deploy each Dividend contract and collect address
  for (const name of contractNames) {
    const args = [deployer.address]; // Customize args here if needed
    const address = await deployProxy(name, deployed, args);
    stakeablecoinAddresses.push(address);
  }

  const preaddr = [
    "0xca17c338ef4aa7c00a53e1fefb69c464ab1afb5f",
    "0x59Fc523864EbE08669AD17033245809ce15671be",
    "0xc0da787791Ac23eb6D6470d3b660f5743662e65B",
    "0x1ed17b6677228dbE99ea6b819ee305e1C5db33df",
    "0x431dF2036a7471D7b556485169Ade9e609811Fb1"
  ]

  const preids = [
    1,
    2,
    3,
    4,
    5
  ]

  const prefnd = [
    parseUnits("100000000000000000000", 18),
    parseUnits("100000000000000000000", 18),
    parseUnits("50000000", 18),
    parseUnits("50000000", 18),
    parseUnits("50000000", 18)
  ]

  const gbdAddress = await deployProxy("GlobalDominion", deployed, [
    deployer.address,
    preaddr,
    prefnd,
  ]);

  const gbd = await ethers.getContractAt("GlobalDominion", gbdAddress);

  const gbdoAddress = await deployProxy("GlobalDominionX", deployed, [
    deployer.address,
    preaddr,
    prefnd,
  ]);

  const gbdo = await ethers.getContractAt("GlobalDominionX", gbdoAddress);

  // Token Infrastructure
  const copxAddress = await deployProxy("Copian", deployed, [
    deployer.address,
    preaddr,
    prefnd,
  ]);
  const copx = await ethers.getContractAt("Copian", copxAddress);

  const stablecoinAddresses = [
    copxAddress, // COPX
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC     1  
    "0x4A16BAf414b8e637Ed12019faD5Dd705735DB2e0", // QCAD     2
    "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI      3
    "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c", // EURC     4
    "0x7d60F21072b585351dFd5E8b17109458D97ec120", // FDUSD    5
    "0x853d955aCEf822Db058eb8505911ED77F175b99e", // FRAX     6
    "0x6AE7Dfc73E0dDE2aa99ac063DcF7e8A63265108c", // JPYC     7
    "0x95C2E7cbc7Ae370E28160Bd04297C53F96d092B4", // MMXN     8
    "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", // PYUSD    9
    "0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96", // XSGD     10
    "0x0000000000085d4780B73119b644AE5ecd22b376", // TUSD     11
    "0x1456688345527bE1f37E9e627DA0837D6f08C925", // USDP     12
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT     13
    "0x4cCe605eD955295432958d8951D0B176C10720d5", // AUDD     14
    "0xb755506531786C8aC63B756BaB1ac387bACB0C04", // ZARP     15
    "0x5C067C80C00eCd2345b05E83A3e758eF799C40B5", // BRL1     16
    "0x86B4dBE5D203e634a12364C0e428fa242A3FbA98", // GBPT     17
    "0x6FAff971d9248e7d398A98FdBE6a81F6d7489568", // TRYX     18
    "0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f", // EURe     19
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC     20
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH     21
    "0xB8c77482e45F1F44dE1745F52C74426C631bDD52", // BNB
    //"0x00006100F7090010005F1bd7aE6122c3C2CF0090", // AUDT
    //"0x05BBeD16620B352A7F889E23E3Cf427D1D379FFE", // NGNT
    //"0xc71daC923823D748a86D0A3618ABdA2d6dCd6bf4", // INRX
  ]

  const productIds = [
    120720, 120745, 120770,
    1207100, 1207200, 1207300,
    1207400, 1207500, 1207600
  ]

  const basePrices = [
    14000, 15000, 16000,
    43000, 53000, 63000,
    73000, 80000, 90000
  ]

  const regionAdditions = [
    [180, 250, 220, 230, 260, 210, 280, 300],  // for product 120720
    [180, 250, 220, 230, 260, 210, 280, 300],  // for 120745
    [180, 250, 220, 230, 260, 210, 280, 300],  // for 120770
    [450, 650, 600, 620, 700, 580, 750, 800],  // for 1207100
    [450, 650, 600, 620, 700, 580, 750, 800],  // for 1207200
    [450, 650, 600, 620, 700, 580, 750, 800],  // for 1207300
    [450, 650, 600, 620, 700, 580, 750, 800],  // for 1207400
    [450, 650, 600, 620, 700, 580, 750, 800],  // for 1207500
    [450, 650, 600, 620, 700, 580, 750, 800],  // for 1207600
  ]

  const UniswapV2Factory = await deployProxy("UniswapV2Factory", deployed, [
    deployer.address,
    deployer.address,
  ]);

    // Deploy Counter implementation (non-upgradeable)
  const GlobalSwap = await deployContract("GlobalSwap", deployed, []);
  console.log(`GlobalSwap implementation deployed at: ${GlobalSwap}`);

  // Deploy CounterFactory with the Counter implementation address
  const GlobalSwapFactoryAddress = await deployContract("GlobalSwapFactory", deployed, []);
  console.log(`GlobalSwapFactory deployed at: ${GlobalSwapFactoryAddress}`);

  const GlobalSwapFactory = await ethers.getContractAt("GlobalSwapFactory", GlobalSwapFactoryAddress);
  await GlobalSwapFactory.initialize(deployer.address, stablecoinAddresses);

  const AssetPurchase = await deployProxy("AssetPurchase", deployed, [
    deployer.address,
    stablecoinAddresses,
  ]);

  console.log("Stakeablecoin addresses to be passed to SmartVault:");
  for (const [index, addr] of stakeablecoinAddresses.entries()) {
    console.log(`Index ${index}: Address ${addr}`);

    const code = await ethers.provider.getCode(addr);
    if (code === "0x") {
      console.warn(`Warning: No contract code at address ${addr} (index ${index})`);
    }
  }

  const SmartVault = await deployProxy("SmartVault", deployed, [
    deployer.address,
    stablecoinAddresses,
    stakeablecoinAddresses,
    copxAddress,
  ]);

  await gbdo.grantRole(await gbdo.MINTER_ROLE(), SmartVault);
  console.log(`SmartVault granted MINTER_ROLE on GBD2x`);

  for (const addr of stakeablecoinAddresses) {
    try {
      const tokenContract = new ethers.Contract(addr, gbdoxxAbi.abi, deployer);
      const minterRole = await tokenContract.MINTER_ROLE();
      const tx = await tokenContract.grantRole(minterRole, SmartVault);
      await tx.wait();
      console.log(`Granted MINTER_ROLE to SmartVault on token at ${addr}`);
    } catch (error) {
      console.error(`Failed to grant MINTER_ROLE on token at ${addr}:`, error);
    }
  }

  const TransferTracker = await deployProxy("TransferTracker", deployed, [
    deployer.address,
  ]);

  const UserQueryHub = await deployProxy("UserQueryHub", deployed, [
    deployer.address,
    deployed["TransferTracker"],
    deployed["AssetPurchase"],
    deployed["SmartVault"],
  ]);

  const MainPoolManager = await deployProxy("PoolManager", deployed, [
    deployer.address,
    deployed["SmartVault"],
  ]);

  // ABI Generation
  const generateTsAbis = await import("./generateTsAbis").then((m) => m.default);
  await generateTsAbis(hre);
  console.log(" TypeScript ABIs generated.");
}

main().catch((err) => {
  console.error(" Deployment failed:", err);
  process.exit(1);
});
