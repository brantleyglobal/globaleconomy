"use client";

import { useEffect, useState } from "react";
import {
  Address as AddressType,
  createWalletClient,
  getContract,
  http,
  parseUnits,
} from "viem";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import {
  Address,
  AddressInput,
  EtherInput,
} from "~~/components/globalDEX";
import { useTransactor } from "~~/hooks/globalDEX";
import { notification } from "~~/utils/globalDEX";
import { supportedTokens, Token } from "~~/components/constants/tokens";
import { erc20Abi } from "viem";
import { TransferSummary } from "~~/components/globalDEX/transferSummary";


const localWalletClient = createWalletClient({
  chain: hardhat,
  transport: http(),
});

export const Faucet = () => {
  const [loading, setLoading] = useState(false);
  const [inputAddress, setInputAddress] = useState<AddressType>();
  const [fromAddress, setFromAddress] = useState<AddressType>();
  const [sendValue, setSendValue] = useState("");
  const [selectedTokenSymbol, setSelectedTokenSymbol] =
    useState<Token["symbol"]>(supportedTokens[0].symbol);
  const [available, setAvailable] = useState<bigint>(0n);

  const selectedToken = supportedTokens.find(
    t => t.symbol === selectedTokenSymbol
  )!;

  const { chain } = useAccount();
  const faucetTxn = useTransactor(localWalletClient);

  useEffect(() => {
    localWalletClient
      .getAddresses()
      .then(([addr]) => setFromAddress(addr))
      .catch(err => {
        notification.error("Cannot connect to local node");
        console.error(err);
      });
  }, []);

  useEffect(() => {
    if (!fromAddress) return;

    const fetchBalance = async () => {
      try {
        const contract = getContract({
          address: selectedToken.address,
          abi: erc20Abi,
          client: localWalletClient,
        });
        const balance = await contract.read.balanceOf([fromAddress]);
        setAvailable(balance);
      } catch (err) {
        console.error("Error fetching token balance:", err);
        setAvailable(0n);
      }
    };

    fetchBalance();
  }, [fromAddress, selectedToken]);

  const send = async () => {
    if (!fromAddress || !inputAddress || !sendValue) return;

    try {
      const amount = parseUnits(sendValue, selectedToken.decimals);
      if (amount > available) {
        notification.error("Insufficient balance.");
        return;
      }

      setLoading(true);

      const tokenContract = getContract({
        address: selectedToken.address,
        abi: erc20Abi,
        client: localWalletClient,
      });

      await tokenContract.write.transfer([inputAddress, amount], {
        account: fromAddress,
      });

      setInputAddress(undefined);
      setSendValue("");
    } catch (e) {
      notification.error("Transfer failed");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (chain?.id !== hardhat.id) return null;

  return (
    <div>
      <label
        htmlFor="faucet-modal"
        className="btn btn-primary btn-sm font-normal gap-1"
      >
        <BanknotesIcon className="h-4 w-4" />
        Transfer
      </label>
      <input type="checkbox" id="faucet-modal" className="modal-toggle" />
      <label htmlFor="faucet-modal" className="modal cursor-pointer">
        <label className="modal-box relative">
          <input className="h-0 w-0 absolute top-0 left-0" />
          <h3 className="text-xl font-bold mb-3">Token Transfer</h3>
          <label
            htmlFor="faucet-modal"
            className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
          >
            ✕
          </label>

          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-sm font-bold">Stablecoin:</span>
              <select
                className="select select-bordered w-full"
                value={selectedToken.symbol}
                onChange={(e) =>
                  setSelectedTokenSymbol(e.target.value as Token["symbol"])
                }
              >
                {supportedTokens.map(t => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.symbol} — {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between">
              <div>
                <span className="text-sm font-bold">From:</span>{" "}
                <Address address={fromAddress} onlyEnsOrAddress />
              </div>
              <div>
                <span className="text-sm font-bold">Available:</span>{" "}
                {(Number(available) / 10 ** selectedToken.decimals).toFixed(4)}{" "}
                {selectedToken.symbol}
              </div>
            </div>

            <AddressInput
              placeholder="Recipient address"
              value={inputAddress ?? ""}
              onChange={(v) => setInputAddress(v as AddressType)}
            />

            <EtherInput
              placeholder={`Amount of ${selectedToken.symbol}`}
              value={sendValue}
              onChange={setSendValue}
            />
            <div className="space-y-4">
              {/* ...Token selector, balance, inputs... */}

              <TransferSummary
                from={fromAddress as `0x${string}`}
                to={inputAddress as `0x${string}`}
                token={selectedToken}
                amount={sendValue}
              />
              <div className="flex justify-end">
                <button
                  className="btn btn-primary btn-sm flex gap-2"
                  onClick={send}
                  disabled={loading || !inputAddress || !sendValue}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <BanknotesIcon className="h-5 w-5" />
                  )}
                  Send
                </button>
              </div>
            </div>
          </div>
        </label>
      </label>
    </div>
  );
};
