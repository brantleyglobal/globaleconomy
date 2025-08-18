const fs = require("fs");
const path = require("path");

function scanArtifacts(baseFolder, labelPrefix = "") {
  if (!fs.existsSync(baseFolder)) return;

  fs.readdirSync(baseFolder).forEach(contractFolder => {
    const folderPath = path.join(baseFolder, contractFolder);

    if (!fs.statSync(folderPath).isDirectory()) return;

    fs.readdirSync(folderPath).forEach(file => {
      if (!file.endsWith(".json")) return;
      const filePath = path.join(folderPath, file);

      try {
        const artifact = require(filePath);
        const bytecode = artifact.deployedBytecode;
        if (!bytecode || bytecode.length < 4) return;

        const sizeBytes = (bytecode.length - 2) / 2;
        const sizeKiB = (sizeBytes / 1024).toFixed(2);
        const name = artifact.contractName || file.replace(".json", "");

        const prefix = labelPrefix || (name.toLowerCase().includes("lib") ? "📚" : "📦");
        console.log(`${prefix} ${name}: ${sizeKiB} KiB`);
      } catch {
        // skip if there's any error reading artifact
      }
    });
  });
}

console.log("📊 Bytecode Size Audit:\n");

scanArtifacts(path.join(__dirname, "artifacts/contracts"), "📦");
scanArtifacts(path.join(__dirname, "artifacts/contracts/libraries"), "📚");
