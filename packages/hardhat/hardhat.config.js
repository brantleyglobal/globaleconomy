require("dotenv").config();
require("@openzeppelin/hardhat-upgrades");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("@typechain/hardhat");
require("hardhat-contract-sizer");

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
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
  defaultNetwork: "GLOBALCHAIN",
  networks: {
    hardhat: {},
    GLOBALCHAIN: {
      url: process.env.CUSTOM_RPC || "http://192.168.32.128:8545",
      chainId: 38391207
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
