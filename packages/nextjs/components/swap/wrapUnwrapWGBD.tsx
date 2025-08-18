"use client";

import { useState } from "react";
import { ethers } from "ethers";
import  abi from "~~/../hardhat/artifacts/contracts/WGBD.sol/WGBD.json";


export default function WrapUnwrapWGBD({ wgbdAddress }: { wgbdAddress: string }) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"wrap" | "unwrap">("wrap");
  

  async function handleAction() {
    if (!window.ethereum || !amount) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const wgbd = new ethers.Contract(wgbdAddress, abi.abi, signer);
    const value = ethers.parseEther(amount);

    try {
      if (mode === "wrap") {
        const tx = await wgbd.deposit({ value });
        await tx.wait();
        alert("Successfully wrapped GBD into WGBD");
      } else {
        const tx = await wgbd.withdraw(value);
        await tx.wait();
        alert("Successfully unwrapped WGBD into GBD");
      }
    } catch (err) {
      console.error(err);
      alert("Transaction failed");
    }
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <select value={mode} onChange={(e) => setMode(e.target.value as "wrap" | "unwrap")}>
        <option value="wrap">Wrap</option>
        <option value="unwrap">Unwrap</option>
      </select>
      <button onClick={handleAction}>
        {mode === "wrap" ? "Wrap GBD → WGBD" : "Unwrap WGBD → GBD"}
      </button>
    </div>
  );
}
