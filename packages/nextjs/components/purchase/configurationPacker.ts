import { ethers } from "ethers";

interface PackConfigInput {
  selectedVariations: Record<string, { label: string }>;
  selectedVoltage: number;
  selectedFrequency: "50Hz" | "60Hz" | null;
  selectedPhase: "Single-Phase" | "Split-Phase" | "3-Phase" | null;
  selectedReactor: "Default (None)" | "Line Reactor(s)" | null;
}

export function buildCompactConfigBytes32({
  selectedVariations,
  selectedVoltage,
  selectedFrequency,
  selectedPhase,
  selectedReactor,
}: PackConfigInput): string {
  const configParts: string[] = [];

  // Determine if we are processing E-Series or X-Series based on keys present
  const isEseries = "epanel" in selectedVariations;
  const panelKey = isEseries ? "epanel" : "xpanel";
  const tieKey = isEseries ? "etie" : "xtie";
  const prefix = isEseries ? "E" : "X";

  // 1. COMPRESS PANEL (with nested custom values if selected)
  const panelSelection = selectedVariations[panelKey]?.label;
  if (panelSelection) {
    if (panelSelection === "Customize") {
      const v = selectedVoltage ? `${selectedVoltage}V` : "120V";
      const f = selectedFrequency ? selectedFrequency.replace("Hz", "H") : "60H";
      
      // Shorten Phase syntax to absolute minimum characters
      let p = "3PH";
      if (selectedPhase) {
        if (selectedPhase.includes("Single")) p = "1PH";
        if (selectedPhase.includes("Split")) p = "SPLT";
      }

      // Append Line Reactor tracking for custom X-Series panels
      const hasReactor = !isEseries && selectedReactor === "Line Reactor(s)";
      const reactorTag = hasReactor ? "/LR" : "";

      configParts.push(`${prefix}-CST(${v}/${f}/${p}${reactorTag})`);
    } else {
      configParts.push(`${prefix}-STD`); // "120v Split Phase @60Hz" or "480v 3 Phase @60Hz"
    }
  }

  // 2. COMPRESS GRID TIE SYSTEM
  const tieSelection = selectedVariations[tieKey]?.label;
  if (tieSelection) {
    if (tieSelection.includes("Stand Alone")) {
      configParts.push("SA");
    } else {
      // RegEx strips out the amp numbers cleanly (e.g., "Grid Tie (1260amp Rating)" -> "GT1260")
      const ampMatch = tieSelection.match(/\d+/);
      configParts.push(`GT${ampMatch ? ampMatch[0] : ""}`);
    }
  }

  // 3. COMPRESS MONITORING
  const monitoringSelection = selectedVariations["monitoring"]?.label;
  if (monitoringSelection) {
    configParts.push(monitoringSelection === "Monitoring" ? "M" : "NM");
  }

  // Combine into a clean, slashed token string
  const compactString = configParts.join("/");

  // Safety Boundary Check
  if (compactString.length > 31) {
    throw new Error(`Critical Optimization Error: String "${compactString}" exceeds 31 bytes.`);
  }

  // Convert to fixed bytes32 hex representation for your smart contract call
  return ethers.encodeBytes32String(compactString);
}