// lib/loadDeployments.ts
import fs from "fs";
import path from "path";

export function loadDeployments(): Record<string, string> {
  const filePath = path.join(process.cwd(), "hardhat", "deployments.json");
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (err) {
    console.warn("Could not read deployments.json:", err);
  }
  return {};
}
