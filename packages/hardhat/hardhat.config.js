require("dotenv").config();
require("@openzeppelin/hardhat-upgrades");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("@typechain/hardhat");

const fs = require("fs");
const { Wallet } = require("ethers");

// Load deployer key from encrypted keystore
const keystorePath = "./keystore/deployer.json";
const passwordPath = ".secret";

let deployerPrivateKey = "";
let deployerAddress = process.env.DEPLOYER_ADDRESS;

try {
  const keystoreJson = fs.readFileSync(keystorePath, "utf-8");
  const password = fs.readFileSync(passwordPath, "utf-8").trim();
  const wallet = Wallet.fromEncryptedJsonSync(keystoreJson, password);
  deployerPrivateKey = wallet.privateKey;
  if (!deployerAddress) {
    deployerAddress = wallet.address;
  }
} catch (err) {
  throw new Error("Failed to load keystore or password. Check .secret and keystore JSON.");
}

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
      evmVersion: "cancun",
    },
  },
  defaultNetwork: "GLOBALCHAIN",
  networks: {
    hardhat: {},
    GLOBALCHAIN: {
      url: process.env.CUSTOM_RPC || "http://192.168.32.128:8545",
      accounts: [deployerPrivateKey],
      chainId: 3503995874081207
    }
  },
  namedAccounts: {
    deployer: {
      default: deployerAddress
    }
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6"
  }
};
