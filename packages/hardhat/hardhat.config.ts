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
//import "hardhat-contract-sizer";

// === Network + Tooling Config ===
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      viaIR: true,
    },
  },
  /*contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },*/

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  defaultNetwork: "GLOBALCHAIN",
  networks: {
    hardhat: {},
    GLOBALCHAIN: {
      url: "http://10.100.100.20:8545",
      chainId: 38391207,
      //GETH//accounts: process.env.NEXT_PUBLIC_PRIVATE_KEY_M ? [process.env.NEXT_PUBLIC_PRIVATE_KEY_M] : [],
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
    },
  },
};

// === Post-deploy ABI generator task ===
/*task("deploy").setAction(async (args, hre, runSuper) => {
  await runSuper(args);
  await generateTsAbis(hre);
});*/

export default config;
