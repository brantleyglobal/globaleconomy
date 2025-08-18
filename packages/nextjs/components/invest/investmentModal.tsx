"use client";

import { useState, useEffect } from "react";
import { Interface } from '@ethersproject/abi';
import * as safeEthers from "@safe-global/safe-ethers-lib/node_modules/ethers";
import { BytesLike } from "ethers";
import type { Bytes } from "ethers";
import { Modal } from "~~/components/common/modal";
import { supportedTokens, Token } from "~~/components/constants/tokens";
import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";
import { createPublicClient, http, erc20Abi, HttpTransport } from "viem";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import smartVaultAbi from "~~/lib/contracts/abi/SmartVault.json";
import deployments from "~~/lib/contracts/deployments.json";
import { RainbowKitCustomConnectButton } from "~~/components/globalEco";
import { toast } from "react-hot-toast";
import { useERC4337Account, AccountProvider } from "~~/lib/wallet/SmartWalletContext";
import { customEncodeMultiSend } from "~~/lib/utils/customEncodeMultiSend";
import { SimpleAccountAPI } from "@account-abstraction/sdk";
import { hexlify } from "ethers/lib/utils";

type Hex = `0x${string}`;

interface UserOperationStruct {
  sender: string;
  nonce: bigint;
  initCode: string;
  callData: string;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: string;
  signature: string;
}

type Props = {
  amount: bigint;
  committedQuarters: number;
  token: Token;
  isOpen: boolean;
  onClose: () => void;
  openWalletModal?: () => void;
};

