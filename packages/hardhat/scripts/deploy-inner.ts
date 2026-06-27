import fs from "fs";
import readline from "readline";import path from "path";
import { parseUnits, Wallet } from "ethers";
import gbdoxxAbi from "../artifacts/contracts/dividend/Dividend121.sol/Dividend121.json";
import shieldAbi from "../artifacts/contracts/globalShield.sol/GlobalShield.json";
import ledgerAbi from "../artifacts/contracts/ledger/globalLedger.sol/GlobalLedger.json";
import vaultAbi from "../artifacts/contracts/vaults/smartVault.sol/SmartVault.json";
import regionAbi from "../artifacts/contracts/vaults/regionInfrastructure.sol/RegionInfrastructure.json";
import purchaseAbi from "../artifacts/contracts/purchase/assetPurchase.sol/AssetPurchase.json";
import acquisitionAbi from "../artifacts/contracts/purchase/acquisitionGateway.sol/AcquisitionGateway.json";
import swapregistryAbi from "../artifacts/contracts/xchange/globalSwapRegistry.sol/GlobalSwapRegistry.json"
import dotenv from "dotenv";
dotenv.config();

// Deployment Registry
type DeployedContracts = Record<string, string>;
const deploymentsPath = path.join(__dirname, "..", "deployments.json");
const deploymentsPathE = path.join(__dirname, "..", "globalsync-partner", "src", "deployments.json");
const DeploymentsPath = path.join(__dirname, "..", "..", "nextjs", "lib", "contracts", "deployments.json");

function promptSecret(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    // Turn off terminal echo
    process.stdin.on("data", () => {
      // Clear the line and reprint the prompt
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(query);
    });

    rl.question(query, (value) => {
      rl.close();
      process.stdout.write("\n");
      resolve(value);
    });

    // Disable echo by setting raw mode
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
  });
}

/*async function loadDeployerKey() {
  const keystoreJson = fs.readFileSync("/home/bglobal/snap/geth/477/.ethereum/keystore/UTC--2025-12-16T03-48-44.906286143Z--b84753ff376d8347f27ea669ad36f7e79f0c364e", "utf8");
  const password = await promptSecret("Password: ");
  const wallet = await Wallet.fromEncryptedJson(keystoreJson, password);
  return wallet.privateKey;
}*/

