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

  /***Non Geth ***/

  /*const privateKey = process.env.DEPLOYER_KEY!;

  console.log("Using deployer key:", privateKey);

  process.env.NEXT_PUBLIC_PRIVATE_KEY_M = privateKey;*/

  // ✅ Import AFTER key is set
  await import("./deploy-inner");
}

main();