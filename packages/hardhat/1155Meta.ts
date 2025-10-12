import fs from "fs";
import path from "path";
import { Web3Storage, File } from "web3.storage";
import dotenv from "dotenv";
dotenv.config();

const WEB3_STORAGE_TOKEN = process.env.WEB3_STORAGE_TOKEN!;
const outputDir = path.join(process.cwd(), "metadata");

const client = new Web3Storage({ token: WEB3_STORAGE_TOKEN });

// Sample tokens metadata
const tokens = [
  {
    id: 1,
    name: "Global Dominion",
    description: "Dividend Backed Termed Token",
    image: "https://brantley-global.com/global.png",
    attributes: [
      { trait_type: "Rarity", value: "Rare" },
      { trait_type: "Power", value: 100 },
    ],
  },
  {
    id: 2,
    name: "Copian",
    description: "Project Backed Termed Token",
    image: "https://brantley-global.com/COPx.png",
    attributes: [
      { trait_type: "Rarity", value: "Common" },
      { trait_type: "Power", value: 10 },
    ],
  },
];

// Write metadata files locally
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

async function main() {
  // Create File objects for each metadata JSON
  const files: File[] = tokens.map(token => {
    const jsonContent = JSON.stringify({
      name: token.name,
      description: token.description,
      image: token.image,
      attributes: token.attributes,
    }, null, 2);

    return new File([jsonContent], `${token.id}.json`, { type: "application/json" });
  });

  // Upload files to web3.storage - this returns the root CID
  const cid = await client.put(files);
  console.log("Stored files with CID:", cid);

  console.log(`Access your token metadata at https://ipfs.io/ipfs/${cid}/{id}.json`);
}

main().catch(console.error);