function loadDeployments(): DeployedContracts {
  let deployments: DeployedContracts = {};
  if (fs.existsSync(deploymentsPath)) {
    deployments = { ...deployments, ...JSON.parse(fs.readFileSync(deploymentsPath, "utf8")) };
  }
  if (fs.existsSync(deploymentsPathE)) {
    deployments = { ...deployments, ...JSON.parse(fs.readFileSync(deploymentsPathE, "utf8")) };
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
  fs.writeFileSync(deploymentsPathE, JSON.stringify(registry, null, 2));
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
  const hre = (await import("hardhat")).default as any;
  const { ethers, upgrades } = hre;
  const factory = await ethers.getContractFactory(name);

  if (registry[name]) {
    console.log(` Upgrading ${name} at ${registry[name]}`);
    const upgraded = await upgrades.upgradeProxy(registry[name], factory);
    await upgraded.waitForDeployment();
    const address = await upgraded.getAddress();
    saveDeployment(name, address, registry); // Optional: re-save to confirm
    return address;
  } else {
    console.log(` Deploying new proxy for ${name}...`);
    const proxy = await upgrades.deployProxy(factory, args, {
      kind: "uups",
      initializer,
      timeout: 600000,
      pollingInterval: 15000,
      txOverrides: {
        gasPrice: 20000,
        gasLimit: 8000000,
      },
    });
    console.log(` Proxy deployment transaction sent for ${name}`);
    await proxy.waitForDeployment();
    console.log(` Proxy deployed for ${name}`);
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
  const hre = (await import("hardhat")).default as any;
  const { ethers, upgrades } = hre;
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  saveDeployment(name, address, registry);
  return address;
}

// Main Deployment Flow
async function main() {
  /*const pk = await loadDeployerKey();
  process.env.DEPLOYER_KEY = pk;
  console.log("DEBUG PK:", process.env.DEPLOYER_KEY);*/
  const hre = (await import("hardhat")).default as any;
  const { ethers, upgrades } = hre;
  const [deployer] = await ethers.getSigners();
  console.log(` Deploying contracts with signer: ${deployer.address}\n`);

  const deployed = loadDeployments();

  // Create array of contract names based on your digits pattern
  const contractNames: string[] = [];
  for (let middle = 2; middle <= 8; middle++) {
    let maxDigit = (middle * 3) + 24;
    for (let fl = 1; fl <= maxDigit; fl++) {
      contractNames.push(`Dividend${fl}${middle}${fl}`);
    }
  }

  const preaddr = [
    //process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS!,
    process.env.NEXT_PUBLIC_SMARTVAULT!,
    process.env.NEXT_PUBLIC_REGIONINFRA!,
    process.env.NEXT_PUBLIC_ASSETPURCHASE!,
    process.env.NEXT_PUBLIC_XCHANGE!,
    process.env.NEXT_PUBLIC_ACQUIRE!,
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

  const gbdAddress = await deployProxy("GlobalDollar", deployed, [
    deployer.address,
    preaddr,
    prefnd,
  ]);

  const gbd = await ethers.getContractAt("GlobalDollar", gbdAddress);

  // Token Infrastructure
  const copxAddress = await deployProxy("Copian", deployed, [
    deployer.address,
    preaddr,
    prefnd,
  ]);
  const copx = await ethers.getContractAt("Copian", copxAddress);

  const stablecoinAddresses = [
    "0x0000000000000000000000000000000000000000", //GBDo      0
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC     1  
    "0x4A16BAf414b8e637Ed12019faD5Dd705735DB2e0", // QCAD     2
    "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI      3
    "0xe0b52e49357fd4daf2c15e02058dce6bc0057db4", // agEUR    4
    "0x7d60F21072b585351dFd5E8b17109458D97ec120", // FDUSD    5
    "0x853d955aCEf822Db058eb8505911ED77F175b99e", // FRAX     6
    "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB", // JPYC     7
    "0x95C2E7cbc7Ae370E28160Bd04297C53F96d092B4", // MMXN     8
    "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", // PYUSD    9
    "0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96", // XSGD     10
    "0x0000000000085d4780B73119b644AE5ecd22b376", // TUSD     11
    "0x8E870D67F660D95d5be530380D0eC0bd388289E1", // USDP     12
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT     13
    "0x4cCe605eD955295432958d8951D0B176C10720d5", // AUDD     14
    "0xb755506531786C8aC63B756BaB1ac387bACB0C04", // ZARP     15
    "0x8c6fa66c21ae3fc435790e451946a9ea82e6e523", // BRZ      16
    "0x86B4dBE5D203e634a12364C0e428fa242A3FbA98", // GBPT     17
    "0x6FAff971d9248e7d398A98FdBE6a81F6d7489568", // TRYX     18
    "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c", // EURc     19
    copxAddress,                                  // COPx     21
    gbdAddress                                    // GBDO     22
    //"0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC     23
    //"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH     24
    //"0xB8c77482e45F1F44dE1745F52C74426C631bDD52", // BNB      25
    //"0x00000000000000000000000000000000000000b0", //BTC       26
    //"0x00000000000000000000000000000000000000E0", //ETH       27
    //"0x00006100F7090010005F1bd7aE6122c3C2CF0090", // AUDT
    //"0x05BBeD16620B352A7F889E23E3Cf427D1D379FFE", // NGNT
    //"0xc71daC923823D748a86D0A3618ABdA2d6dCd6bf4", // INRX
  ]
  
  const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

  const adminAddresses = [
    deployer.address,
    "0xb84753ff376d8347f27ea669ad36f7e79f0c364e"
  ]

  //console.log("adminAddresses:", adminAddresses);
  
  const GlobalLedger = await deployProxy("GlobalLedger", deployed, [
    deployer.address,
  ]);

  const GlobalShield = await deployProxy("GlobalShield", deployed, [
    deployer.address,
  ]);

    // Deploy Counter implementation (non-upgradeable)
  const GlobalSwap = await deployContract("GlobalSwap", deployed, []);
  console.log(`GlobalSwap implementation deployed at: ${GlobalSwap}`);

  // Deploy CounterFactory with the Counter implementation address
  const GlobalSwapFactoryAddress = await deployContract("GlobalSwapFactory", deployed, []);
  console.log(`GlobalSwapFactory deployed at: ${GlobalSwapFactoryAddress}`);

  const GlobalSwapFactory = await ethers.getContractAt("GlobalSwapFactory", GlobalSwapFactoryAddress);
  await GlobalSwapFactory.initialize(deployer.address);

  const GlobalSwapRegistry = await deployProxy("GlobalSwapRegistry", deployed, [
    deployer.address,
  ]);

  const AssetPurchase = await deployProxy("AssetPurchase", deployed, [
    deployer.address,
    GlobalLedger
  ]);

  const AcquisitionGateway = await deployProxy("AcquisitionGateway", deployed, [
    deployer.address,
    GlobalLedger,
  ]);

  const now = Math.floor(Date.now() / 1000);

  const SmartVault = await deployProxy("SmartVault", deployed, [
    deployer.address,
    usdc,
    GlobalLedger,
  ]);

  const RegionInfrastructure = await deployProxy("RegionInfrastructure", deployed, [
    deployer.address,
    usdc,
    GlobalLedger,
  ]);

  const stakeablecoinAddresses: string[] = [];

  // Deploy each Dividend contract and collect address
  for (const name of contractNames) {
    const args = [deployer.address, SmartVault]; // Customize args here if needed
    const address = await deployProxy(name, deployed, args);
    stakeablecoinAddresses.push(address);
  }

  console.log("Stakeablecoin addresses to be passed to SmartVault:");
  for (const [index, addr] of stakeablecoinAddresses.entries()) {
    console.log(`Index ${index}: Address ${addr}`);

    const code = await ethers.provider.getCode(addr);
    if (code === "0x") {
      console.warn(`Warning: No contract code at address ${addr} (index ${index})`);
    }
  }

  const GBDt = await deployProxy("GlobalDollarT", deployed, [
    deployer.address,
    SmartVault
  ]);

  const GLOBE = await deployProxy("Globe", deployed, [
    deployer.address,
    RegionInfrastructure
  ]);

  const TGUSA = await deployProxy("TGUsRenewable", deployed, [
    deployer.address,
    RegionInfrastructure
  ]);

  const TGMX = await deployProxy("TGMxRenewable", deployed, [
    deployer.address,
    RegionInfrastructure
  ]);

  const BGFFS = await deployProxy("BGSellRE", deployed, [
    deployer.address,
    RegionInfrastructure
  ]);

  const BGFRS = await deployProxy("BGHoldRE", deployed, [
    deployer.address,
    RegionInfrastructure
  ]);

  const BGGRID = await deployProxy("BGGrid", deployed, [
    deployer.address,
    RegionInfrastructure
  ]);

  const ventureAddresses = [
    GLOBE,
    TGUSA,
    TGMX,
    BGFFS,
    BGFRS,
    BGGRID
  ]

  const contractAddresses = [
    AcquisitionGateway,
    AssetPurchase,
    SmartVault,
    RegionInfrastructure
  ]

  const contract2 = new ethers.Contract(GlobalLedger, ledgerAbi.abi, deployer);
  const contractv = new ethers.Contract(SmartVault, vaultAbi.abi, deployer);
  const contractr = new ethers.Contract(RegionInfrastructure, regionAbi.abi, deployer);
  const contractp = new ethers.Contract(AssetPurchase, purchaseAbi.abi, deployer);
  const contracta = new ethers.Contract(AcquisitionGateway, acquisitionAbi.abi, deployer);
  const contractg = new ethers.Contract(GlobalSwapRegistry, swapregistryAbi.abi, deployer);
  const contractShield = new ethers.Contract(GlobalShield, shieldAbi.abi, deployer);


  // ------
  //  ADDRESS UPDATING
  // -----

  console.log("Attempting to Update Ledger Addresses");

  // -- Ledger Address Load --- //
  const stcadd = await contract2.addToVentureWhitelist!(stablecoinAddresses);

  const vadd = await contract2.addToVentureWhitelist!(ventureAddresses);

  const stkadd = await contract2.addToStakeableWhitelist!(stakeablecoinAddresses);

  const ctradd = await contract2.addToContractWhitelist!(contractAddresses);

  const adnladd = await contract2.addToContractWhitelist!(adminAddresses);

  console.log("Attempting to Update Vault Addresses");

  // -- Vault Address Load --- //
  const stcvadd = await contractv.addToStableWhitelist!(stablecoinAddresses);

  const stkvadd = await contractv.addToStakeableWhitelist!(stakeablecoinAddresses);

  const adnadd = await contractv.addToAdminWhitelist!(adminAddresses);

  console.log("Attempting to Update Region Addresses");

  // -- Region Address Load --- //
  const stcradd = await contractr.addToStableWhitelist!(stablecoinAddresses);

  const vradd = await contractr.addToStakeableWhitelist!(ventureAddresses);

  const admnradd = await contractr.addToAdminWhitelist!(adminAddresses);

  console.log("Attempting to Update Purchase Addresses");

  // -- Acquisition Address Load --- //
  const stcpadd = await contractp.addToStableWhitelist!(stablecoinAddresses);

  const admnpadd = await contractp.addToAdminWhitelist!(adminAddresses);

  console.log("Attempting to Update Acqisition Addresses");

  // -- Purchase Address Load --- //
  const stcaadd = await contracta.addToStableWhitelist!(stablecoinAddresses);

  const admnaadd = await contracta.addToAdminWhitelist!(adminAddresses);

  console.log("Attempting to Update Registry Addresses");
  const admngadd = await contractg.addToAdminWhitelist!(adminAddresses);

  console.log("Attempting to Update Shield Addresses");
  const admnsadd = await contractShield.addToAdminWhitelist!(adminAddresses);

  // --- Address Removal Logic --- //
  //const v = await contract2.removeFromVentureWhitelist!(ventureAddresses);

  //const stk = await contract2.removeFromStakeableWhitelist!(stakeablecoinAddresses);

  /*console.log("Attempting to Update Dates");

  const sIndex1 = 0;
  const eIndex1 = 68;
  const sIndex2 = 68;  //to match index guard
  const eIndex2 = 136;
  const sIndex3 = 136; //to match index guard
  const eIndex3 = 204; //to match index guard
  const sIndex4 = 204; //to match index guard
  const eIndex4 = 273; //to match index guard

  const txQuarterInit1 = await contractv.initCalldates!(now, sIndex1, eIndex1, { gasLimit: 20_000_000n });
  await txQuarterInit1.wait();

  const txQuarterInit2 = await contractv.initCalldates!(now, sIndex2, eIndex2, { gasLimit: 20_000_000n });
  await txQuarterInit2.wait();

  const txQuarterInit3 = await contractv.initCalldates!(now, sIndex3, eIndex3, { gasLimit: 20_000_000n });
  await txQuarterInit3.wait();

  const txQuarterInit4 = await contractv.initCalldates!(now, sIndex4, eIndex4, { gasLimit: 20_000_000n });
  await txQuarterInit4.wait();

  console.log("Attempting to Update Globals");

  // --- Populate Values ---
  const txPop = await contractv.populateGlobals!({ gasLimit: 8_000_000n });
  await txPop.wait();

  console.log("Attempting to check Unlock Quarter by Contract");

  for (const token of stakeablecoinAddresses) {
    const contract2 = new ethers.Contract(token, gbdoxxAbi.abi, deployer);
    const balance = await contract2.unlockQuarter!();
    console.log(`Unlock Quarter for ${token}: ${balance}`);
  }

  console.log("Attempting to check Multiplier by Contract");

  for (const token of stakeablecoinAddresses) {
    const balance = await contractv.multiplier!(token);
    console.log(`Multiplier ${token}: ${balance}`);
  }*/

  console.log("Attempting to set Factory Address");

  const factoryInit = await contractg.setFactory!(GlobalSwapFactoryAddress, { gasLimit: 200_000n });
  await factoryInit.wait();

  const shieldInit = await contractg.setShield!(GlobalShield, { gasLimit: 200_000n });
  await shieldInit.wait();

  // ABI Generation
  const generateTsAbis = await import("./generateTsAbis").then((m) => m.default);
  await generateTsAbis(hre);
  console.log(" TypeScript ABIs generated.");

  process.exit(1)
}


main().catch((err) => {
  console.error(" Deployment failed:", err);
  process.exit(1);
});
