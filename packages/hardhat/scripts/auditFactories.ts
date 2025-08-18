import fs from "fs";
import path from "path";

const contractsDir = path.join(__dirname, "..", "artifacts", "contracts");

function findArtifactPaths(dir: string): string[] {
  let paths: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      paths = paths.concat(findArtifactPaths(fullPath));
    } else if (entry.endsWith(".json")) {
      paths.push(fullPath);
    }
  }
  return paths;
}

console.log("📊 Bytecode Size & Linkage Audit:\n");

const artifactPaths = findArtifactPaths(contractsDir);
for (const artifactPath of artifactPaths) {
  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const deployedBytecode = artifact.deployedBytecode;
    if (!deployedBytecode || deployedBytecode.length < 4) continue;

    const sizeBytes = (deployedBytecode.length - 2) / 2;
    const sizeKiB = (sizeBytes / 1024).toFixed(2);
    const name = artifact.contractName || path.basename(artifactPath).replace(".json", "");
    const prefix = name.toLowerCase().includes("lib") ? "📚" : "📦";
    const alert = sizeBytes >= 24576 ? " ⚠️ OVER LIMIT" : "";

    const linkRefs = artifact.linkReferences || {};
    const linkedLibs = Object.entries(linkRefs).flatMap(([filePath, libs]) =>
      Object.keys(libs).map((lib) => `${filePath.split("/").pop()}:${lib}`)
    );

    const linkingInfo = linkedLibs.length > 0
      ? `🔗 Needs linking: ${linkedLibs.join(", ")}`
      : "";

    console.log(`${prefix} ${name}: ${sizeKiB} KiB${alert}`);
    if (linkingInfo) console.log(`    ${linkingInfo}`);
  } catch {
    console.warn(`⚠️ Failed to parse ${artifactPath}`);
  }
}
