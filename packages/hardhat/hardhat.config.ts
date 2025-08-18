import * as dotenv from "dotenv";
import "@openzeppelin/hardhat-upgrades";
dotenv.config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "@typechain/hardhat";


import * as fs from "fs";
import { Wallet } from "ethers";
import { task } from "hardhat/config";

// === Load and decrypt the keystore file ===
const keystorePath = "./keystore/deployer.json"; // Geth UTC file
const passwordPath = ".secret";

let deployerPrivateKey = "";
let deployerAddress = process.env.DEPLOYER_ADDRESS;

try {
  const keystoreJson = fs.readFileSync(keystorePath, "utf-8");
  const password = fs.readFileSync(passwordPath, "utf-8").trim();
  const wallet = Wallet.fromEncryptedJsonSync(keystoreJson, password);
  deployerPrivateKey = wallet.privateKey;

  // Fallback to the address from keystore if not provided in .env
  if (!deployerAddress) {
    deployerAddress = wallet.address;
  }
} catch (error) {
  throw new Error("Failed to decrypt keystore file. Please check your path and .secret password.");
}

// === Network + Tooling Config ===
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  defaultNetwork: "GLOBALCHAIN",
  namedAccounts: {
    deployer: {
      default: deployerAddress!,
    },
  },
  networks: {
    hardhat: {},
    GLOBALCHAIN: {
      url: process.env.CUSTOM_RPC || "http://192.168.32.128:8545",
      accounts: [deployerPrivateKey],
      chainId: 3503995874081207,
    },
  },
};

// === Post-deploy ABI generator task ===
/*task("deploy").setAction(async (args, hre, runSuper) => {
  await runSuper(args);
  await generateTsAbis(hre);
});*/

export default config;
