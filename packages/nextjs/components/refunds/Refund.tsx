"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Address as AddressType,
  createPublicClient,
  http,
} from "viem";
import { erc20Abi } from "viem";
import { useAccount } from "wagmi";
import { supportedTokens, dividendTokens } from "~~/components/constants/tokens";
import {
  BanknotesIcon,
  WalletIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  Address,
  AddressInput,
} from "~~/components/globalEco";
import { WalletConnectButton } from "~~/utils/globalEco/walletConnectButton";
import { toast } from "react-hot-toast";
import { useRefundHandler } from "~~/components/refunds/useRefundHandler";
import { sendRefundConfirmation } from "~~/components/email/sendRefundEmail";
import { getAddress } from "viem";
import deployments from "~~/lib/contracts/deployments.json";
import HelpStep from "~~/components/refunds/helpStep";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { mainnet, polygon } from "viem/chains";
import { GLOBALCHAIN } from '~~/utils/globalEco/customChains';
import { useRpcStatus } from "~~/hooks/globalEco/statusRpc";


const RPC_URLS = {
  global: process.env.NEXT_PUBLIC_DEX_RPC_URL || "",
  polygon: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "",
  ethereum: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || "",
};

/*const baseClient = createPublicClient({
  transport: http(RPC_URLS.ethereum),
});*/

// Define your address sets for chain detection
const myChainSupportedTokenAddresses = new Set<AddressType>([
  // Add your global chain token addresses here
]);

const polyAddresses = new Set<AddressType>([
  "0x5C067C80C00eCd2345b05E83A3e758eF799C40B5",
  "0x6AE7Dfc73E0dDE2aa99ac063DcF7e8A63265108c",
  "0xb755506531786c8ac63b756bab1ac387bacb0c04",
]);

function getChainConfig(token: { address: AddressType }) {
  if (myChainSupportedTokenAddresses.has(token.address)) {
    return GLOBALCHAIN;
  } else if (polyAddresses.has(token.address)) {
    return polygon;
  } else {
    return mainnet;
  }
}

