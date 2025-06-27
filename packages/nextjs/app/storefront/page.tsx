// app/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  featuredAssetsMockE20,
  featuredAssetsMockE45,
  featuredAssetsMockE70,
  featuredAssetsMockX100,
  featuredAssetsMockX200,
  featuredAssetsMockX300,
  featuredAssetsMockX400,
  featuredAssetsMockX500,
  featuredAssetsMockX600,
} from "~~/lib/mockAssets";
import { hardhat } from "viem/chains";
import { CurrencyDollarIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/globalDEX/useTargetNetwork";
import { useGlobalState } from "~~/services/store/store";
import { AssetCard } from "~~/components/assets/assetCard";
import { useScaffoldWriteContract } from "~~/hooks/globalDEX/useScaffoldWriteContract";
import { InvestmentModal } from "~~/components/invest/investmentModal";
import { supportedTokens, Token } from "~~/components/constants/tokens";



export default function HomePage() {
  const router = useRouter();
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;
  const [IntermsText, setInTermsText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(0);

  // NEW: track the deposit amount (you can default to zero or whatever makes sense)
  const [depositAmount, setDepositAmount] = useState<bigint>(0n);

  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string>(
    supportedTokens[0].symbol,
  );
  const selectedToken: Token | undefined = supportedTokens.find(
    (t) => t.symbol === selectedTokenSymbol,
  );

  const { writeContractAsync, isMining } = useScaffoldWriteContract({
    contractName: "assetPurchase", //placeholder
  });


  const allFeaturedAssets = [
    ...featuredAssetsMockE20,
    ...featuredAssetsMockE45,
    ...featuredAssetsMockE70,
    ...featuredAssetsMockX100,
    ...featuredAssetsMockX200,
    ...featuredAssetsMockX300,
    ...featuredAssetsMockX400,
    ...featuredAssetsMockX500,
    ...featuredAssetsMockX600,
  ];


  useEffect(() => {
    fetch("/legal/investorOverview.txt")
      .then(res => res.text())
      .then(setInTermsText)
      .catch(console.error);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 p-4 gap-6 bg-black">
      {/* Storefront */}
      <div className="lg:col-span-3">
        <h2 className="text-xl font-light mb-4">PRODUCT PORTFOLIO</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {allFeaturedAssets.map(rawAsset => {
            const variant = rawAsset.asset?.variant === "eseries" || rawAsset.asset?.variant === "xseries"
              ? rawAsset.asset.variant
              : "eseries"; // default fallback

            const parsedAsset = {
              asset: {
                assetId: rawAsset.assetId ?? 0,
                basePriceInUSD: Number(rawAsset.asset?.basePriceInUSD ?? 0),
                baseDays: rawAsset.asset?.baseDays ?? 0,
                perUnitDelay: String(rawAsset.asset?.perUnitDelay ?? "0"),
                variant: variant as "eseries" | "xseries", // 👈 Cast to the correct type
              },
              metadata: {
                name: rawAsset.metadata?.name ?? "",
                model: rawAsset.metadata?.model ?? "",
                description: rawAsset.metadata?.description ?? "",
                image: rawAsset.metadata?.image ?? "",
                altImage: rawAsset.metadata?.altImage ?? rawAsset.metadata?.image ?? "",
              },
            };

            return <AssetCard key={parsedAsset.asset.assetId} data={parsedAsset} />;
          })}

        </div>
      </div>

      {/* Investor Portal */}
      <div className="lg:col-span-1">
        <h2 className="text-xl font-light text-primary mb-3">EARN</h2>
        <p className="text-sm text-info-600 mb-4">Choose the number of annual based quarter terms to participate in. Click "Invest", review and complete your contract.</p>
        {/* 0. Token Selector */}
        <select
          className="select select-bordered w-full mb-4"
          value={selectedTokenSymbol}
          onChange={(e) => setSelectedTokenSymbol(e.target.value)}
        >
          {supportedTokens.map((t) => (
            <option key={t.symbol} value={t.symbol}>
              {t.symbol} — {t.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          className="input input-bordered w-full mb-4"
          placeholder="Amount to invest"
          onChange={e => {
            // convert to smallest unit, e.g. 18 decimals
            const base = Math.floor(Number(e.target.value) * 1e18);
            setDepositAmount(BigInt(base));
          }}
        />

        <select
          className="select select-bordered w-full mb-4"
          value={selectedQuarter || ""}
          onChange={e => setSelectedQuarter(Number(e.target.value))}
        >
          <option value="">Select Quarters</option>
          {[2, 3, 4, 5, 6, 7, 8].map(q => (
            <option key={q} value={q}>
              {q} Quarter{q > 1 ? "s" : ""}
            </option>
          ))}
        </select>

        <button
          className="btn btn-secondary w-full mb-4"
          onClick={() => setShowModal(true)}
          disabled={
            selectedQuarter === 0 ||
            depositAmount === 0n ||
            !selectedToken
          }
        >
          Invest
        </button>

        <h3 className="text-lg mt-15 mb-2 font-light">Investor Overview</h3>
        <div className="flex-1 overflow-y-auto text-sm mt-2 text-justify rounded">
          {IntermsText
          .split("\n")
          .map((line, idx) => (
            <p key={idx} className="mb-2">{line}</p>
          ))}
        </div>
      </div>
      <InvestmentModal
        amount={depositAmount}
        committedQuarters={selectedQuarter}
        token={selectedToken!}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
    
  );
}