export const InvestmentModal: React.FC<Props> = ({
  amount,
  committedQuarters,
  token,
  isOpen,
  onClose,
  openWalletModal,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [summary, setSummary] = useState<{
    unlockQ: number;
    eligibilityQ: number;
    multiplier: number;
    eligibilityLabel: string;
    unlockLabel: string;
  } | null>(null);
  const [txhash, settxhash] = useState<string | null>(null);
  const [termsText, setTermsText] = useState("");
  const [policyText, setPolicyText] = useState("");

  const { address: connectedWallet, chain } = useAccount();
  const chainId = chain?.id;
  const rpcReader = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { accountAPI: sdk, loading: isInitializing } = useERC4337Account();

  const publicClient = createPublicClient({
    chain: GLOBALCHAIN,
    transport: http(),
  });

  const GRACE_PERIOD_QUARTERS = 1;
  const LOCK_PERIOD_QUARTERS = committedQuarters;

  const handlePreCheckAndCommit = async () => {
    if (!rpcReader || !connectedWallet) {
      alert("Wallet or RPC not available.");
      return;
    }

    try {
      let balance: bigint;

      if (token.isNative) {
        // Native token balance (e.g., MCH on your chain)
        balance = await rpcReader.getBalance({ address: connectedWallet });
      } else if (token.address) {
        // ERC-20 token balance
        const erc20Balance = await rpcReader.readContract({
          address: token.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [connectedWallet],
        });

        // Type-safe conversion
        if (typeof erc20Balance === "bigint") {
          balance = erc20Balance;
        } else if (typeof erc20Balance === "string") {
          balance = BigInt(erc20Balance);
        } else {
          throw new Error("Unexpected balance type returned from contract.");
        }
      } else {
        throw new Error("Token address missing for non-native token.");
      }

      // Balance check
      const hasFunds = balance >= amount;
      if (!hasFunds) {
        alert(`Insufficient ${token.symbol} balance.`);
        return;
      }

      // Proceed to next step
      await processDeposit();
      setStep(5);
    } catch (err) {
      console.error("Fund verification failed:", err);
      //alert("Unable to verify your funds. Please try again shortly.");
    }
  };



  useEffect(() => {
    fetch("/legal/investorOverview.txt")
      .then((r) => r.text())
      .then(setTermsText);
    fetch("/legal/privacy-policy.txt")
      .then((r) => r.text())
      .then(setPolicyText);
  }, []);

  useEffect(() => {
    if (step === 3) {
      try {
        const now = Date.now() / 1000;
        const currentQ = getQuarter(now);
        const unlockQ = currentQ + committedQuarters;
        const eligibilityQ = computeEligibilityQuarter(now, committedQuarters);
        const unlockDate = quarterToDate(unlockQ);
        const eligibilityDate = quarterToDate(eligibilityQ);

        setSummary({
          unlockQ,
          eligibilityQ,
          multiplier: getMultiplier(now, committedQuarters),
          unlockLabel: formatQuarterLabel(unlockDate),
          eligibilityLabel: formatQuarterLabel(eligibilityDate),
        });
      } catch (err) {
        console.error("Error in summary computation:", err);
      }
    }
  }, [step, committedQuarters]);

  const processDeposit = async () => {
    const shouldRun = connectedWallet && rpcReader;
    if (!shouldRun) return;

    try {
      const vaultAddress = deployments["SmartVault"];
      const iface = new Interface(smartVaultAbi.abi);
      const calldata = iface.encodeFunctionData("deposit", [amount, committedQuarters]);

      const provider = new safeEthers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const eoaAddress = await signer.getAddress();

      const accountAPI = new SimpleAccountAPI({
        provider,
        entryPointAddress: deployments.EntryPoint,
        owner: signer,
        factoryAddress: deployments.SimpleAccountFactory,
      });

      const smartWalletAddress = await accountAPI.getAccountAddress();

      const txs = [
        {
          to: vaultAddress,
          value: "0",
          data: calldata,
        },
      ];

      const multiSendData = customEncodeMultiSend(txs);

      const userOp: UserOperationStruct = {
        sender: smartWalletAddress,
        nonce: (await accountAPI.getNonce()).toBigInt(),
        initCode: await accountAPI.getInitCode(),
        callData: multiSendData,
        callGasLimit: 0n,
        verificationGasLimit: 0n,
        preVerificationGas: 0n,
        maxFeePerGas: 0n,
        maxPriorityFeePerGas: 0n,
        paymasterAndData: "0x",
        signature: "",
      };

      const signedUserOp = await accountAPI.signUserOp(userOp);

      const resolveHex = async (input: string | Bytes | Promise<BytesLike>) => {
        const resolved = await Promise.resolve(input);
        return typeof resolved === "string" ? resolved : hexlify(resolved);
      };

      const calldataHex = await resolveHex(signedUserOp.callData);
      const signatureHex = await resolveHex(signedUserOp.signature);

      const processedAt = new Date().toISOString();
      const depositAmount = formatBigIntToDecimal(amount); // returns string like "1.23456789"


      const vaultPayload = {
        txhash: "",
        contractaddress: deployments["SmartVault"],
        calldata: calldataHex,
        signature: signatureHex,
        useraddress: connectedWallet!,
        smartwallet: "",
        depositamount: depositAmount,
        committedquarters: committedQuarters,
        paymentmethod: token.symbol,
        depositstarttime: new Date().toISOString(),
        ispending: 1,
        isclosed: 0,
        status: "queued",
        chainstatus: false,
        queuedat: new Date().toISOString(),
        processedat: processedAt,
        priority: 0,
        retrycount: 0,
        receipthash: "",
        notes: "success",
        timestamp: new Date().toISOString()
      };

      const res = await fetch("https://gateway.brantley-global.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "vault",
          method: "vaultCommit",
          params: vaultPayload
        }),
      });

      const contentType = res.headers.get("Content-Type") ?? "";
      if (res.ok && contentType.includes("application/json")) {
        const result = await res.json();
        toast.success("Deposit intent signed and logged.");
      }

    } catch (err: any) {
      console.error("Deposit signing error:", err);
      const depositAmount = formatBigIntToDecimal(amount); // returns string like "1.23456789"


      const errorPayload = {
        txhash: "",
        contractaddress: deployments["SmartVault"],
        calldata: "",
        signature: "",
        useraddress: connectedWallet!,
        smartwallet: "",
        depositamount: depositAmount,
        committedquarters: committedQuarters,
        paymentmethod: token.symbol ?? "unknown",
        depositstarttime: new Date().toISOString(),
        ispending: 1,
        isclosed: 0,
        status: "failed",
        chainstatus: false,
        queuedat: new Date().toISOString(),
        processedat: null,
        priority: 0,
        retrycount: 0,
        receipthash: "",
        notes: err.message ?? "Signing failed",
        timestamp: new Date().toISOString()
      };

      try {
        const res = await fetch("https://gateway.brantley-global.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "vault",
            method: "vaultCommit",
            params: errorPayload
          }),
        });

        const contentType = res.headers.get("Content-Type") ?? "";
        if (res.ok && contentType.includes("application/json")) {
          const result = await res.json();
          toast.error("Deposit error submitted.");
        } else {
          toast("Deposit error submitted, but no response payload.");
        }
      } catch (nestedErr: any) {
        console.error("Error reporting failed:", nestedErr);
        toast.error("Failed to report deposit error.");
      }
    }
  };
  
  const stepLabels = [
    "Terms",
    "Policy",
    "Review",
    "Confirm",
    "Done",
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title="">
      <div className="flex justify-between text-xs mt-15 mb-6 px-2">
      {/* Step Tracker */}
        {stepLabels.map((label, index) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className={`w-4 h-4 rounded-full border-1 mb-6 ${
                step > index
                  ? "bg-info border-info"
                  : step === index
                  ? "bg-secondary border-info"
                  : "border-gray-400"
              }`}
            />
            <span
              className={`${
                step === index ? "font-light text-info" : "text-gray-500"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="space-y-2 h-[500px] flex flex-col">
        {/* STEP 1: Terms */}
        {step === 1 && (
          <div className="flex flex-col h-full">
            {/* Scrollable Content */}
            <div className="flex-grow overflow-y-auto p-4 space-y-6">
              <h3 className="text-lg font-light">INVESTMENT TERMS</h3>

              {/* Scrollable Terms Text */}
              <div className="max-h-[300px] overflow-y-auto text-sm border p-3 rounded bg-black text-justify text-info-300">
                {termsText || "Loading…"}
              </div>

              {/* Acceptance Checkbox — outside of scroll */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={() => setTermsAccepted(!termsAccepted)}
                />
                I agree to the Investment Terms
              </label>
            </div>

            {/* Sticky Footer Navigation */}
            <div className="flex justify-end gap-2 p-4 border-t bg-transparent">
              {/* You can optionally render a Back button here */}
              <button
                className="btn btn-primary text-white h-6 rounded-md btn-sm"
                onClick={() => {
                  if (termsAccepted) {
                    setStep(2);
                  }
                }}
                disabled={!termsAccepted}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Privacy Policy */}
        {step === 2 && (
          <div className="flex flex-col h-full">
            {/* Scrollable Content */}
            <div className="flex-grow overflow-y-auto p-4 space-y-6">
              <h3 className="text-lg font-light">PRIVACY POLICY</h3>

              {/* Scrollable Policy Text */}
              <div className="max-h-[300px] overflow-y-auto text-sm border p-3 rounded bg-black text-justify text-info-300">
                {policyText || "Loading…"}
              </div>

              {/* Acceptance Checkbox — outside scroll */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={policyAccepted}
                  onChange={() => setPolicyAccepted(!policyAccepted)}
                />
                I agree to the Privacy Policy
              </label>
            </div>

            {/* Sticky Footer Navigation */}
            <div className="flex justify-end gap-2 p-4 border-t bg-transparent">
              {/* 🢀 Back button */}
              <button
                className="btn btn-secondary h-6 rounded-md text-white btn-sm"
                onClick={() => setStep(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </button>

              {/* 🢂 Next button */}
              <button
                className="btn btn-primary h-6 rounded-md text-white btn-sm"
                onClick={() => {
                  if (policyAccepted) {
                    setStep(3);
                  }
                }}
                disabled={!policyAccepted}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Summary */}
        {step === 3 && summary && (
          <>
            <h3 className="font-light">SMART CONTRACT SUMMARY</h3>

            <div className="grid grid-cols-1 divide-y divide-base-300 h-[500px] overflow-y-auto p-2 text-sm">
              <div className="py-1">
                <p className="text-base font-light">INVESTMENT AMOUNT</p>
                <p>
                  <strong>
                    {Number(amount) / 10 ** token.decimals} {token.symbol}
                  </strong>
                </p>
              </div>

              <div className="py-1">
                <p className="text-base font-light">QUARTERS TO INVEST</p>
                <p><strong>{committedQuarters}</strong></p>
              </div>

              <div className="py-1">
                <p className="text-base font-light">INVESTMENT UNLOCK QUARTER</p>
                <p><strong>{summary?.unlockLabel}</strong></p>
              </div>

              <div className="py-1">
                <p className="text-base font-light">INVESTMENT ELIGIBILITY QUARTER</p>
                <p><strong>{summary?.eligibilityLabel}</strong></p>
              </div>

              <div className="py-1">
                <p className="text-base font-light">INVESTMENT MULTIPLIER</p>
                <p><strong>{summary?.multiplier}%</strong></p>
              </div>
            </div>

            {/* Sticky-style footer matching modal layout */}
            <div className="flex justify-between items-center p-4 border-t bg-transparent">
              {/* Left side: wallet connect button */}
              <div className="flex items-center gap-2">
                <RainbowKitCustomConnectButton />
                {!connectedWallet && (
                  <span className="text-red-500 text-sm">Wallet required</span>
                )}
              </div>

              {/* Right side: navigation buttons */}
              <div className="flex gap-2 items-center">
                <button
                  className="btn btn-secondary h-6 rounded-md text-white btn-sm"
                  onClick={() => setStep(2)}
                >
                  Back
                </button>

                <button
                  className="btn btn-primary h-6 rounded-md text-white btn-sm"
                  onClick={() => setStep(4)}
                  disabled={!connectedWallet}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* STEP 4: Ready to Commit */}
        {step === 4 && (
          <div className="flex flex-col h-full">
            {/* Scrollable Content */}
            <div className="flex-grow overflow-y-auto p-4 space-y-6">
              <h3 className="text-lg font-light">COMMIT</h3>

              <div className="space-y-2">
                <p>
                  Investment Total: <strong>{Number(amount) / 10 ** token.decimals} {token.symbol}</strong>
                </p>
                <p>
                  Investment Unlock Quarter: <strong>{summary?.unlockLabel}</strong>
                </p>
              </div>

              <p className="text-sm text-justify text-info-300">
                This transaction is irreversible and your investment and any rewards <strong>"will not"</strong> be available until you have reached your <strong>"Invest Unlock Quarter"</strong>. By clicking confirm you consent to invest the total stated above, including the conditions outlined in the investment process.
              </p>
            </div>

            {/* Sticky Footer Navigation */}
            <div className="flex justify-end gap-2 p-4 border-t bg-transparent">
              <button
                className="btn btn-secondary h-6 rounded-md text-white btn-sm"
                onClick={() => setStep(3)}
              >
                Back
              </button>
              <button
                className="btn btn-primary h-6 rounded-md text-white btn-sm"
                onClick={handlePreCheckAndCommit}
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Confirmation */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center h-full p-6 bg-white/5 rounded-lg shadow-md text-center">
            <h3 className="text-2xl font-light text-white mb-4">Investment Accepted</h3>
            <p className="text-gray-700 mb-2">
              View Transaction Details The Dashboard.
            </p>
            <a
              href="/dashboard"
              target="_blank"
              className="inline-block mt-4 px-5 py-2 bg-white/15 text-white font-medium rounded hover:bg-secondary/30 transition"
            >
              Go to Dashboard
            </a>
          </div>
        )}

      </div>
    </Modal>
  );
};

// --- Mock implementations (for client-side preview) ---
function getQuarter(ts: number): number {
  const date = new Date(ts * 1000); // convert seconds to ms
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3); // 0–3
  return year * 4 + quarter;
}

function computeEligibilityQuarter(ts: number, committed: number): number {
  const q = getQuarter(ts);
  const start = getQuarterStart(ts);
  const daysIntoQuarter = (ts - start) / 86400;
  const grace = committed >= 3 ? 20 : 0;
  return daysIntoQuarter <= grace ? q : q + 1;
}

function getQuarterStart(ts: number): number {
  const date = new Date(ts * 1000);
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3);
  const startMonth = quarter * 3;
  return Math.floor(new Date(year, startMonth, 1).getTime() / 1000); // return timestamp in seconds
}

function toTimestamp(year: number, month: number, day: number): number {
  return (year - 1970) * 365 * 86400 + (month - 1) * 30 * 86400 + (day - 1) * 86400;
}

function getMultiplier(ts: number, committed: number): number {
  return committed >= 6 ? 200 : committed >= 4 ? 150 : 125;
}

function quarterToDate(q: number): Date {
  const year = Math.floor(q / 4);
  const quarter = q % 4;
  const month = quarter * 3;
  return new Date(year, month, 1);
}

function formatQuarterLabel(date: Date): string {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${year}`;
}

function formatBigIntToDecimal(value: bigint, decimals: number = 18): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;

  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fractionStr ? `${whole.toString()}.${fractionStr}` : whole.toString();
}


