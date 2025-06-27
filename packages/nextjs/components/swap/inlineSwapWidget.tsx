"use client";

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount, useWalletClient } from "wagmi";
import { getContracts } from "~~/lib/assetPurchaseContracts";
import { supportedTokens } from "~~/components/constants/tokens";
import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";

const InlineSwapWidget = () => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"toGBD" | "toStable">("toGBD");
  const [selectedToken, setSelectedToken] = useState(supportedTokens[1]); // Default to first stablecoin (e.g. USDC)
  const [balance, setBalance] = useState("0.0");

  useEffect(() => {
    const fetchBalance = async () => {
      if (!walletClient || !address) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const token = direction === "toGBD"
        ? new ethers.Contract(selectedToken.address, ERC20_ABI.abi, provider)
        : (await getContracts(signer)).wgbd;

      const decimals = direction === "toGBD" ? selectedToken.decimals : await token.decimals();
      const rawBalance = await token.balanceOf(address);
      setBalance(ethers.formatUnits(rawBalance, decimals));
    };

    fetchBalance();
  }, [walletClient, direction, address, selectedToken]);

  const handleSwap = async () => {
    try {
      if (!walletClient || !address) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const { gateway, wgbd } = getContracts(signer);

      const decimals = selectedToken.decimals;
      const value = ethers.parseUnits(amount, decimals);

      if (direction === "toGBD") {
        const stablecoin = new ethers.Contract(selectedToken.address, ERC20_ABI.abi, signer);
        await (await stablecoin.approve(gateway.target, value)).wait();
        await (await gateway.swapStableForGBD(selectedToken.address, value)).wait();
      } else {
        const wgbdBal = await wgbd.balanceOf(address);
        const nativeBal = await provider.getBalance(address);

        if (wgbdBal < value && nativeBal >= value) {
          await (await wgbd.deposit({ value })).wait();
        }

        await (await wgbd.approve(gateway.target, value)).wait();
        await (await gateway.swapGBDForStable(selectedToken.address, value)).wait();
      }

      alert("Swap complete!");
    } catch (err) {
      console.error(err);
      alert("Swap failed");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Currency Swap</h2>

      <label className="w-full text-left text-sm mb-1">Select Stablecoin</label>
      <select
        className="select select-bordered w-full mb-2"
        value={selectedToken.symbol}
        onChange={e =>
          setSelectedToken(
            supportedTokens.find(t => t.symbol === e.target.value) || supportedTokens[1]
          )
        }
      >
        {supportedTokens
          .filter(token => token.symbol !== "GBD")
          .map(token => (
            <option key={token.symbol} value={token.symbol}>
              {token.name} ({token.symbol})
            </option>
          ))}
      </select>

      <label className="w-full text-left text-sm mb-1">Amount</label>
      <input
        type="number"
        min={0}
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="input input-bordered w-full"
        placeholder="0.0"
      />

      <p className="text-sm text-gray-400 mt-2">
        Balance: {parseFloat(balance).toFixed(4)}
      </p>

      <div className="flex justify-between gap-2 mt-4 w-full">
        <button
          className={`btn btn-outline ${direction === "toGBD" ? "btn-primary" : ""}`}
          onClick={() => setDirection("toGBD")}
        >
          To GBD
        </button>
        <button
          className={`btn btn-outline ${direction === "toStable" ? "btn-primary" : ""}`}
          onClick={() => setDirection("toStable")}
        >
          To Stable
        </button>
      </div>

      <button
        className="btn btn-success mt-6 w-full"
        onClick={handleSwap}
        disabled={!amount || parseFloat(amount) <= 0}
      >
        {isConnected ? (direction === "toGBD" ? "Swap to GBD" : "Swap to Stable") : "CONNECT WALLET"}
      </button>
    </div>
  );
};

export default InlineSwapWidget;
