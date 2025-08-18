"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useTargetNetwork } from "~~/hooks/globalEco/useTargetNetwork";
import { useGlobalState } from "~~/services/store/store";
import { AssetCard } from "~~/components/assets/assetCard";
import { supportedTokens, Token } from "~~/components/constants/tokens";
import { Banner } from "~~/components/banner/storeFrontBanner";
import { Footer } from "~~/components/banner/Footer";
import dynamic from "next/dynamic";
import { useCheckoutStore } from "~~/components/useCheckoutStore";

const InvestmentModal = dynamic(() =>
  import("~~/components/invest/investmentModal").then(mod => mod.InvestmentModal),
  { ssr: false }
);

const GlobalWalletModal = dynamic(() =>
  import("~~/components/globalEco/RainbowKitCustomConnectButton/globalWalletConnect").then(mod => mod.GlobalWalletModal),
  { ssr: false }
);

export default function HomePageLayout() {
  const { buyModalOpen, currentStep, setField } = useCheckoutStore();
  const router = useRouter();
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const [IntermsText, setInTermsText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<bigint>(0n);
  const resetForm = () => {
    setSelectedQuarter(0);
    setDepositAmount(0n);
    setSelectedTokenSymbol(supportedTokens.length > 0 ? supportedTokens[0].symbol : "");
  };

  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string>(
    supportedTokens.length > 0 ? supportedTokens[0].symbol : ""
  );

  const selectedToken: Token | undefined = supportedTokens.find(t => t.symbol === selectedTokenSymbol);
  console.log(depositAmount);

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

  useEffect(() => {
    if (!isLocalNetwork) {
      console.warn(`Connected to ${targetNetwork.name}, expected ${hardhat.name}`);
    }
  }, [isLocalNetwork, targetNetwork]);

  return (
    <>
      <section
        className="relative bg-black px-6 py-6 md:px-16 bg-scroll md:bg-fixed bg-center bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/logo.png')",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 z-0" />

        {/* Content */}
        <div className="relative z-10">
          <Banner />
        </div>
      </section>


      <Footer />

      <div className="bg-black px-4 py-6 sm:px-6 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Storefront */}
          <div className="md:col-span-3">
            <h2 className="text-lg md:text-xl font-light text-white mb-4"></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {allFeaturedAssets.map(rawAsset => {
                const variant = rawAsset.asset?.variant === "eseries" || rawAsset.asset?.variant === "xseries"
                  ? rawAsset.asset.variant
                  : "eseries";

                const parsedAsset = {
                  asset: {
                    assetId: rawAsset.assetId ?? 0,
                    basePriceInGBDO: Number(rawAsset.asset?.basePriceInGBDO ?? 0),
                    baseDays: rawAsset.asset?.baseDays ?? 0,
                    perUnitDelay: String(rawAsset.asset?.perUnitDelay ?? "0"),
                    variant: variant as "eseries" | "xseries",
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
          <div className="md:col-span-1">
            <h2 className="text-lg md:text-xl font-light text-primary mb-3">EARN</h2>
            <p className="text-sm md:text-base text-info-600 mb-4">
              Choose the number of annual based quarter terms to participate in. Click &quot;INVEST&quot;, review and complete your contract.
            </p>

            {/* Token Selector */}
            <select
              className="select select-ghost w-full text-info-600 mb-4"
              value={selectedTokenSymbol}
              onChange={e => setSelectedTokenSymbol(e.target.value)}
            >
              <option value="" disabled>Select token</option>
              {supportedTokens.map(t => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol} — {t.name}
                </option>
              ))}
            </select>

            {/* Quarter Selector */}
            <select
              className="select select-ghost w-full text-info-600 mb-4"
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

            {/* Investment Amount */}
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              className="input input-ghost w-full text-info-600 mb-4"
              placeholder="Amount to invest"
              onChange={e => {
                const base = Math.floor(Number(e.target.value) * 1e18);
                setDepositAmount(BigInt(base));
              }}
            />

            {/* Invest Button */}
            <button
              className="btn bg-white/10 hover:bg-secondary/30 text-white rounded-md w-full mb-4 text-sm md:text-base px-4 py-2"
              onClick={() => setShowModal(true)}
              disabled={
                selectedQuarter === 0 ||
                depositAmount === 0n ||
                !selectedToken
              }
            >
              INVEST
            </button>

            {/* Investor Overview */}
            <h3 className="text-md md:text-lg mt-10 mb-2 font-light text-white">INVESTOR OVERVIEW</h3>
            <div className="max-h-64 overflow-y-auto text-sm text-info-600 mt-2 text-justify rounded">
              {IntermsText.split("\n").map((line, idx) => (
                <p key={idx} className="mb-2">{line}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Modals */}
        <InvestmentModal
          amount={depositAmount}
          committedQuarters={selectedQuarter}
          token={selectedToken!}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            resetForm(); // Clear inputs here
          }}
          openWalletModal={() => setWalletModalOpen(true)}
        />

        <GlobalWalletModal
          isOpen={walletModalOpen}
          onClose={() => setWalletModalOpen(false)}
        />
      </div>
    </>
  );
}