function formatMoneyFromDigits(raw: string) {
  // Remove all non‑digits
  const digits = raw.replace(/\D/g, "");

  if (digits === "") return "";

  // Convert to number of cents
  const cents = Number(digits);

  // Convert to dollars with 2 decimals
  const value = (cents / 100).toFixed(2);
  const locale = navigator.language || "en-US";

  // Add commas
  return Number(value).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export const Refund = ({ openWalletModal }: { openWalletModal?: () => void }) => {
  const { address, isConnected, chain } = useAccount();

  const [step, setStep] = useState(0);
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isHelpMode, setIsHelpMode] = useState(false);
  const [savedStep, setSavedStep] = useState<ModalStep | null>(null);
  const [showStablecoinInfo, setShowStablecoinInfo] = useState(false);
  const rpcUp = useRpcStatus();
  const [data, setData] = useState("");

  console.log("RPC status:", rpcUp);

  const getNetwork = (symbol: string, address?: string): string => {
    if (symbol === "BTC") return "Bitcoin";

    if (address && address.startsWith("0x")) {
      // Ethereum-style address
      const polygonSymbols = ["ZARP", "BRL1", "JPYC"];
      if (polygonSymbols.includes(symbol)) {
        return "Polygon";
      }
      return "Ethereum";
    }

    return "Unknown";
  };

  const [walletTokens, setWalletTokens] = useState<
    (typeof supportedTokens[0] & { balance: bigint })[]
  >([]);
  const [receipt, setUserReceipt] = useState<string>("");
  const [contractAddress, setSelectedContractAddress] = useState<string>("");
  const [available, setAvailable] = useState<bigint | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txResult, setTxResult] = useState<any>(null);
  const [addressError, setAddressError] = useState("");
  const [showWalletNotice, setShowWalletNotice] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const validateHash = (value: string) => {

    //Normalize
    let v = value.trim().toLowerCase();
    if (v.length > 0 && !v.startsWith("0x")) {
      v = "0x" + v;
    }

    setUserReceipt(v);

    const ok = /^0x[a-f0-9]{64}$/.test(v);
    setIsValid(ok);

  };

  enum ModalStep {
    DetailStep = 0,
    DoneStep = 1,
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setUserEmail(email);
    if (email === "" || validateEmail(email)) {
      setEmailError("");
    } else {
      setEmailError("Please enter a valid email address");
    }
  };

  const { send } = useRefundHandler({
    sender: address,
    chainId: chain?.id,
    receipt,
    contractAddress,
    available,
    signature: "",
    openWalletModal
  });

  const handleSendClick = async () => {
    if (!address) {
      console.log("Missing required fields.");
      return;
    }
    if (emailError) {
      console.log("Invalid email address.");
      return;
    }
    setIsProcessing(true);
    try {
     
      const result = await send(receipt, contractAddress);
      setTxResult(result);

      if (!result?.success) {
        toast.error(`Refund request failed: ${result?.error || "Unknown error"}`);
        return;
      }

      await sendRefundConfirmation({
        templateType: "refund",
        userFirstName,
        userLastName,
        userEmail,
        connectedWallet: address,
        contractAddress: contractAddress,
        receipt: result.receipt2?.toString() || "",
      });
      toast.success("Investment confirmation email sent.");
      setStep(1);
    } catch (error: any) {
      toast.error(`Refund request failed: ${error?.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const stepLabels = ["Refund Details", "Done"];

  function toggleHelp() {
    if (!isHelpMode) {
      setSavedStep(step);  // Save current step into state
      setIsHelpMode(true);
    } else {
      setIsHelpMode(false);
      if (savedStep !== null) {
        setStep(savedStep); // Restore saved step from state
        setSavedStep(null); // Clear saved state
      }
    }
  }

  // Derive converted amount whenever depositAmount or exchangeRate changes
    useEffect(() => {
      if (!data) {
        setSelectedContractAddress("");
        return;
      }
  
      let cAddress: any;
      if (data === "AssetPurchase") {
        cAddress = deployments.AssetPurchase;
      }
  
      setSelectedContractAddress(
        cAddress
      );
      
    }, [data]);

  return (
    <div>
      <div className="overflow-x-auto whitespace-nowrap text-xs mt-2 px-2 p-4 scrollbar-hide">
        <div className="inline-flex gap-4">
          {stepLabels.map((label, index) => (
            <span
              key={label}
              className={`min-w-[80px] text-center block ${
                step === index ? "text-secondary/90 font-medium" : "text-gray-500"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
      {isHelpMode ? (
        <HelpStep id="help-step" onClose={toggleHelp} />
      ) : (
        <>
          {step === 0 && (
            <>
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-light text-primary">REFUND REQUEST</h2>
                  <button
                    onClick={toggleHelp}
                    aria-label="Toggle help"
                    className="text-primary hover:text-secondary flex items-center gap-1"
                  >
                    <HelpOutlineIcon />
                    
                  </button>
                </div>
                <select
                  className="select rounded-md bg-black w-full text-primary mt-2 outline-none hover:bg-secondary/5 border-none focus:ring-0 focus:outline-none"
                  value={data}
                  onChange={e => setData(e.target.value)}
                >
                  {/*<option value="" disabled>                                                                                                                  
                    Select Request Type
                  </option>*/}
                  <option value="AssetPurchase">Product Purchase</option>
                  {/*<option value="AcquisitionGateway">Native Currency Purchase</option>
                  <option value="AssetPurchase">Dividend Deposit</option>
                  <option value="AcquisitionGateway">Venture Deposit</option>*/}
              </select>

                <input
                  type="text"
                  value={receipt}
                  onChange={(e) => validateHash(e.target.value)} //setUserReceipt(e.target.value)} //need to protect the user here...
                  placeholder="Input Receipt Hash '0x...'"
                  className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
                />

                <div className="">
                  <p className="text-white mb-2 mt-8 uppercase tracking-wide text-xs font-light">
                    CONFIRMATION DETAILS
                  </p>
                  <input
                    type="text"
                    value={userFirstName}
                    onChange={(e) => setUserFirstName(e.target.value)}
                    placeholder="First Name"
                    className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
                  />
                  <input
                    type="text"
                    value={userLastName}
                    onChange={(e) => setUserLastName(e.target.value)}
                    placeholder="Last Name"
                    className="input w-full bg-black mt-2 rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
                  />
                  <input
                    type="email"
                    value={userEmail}
                    onChange={handleEmailChange}
                    placeholder="Email Address"
                    className={`input w-full bg-black mt-2 rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5 ${
                      emailError ? "border-red-500" : ""
                    }`}
                  />
                  {emailError && (
                    <p className="text-red-500 text-xs mt-1">{emailError}</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row relative justify-between items-center gap-4 mt-10 pt-4 border-t w-full">
                  <div className="flex flex-col items-start sm:flex-row sm:items-center w-full sm:gap-2">
                    <WalletConnectButton />
                    {!address && (
                      <>
                        <button
                          onClick={() => setShowWalletNotice(true)}
                          className="w-6 h-6 rounded-full bg-white/40 hover:bg-red-200 flex items-center justify-center ml-2"
                          title="Wallet Required"
                        >
                          <ExclamationCircleIcon className="w-4 h-4 text-red-600" />
                        </button>
                        {showWalletNotice && (
                          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/70 border-t border-red-300 shadow-lg p-4 max-h-[40vh] overflow-y-auto animate-slide-up">
                            <div className="flex items-center gap-2 mb-4">
                              <WalletIcon className="w-6 h-6 text-red-500" />
                              <h2 className="text-lg mt-2 font-semibold text-red-600">
                                WALLET REQUIRED
                              </h2>
                            </div>
                            <p className="text-sm text-black mb-2">
                              Connect your wallet to continue. This ensures secure
                              and personalized access.
                            </p>
                            <div className="flex justify-end">
                              <button
                                onClick={() => setShowWalletNotice(false)}
                                className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                Got it
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <button
                    className="btn bg-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
                    onClick={handleSendClick}
                    disabled={
                      !receipt||
                      isProcessing
                    }
                  >
                    <div className="flex items-center gap-2">
                      {isProcessing ? (
                        <>
                          <span className="loading loading-spinner loading-sm" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <BanknotesIcon className="h-5 w-4 shrink-0" />
                          <span>CONFIRM</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
          {step === 1 && (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 bg-white/5 rounded-lg shadow-md text-center overflow-y-auto">
              <h3 className="text-xl font-light text-primary mb-4">REQUEST COMPLETE</h3>
              <p className="text-gray-700 mb-2">
                View Transaction Details The Dashboard.
              </p>
              <a
                href="/dashboard"
                className="inline-block mt-4 px-5 py-2 bg-white/15 text-white font-medium rounded hover:bg-secondary/30 transition"
              >
                Go to Dashboard
              </a>
            </div>
          )}
        </>
      )}
      <SlidePanel
        isOpen={showStablecoinInfo}
        onClose={() => setShowStablecoinInfo(false)}
        title="SUPPORTED STABLECOIN"
        >
        <div className="overflow-hidden max-h-[40vh] rounded-t-xl">
            <div className="overflow-y-auto max-h-[calc(40vh-20px)] px-6 py-4 space-y-4 text-sm text-gray-300">
            {supportedTokens
                .filter(({ symbol }) => !["GBDo", "BTC", "ETH", "GBDx", "COPx", "GLB", "TGUSA", "TGMX", "CREs", "CREh", "CGRi"].includes(symbol))
                .map(({ name, symbol, address }) => (
                <div key={symbol} className="bg-white/5 backdrop-blur-md p-4 rounded-md shadow-sm">
                    <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-300">{name}</span>
                    <span className="text-xs text-gray-400">{symbol}</span>
                    </div>
                    <div className="mt-1 text-xs break-all">
                    <strong>Address:</strong> {address}
                    </div>
                    <div className="text-xs text-gray-400">
                    <strong>Network:</strong> {getNetwork(symbol, address)}
                    </div>
                </div>
                ))}
            </div>
        </div>
    </SlidePanel>
    </div>
  );
};

function SlidePanel({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`fixed bottom-0 left-0 w-full z-50 bg-black/90 text-white px-6 py-8 transition-transform duration-500 ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-light">{title}</h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 backdrop-blur-md p-2 rounded-full hover:bg-white/20 transition duration-300"
            aria-label="Close panel"
          >
            <svg
              className="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        {/* Render children instead of description */}
        <div>{children}</div>
      </div>
    </div>
  );
}
