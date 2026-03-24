// run-deploy.ts
import fs from "fs";
import { Wallet } from "ethers";
import { promptSecret } from "./promptSecret";

async function main() {
  const keystoreJson = fs.readFileSync(
    "/home/bglobal/snap/geth/477/.ethereum/keystore/UTC--2025-12-16T03-48-44.906286143Z--b84753ff376d8347f27ea669ad36f7e79f0c364e",
    "utf8"
  );

  const password = await promptSecret("Password: ");
  const wallet = await Wallet.fromEncryptedJson(keystoreJson, password);

  process.env.DEPLOYER_KEY = wallet.privateKey;

  const hre = await import("hardhat");

  // Now start Hardhat AFTER the key is loaded
  //await hre.run("run", { script: "scripts/deploy.ts" });
  await import("./deploy-inner");
}

main();