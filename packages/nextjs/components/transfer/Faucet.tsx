"use client";

import { useEffect, useState } from "react";
import { Address as AddressType, getContract } from "viem";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import {
  Address,
  AddressInput,
  EtherInput,
  RainbowKitCustomConnectButton,
} from "~~/components/globalEco";
import { supportedTokens, Token } from "~~/components/constants/tokens";
import { erc20Abi } from "viem";
import { TransferSummary } from "~~/components/globalEco/transferSummary";
import { toast, Toaster } from "react-hot-toast";
import { useTransferHandler } from "~~/hooks/globalEco/useTransferHandler";

type FaucetProps = {
  openWalletModal?: () => void;
};

export const Faucet = ({ openWalletModal }: FaucetProps) => {
  const [recipient, setRecipient] = useState<AddressType>();
  const [amount, setAmount] = useState("");
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<Token["symbol"]>(
    supportedTokens[0].symbol
  );
  const [available, setAvailable] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  const selectedToken = supportedTokens.find(t => t.symbol === selectedTokenSymbol)!;
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = chain?.id;

  const { send } = useTransferHandler({
    sender: address,
    chainId,
    selectedToken,
    available,
    signature: "",
    openWalletModal,
    setRecipient,
    setSendValue: setAmount,
  });

  const handleSendClick = async () => {
    if (!recipient || !amount || !address) {
      toast.error("Missing required fields.");
      return;
    }

    setLoading(true);
    toast("Sending tokens...", { icon: "🚀" });

    try {
      const result = await send(recipient, amount);
      if (!result?.success) {
        toast.error(`Transfer failed: ${result?.error || "Unknown error"}`);
      } else {
        toast.success("Transfer successful!");
        toast(`Raw result: ${JSON.stringify(result)}`);
      }
    } catch (error: any) {
      toast.error(`Transfer failed: ${error?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchBalance = async () => {
      if (!walletClient || !address || !chainId || !selectedToken) return;

      try {
        const balance = selectedToken.isNative
          ? await publicClient?.getBalance({ address })
          : await getContract({
              address: selectedToken.address as AddressType,
              abi: erc20Abi,
              client: walletClient,
            }).read.balanceOf([address]);

        if (balance !== undefined) setAvailable(balance);
      } catch {
        toast.error("Failed to fetch balance.");
        setAvailable(0n);
      }
    };

    fetchBalance();
  }, [walletClient, address, chainId, selectedToken, publicClient]);

  useEffect(() => {
    setLoading(!recipient || !amount || !address);
  }, [recipient, amount, address]);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-light text-center mb-6">TRANSFER</h3>
      {/*<Toaster toastOptions={{ style: { zIndex: 9999 } }} />*/}

      {/* Token Selector */}
      <div className="space-y-1">
        <span className="text-sm mb-2 font-light">CURRENCY:</span>
        <select
          className="select h-8 border-none outline-none w-full"
          value={selectedToken.symbol}
          onChange={e => setSelectedTokenSymbol(e.target.value as Token["symbol"])}
        >
          {supportedTokens.map(t => (
            <option key={t.symbol} value={t.symbol}>
              {t.symbol} — {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Address & Balance */}
      <div className="flex justify-between mt-2 mb-0">
        <div>
          <span className="text-sm font-light">FROM:</span>{" "}
          {isConnected && address ? (
            <Address address={address} onlyEnsOrAddress />
          ) : (
            <span className="text-sm text-warning ml-2">Please Connect Your Wallet</span>
          )}
        </div>
        <div>
          <span className="text-sm font-light">AVAILABLE:</span>{" "}
          <span className="text-base font-light">
            {(Number(available) / 10 ** (selectedToken.decimals ?? 18)).toFixed(2)}
          </span>{" "}
          <span className="text-xs text-gray-500">{selectedToken.symbol}</span>
        </div>
      </div>

      {/* Inputs */}
      <AddressInput
        placeholder="Recipient address"
        value={recipient ?? ""}
        onChange={v => setRecipient(v as AddressType)}
      />
      <EtherInput
        placeholder={`Amount of ${selectedToken.symbol}`}
        value={amount}
        onChange={setAmount}
      />

      {/* Summary */}
      <TransferSummary
        from={address as `0x${string}`}
        to={recipient as `0x${string}`}
        token={selectedToken}
        amount={amount}
      />

      {/* Action Row */}
      <div className="flex justify-between gap-4 mt-10 pt-4 border-t w-full">
        <div className="flex-grow flex justify-start">
          <RainbowKitCustomConnectButton />
          {!address && (
            <span className="text-red-500 text-xs mt-2 p-2 block">Wallet Required</span>
          )}
        </div>

        <div className="flex-grow flex justify-end">
          <button
            className="btn btn-primary/10 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6"
            onClick={handleSendClick}
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <BanknotesIcon className="h-4 w-4 shrink-0" />
            )}
            TRANSFER
          </button>
        </div>
      </div>
    </div>
  );
};
