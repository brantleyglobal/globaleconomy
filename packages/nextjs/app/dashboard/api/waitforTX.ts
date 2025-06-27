import type { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains"; // Replace with your custom chain config

const client = createPublicClient({
  chain: mainnet, // or your custom chain object
  transport: http("http://localhost:8545"), // replace with your RPC endpoint
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { hash } = req.query;

  if (!hash || typeof hash !== "string") {
    return res.status(400).json({ error: "Transaction hash is required" });
  }

  try {
    const receipt = await client.waitForTransactionReceipt({ hash: hash as `0x${string}` });
    res.status(200).json(receipt);
  } catch (err) {
    console.error("Failed to fetch transaction receipt:", err);
    res.status(500).json({ error: "Transaction receipt not found or failed" });
  }
}
