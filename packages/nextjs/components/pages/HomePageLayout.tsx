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
import { Banner } from "~~/components/banner/storeFrontBanner";
import { Footer } from "~~/components/banner/Footer";
import dynamic from "next/dynamic";
import { useCheckoutStore } from "~~/components/purchase/useCheckoutStore"; 
import { DisclosureModal } from "~~/components/invest/disclosureModal";
import { CryptoCardPager } from "~~/components/invest/cryptoPager";
import { FiatCardPager } from "~~/components/invest/fiatPager";

const InvestmentModal = dynamic(() =>
  import("~~/components/invest/investmentModal").then(mod => mod.InvestmentModal),
  { ssr: false }
);

const GlobalWalletModal = dynamic(() =>
  import("~~/utils/globalEco/walletConnectButton").then(mod => mod.WalletConnectButton),
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

  const [showDisclosureModal, setShowDisclosureModal] = useState(false);
  const disclosureSections = [
    {
      id: "overview",
      label: "OVERVIEW",
      content: `
        <p>Global Dollar (GBDo) operates an asset-backed ecosystem in which investments are directly tied to products and services within the platform. By investing in Global Dollar, participants are supporting the underlying economy of the ecosystem.</p>
        <p>The system offers dividend payouts based on the chosen investment cycle, with a minimum term of eight quarters (2 years). If an investor initiates their deposit after the 15th day of a quarter, the investor's term will not begin until the following quarter. Investors begin recieving dividend payouts at the close of the first quarter of their investment. At the end of each investment term, investors receive any earned dividends and their original investment amount.</p>
      `,
    },
    {
      id: "redemption",
      label: "TERM DIVIDEND REDEMPTIONS",
      content: `
        <p>If the redemption process is not started within the redemption period of 2 years redmption period immediately following the close of their selected term, dividends will be forfeited.</p>
        <p>While all investor’s tokens (associated invested amount) are redeemable, if an investor fails to initiate the redemption process by the associated redemption period, the investor's tokens will automatically lock into the sequential cycle, and the original selected term will apply.</p>
      `,
    },
    {
      id: "dividends",
      label: "TERM DIVIDENDS",
      content: `
        <p className="font-semibold text-justify text-sm pr-10 text-secondary"> BE ADVISED: <span className="font-semibold text-sm text-primary">Vault and Venture contract investing is <span className= "font semibold text-secondary" >IRREVERSIBLE</span>. While no refunds are possible trading or selling of your assets are possible prior to beginning the redemption process. Please REVIEW ALL Terms Disclosures before investing. Returns or redemption of original investment are outlined in the Terms & Conditions, Overview & Disclosure.</span></p>
        <p>All term investors are issued dividend tokens that are free to trade like any ERC20 token, and the associated call date of tokens can be found on the Dashboard within the "Balances" panel.</p>
        <p>All investments and payouts are subject to defined grace periods, which account for processing timelines and potential delays due to operational or market conditions.</p>
        
      `,
    },
    {
      "id": "property",
      "label": "REGIONAL VENTURES",
      "content": `
        <p className="font-semibold text-justify text-sm pr-10 text-secondary"> BE ADVISED: <span className="font-semibold text-sm text-primary">Vault and Venture contract investing is <span className= "font semibold text-secondary" >IRREVERSIBLE</span>. While no refunds are possible trading or selling of your assets are possible prior to beginning the redemption process. Please REVIEW ALL Terms Disclosures before investing. Returns or redemption of original investment are outlined in the Terms & Conditions, Overview & Disclosure.</span></p>
        <p>All venture-backed tokens represent fractional ownership in real estate projects, business startups, and other ventures. These tokens are freely tradable like any ERC-20 tokens.</p>
        <p>The associated call or maturity dates, investment terms, and operational periods can be found on the Dashboard within the "Balances" panel.</p>
        <p>Investors receive payouts derived from operational returns generated by the ventures, calculated and distributed according to the predefined contract terms and timelines.</p>
        <p>All investments and payouts are subject to clearly defined grace periods, which account for processing timelines and potential delays due to operational, legal, or market conditions.</p>
        <p>Venture contracts outline specifics including investment duration, expected returns, risk disclosures, and any performance-based milestones triggering payout events.</p>
        <p>This platform ensures transparency and compliance through real-time updates, providing investors with clear visibility into project performance metrics and payment schedules.</p>
      `
    },
    /*{
      "id": "speculative",
      "label": "SPECULATIVE TRADING",
      "content": `
        <p>All speculative tokens are paired and traded like any other crypto/fiat currency pair.</p>
        <p>The associated call data, and investment terms can be found on the Trading Dashboard.</p>
        <p>This platform ensures transparency and compliance through real-time updates, providing investors with clear visibility into project performance metrics and payment schedules.</p>
      `
    },*/
    {
      id: "risks",
      label: "RISK DISCLOSURE",
      content: `
        <p>While the Global Dollar model is designed with real-world asset backing and operational safeguards, investing in this ecosystem involves risks regardless of how minimal they may be.</p>
        <p>Due to unforeseen market turns, liquidity constraints, or internal disruptions, there may be delays in capital return, reductions in payout, or—in extreme circumstances—a complete loss of invested capital.</p>
        <p>In situations where funds cannot be returned at maturity, settlements will be processed as promptly as possible, with complete transparency and consistent communication.</p>
      `,
    },
    {
      id: "legal",
      label: "LEGAL NOTICE",
      content: `
        <p>Global Dollar is not registered as a securities issuer under any national jurisdiction. Investments are made at the discretion of the participant and do not constitute a regulated financial product.</p>
        <p>Dividend payouts are not guaranteed and are subject to the performance of the underlying ecosystem and prevailing market conditions. The market value of GBDo tokens may fluctuate independently of dividend performance or redemption schedules.</p>
        <p>Investors are responsible for understanding and complying with any tax obligations arising from dividends, token trades, or redemptions.</p>
        <p>Global Dollar reserves the right to delay or modify payout schedules in the event of force majeure, including but not limited to natural disasters, cyberattacks, or systemic market failures.</p>
        <p>Investors are strongly encouraged to assess their personal risk tolerance and consult a financial advisor before participating in the Global Dollar ecosystem.</p>
      `,
    },
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

  console.log("showModal:", showModal);

  return (
    <>
      <section
        className="relative bg-black bg-cover px-6 py-1 md:px-16 bg-scroll md:bg-fixed w-full bg-center bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/emblemA.png')",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50 z-0" />

        {/* Content */}
        <div className="relative z-10">
          <Banner />
        </div>
      </section>

      <Footer />

      <div className="bg-black bg-cover min-h-[100dvh] mx-auto px-4 py-2 sm:px-6 md:px-8 lg:px-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Investor Portal */}
          <div className="bg-white/3 to-black rounded-xl shadow-lg px-6 mt-4 space-y-4">
            {/* Inlaid Video */}
            <div className="w-full h-48 mt-5 overflow-hidden rounded-md">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover rounded-md object-cover"
                src="/emblemDance.mp4"
                onLoadedMetadata={e => {
                  e.currentTarget.playbackRate = 0.25;
                }}
              />
            </div>
            <h2 className="text-xl font-light text-primary mt-4">ECOSYSTEM INVESTING</h2>
            <p className="text-sm text-info-600">
              Investing in more than crypto. Investing in more than a business. Investing in products that change your future and back your investment.
            </p>
            {/* Investor Overview */}
            {/*<h3 className="text-md md:text-lg mt-10 mb-2 font-light text-white">INVESTOR OVERVIEW</h3>*/}
            <button
              className="text-sm font-semibold text-primary"
              onClick={() => setShowDisclosureModal(true)}
            >
              View Investment Terms ▸
            </button>
            <button
              className="btn bg-white/5 hover:bg-secondary/30 text-white rounded-md w-full mt-4 mb-2 text-xs font-light px-4 h-10"
              onClick={() => setShowModal(true)}
            >
              START INVESTING
            </button>
            {/* Logo */}
            <div className="my-0 flex justify-center">
              <img 
                src="/logo.png" 
                alt="Descriptive alt text" 
                className="w-15 h-15"
              />
            </div>
            {/* Pager */}
            <div className="mt-2">
              <CryptoCardPager/>
            </div>
            <div className="mt-4 mb-4">
              <FiatCardPager/>
            </div>
          </div>

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
                    basePriceInGBDo: Number(rawAsset.asset?.basePriceInGBDo ?? 0),
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
        </div>

        {/* Modals */}
        <InvestmentModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
          }}
        />

        <DisclosureModal
          isOpen={showDisclosureModal}
          onClose={() => setShowDisclosureModal(false)}
          sections={disclosureSections}
        />
      </div>
    </>
  );
}
