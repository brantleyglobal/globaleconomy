"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CheckoutModal } from "~~/components/checkoutModal";
import { useCheckoutStore } from "~~/components/useCheckoutStore";
import { DModal } from "~~/components/common/descriptionModal";
import { Modal } from "~~/components/common/modal";
import { StablecoinRate } from "~~/lib/exchangeRates";
import { GlobalWalletModal } from "~~/components/globalEco/RainbowKitCustomConnectButton/globalWalletConnect";
import { RainbowKitCustomConnectButton } from "~~/components/globalEco";
import { AssetImageGallery } from "~~/components/gallery/imageGallery"

type AssetVariation = { label: string; apriceInGBDO: bigint; };

type Props = {
  data: {
    asset: {
      assetId: number;
      basePriceInGBDO: number;
      baseDays: number;
      perUnitDelay: string;
      variant: "eseries" | "xseries";
    };
    metadata: {
      name?: string;
      model?: string;
      description?: string;
      image?: string;
      altImage?: string;
    };
  };
};

const fiatToStablecoin: Record<string, string> = {
  USD: "USDC",
  EUR: "EURC",
  USDT: "USDT",
  DAI: "DAI",
  GBP: "GBPT",
  JPY: "JPYC",
  CAD: "QCAD",
  AUD: "AUDD",
  BRL: "BRL1",
  CHF: "XCHF",
  INR: "INRX",
  SGD: "XSGD",
  ZAR: "ZARP",
  KRW: "KRT",
  MXN: "MMXN",
  PYUSD: "PYUSD",
  FDUSD: "FDUSD",
  NGN: "NGNT",
  ARS: "ARSX",
  TRY: "TRYX"
};


const variationGroupsMap: Record<"eseries" | "xseries", Record<string, AssetVariation[]>> = {
  eseries: {
    epanel: [
      { label: "120v Split Phase @60Hz", apriceInGBDO: BigInt(0) },
      { label: "Customize", apriceInGBDO: BigInt(1_000_000_000) },
    ],
    monitoring: [
      { label: "No Monitoring", apriceInGBDO: BigInt(0) },
      { label: "Monitoring", apriceInGBDO: BigInt(2_000_000_000) },
    ],
    etie: [
      { label: "Stand Alone", apriceInGBDO: BigInt(0) },
      { label: "Grid Tie", apriceInGBDO: BigInt(1_000_000_000) },
    ],
  },
  xseries: {
    xpanel: [
      { label: "360v 3 Phase @60Hz", apriceInGBDO: BigInt(0) },
      { label: "Customize", apriceInGBDO: BigInt(5_000_000_000) },
    ],
    monitoring: [
      { label: "No Monitoring", apriceInGBDO: BigInt(0) },
      { label: "Monitoring", apriceInGBDO: BigInt(2_000_000_000) },
    ],
    xtie: [
      { label: "Stand Alone", apriceInGBDO: BigInt(0) },
      { label: "Grid Tie", apriceInGBDO: BigInt(5_000_000_000) },
    ],
  },
};

const galleryMap: Record<"eseries" | "xseries", { 
  pool: string[];
  main: string;
  hover: string 
}> = {
  eseries: {
    pool: ["/LegionE1.png", "/LegionE2.png", "/LegionE3.png", "/LegionE4.png", "/LegionE5.png"],
    main: "/LegionE1.png",
    hover: "/LegionEAlt.png"
  },
  xseries: {
    pool: ["/LegionX1.png", "/LegionX2.png", "/LegionX3.png",  "/LegionX4.png", "/LegionX5.png"],
    main: "/LegionX2.png",
    hover: "/LegionXAlt.png"
  }
};

export const AssetCard: React.FC<Props> = ({ data }) => {
  const { asset: itemAsset, metadata } = data;
  const variationGroups = variationGroupsMap[itemAsset.variant];

  const [selectedVariations, setSelectedVariations] = useState<Record<string, AssetVariation>>({});
  const [selectedCurrency, setSelectedCurrency] = useState("GBDO");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "crypto">("crypto");
  const [cryptoType, setCryptoType] = useState<"native" | "stable">("native");
  const [selectedStablecoin, setSelectedStablecoin] = useState("GBDO");

  const [convertedPrice, setConvertedPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const rawBasePriceGBDO = Number(itemAsset.basePriceInGBDO) / 1e6;
  const [modalOpen, setModalOpen] = useState(false);
  const variantKey = itemAsset.variant;
  const galleryImages = galleryMap[variantKey]?.pool || [];
  const variantImages = galleryMap[itemAsset.variant];
  const [imageSrc, setImageSrc] = useState(variantImages.main);
    
  const store = useCheckoutStore.getState();
  const resetForm = () => {
    setSelectedVariations({});
    setSelectedCurrency("GBDO");
    setPaymentMethod("crypto");
    setCryptoType("native");
    setSelectedStablecoin("GBDO");
    setConvertedPrice(0);
    setQuantity(1);
    setImageSrc(variantImages.main);
  };

  useEffect(() => {
    const initial: Record<string, AssetVariation> = {};
    Object.entries(variationGroups).forEach(([key, options]) => {
      initial[key] = options[0];
    });
    setSelectedVariations(initial);
  }, [itemAsset.variant]);

  const basePriceGBDO = useMemo(() => {
    const base = BigInt(itemAsset.basePriceInGBDO ?? 0);
    const variationTotal = Object.values(selectedVariations).reduce(
      (sum, v) => sum + BigInt(v.apriceInGBDO ?? 0),
      BigInt(0)
    );
    return Number(base + variationTotal) / 1e6;
  }, [itemAsset.basePriceInGBDO, selectedVariations]);


  const [exchangeData, setExchangeData] = useState<{
    rates: StablecoinRate[];
    gbdoRate: number;
    lastUpdated: number;
  } | null>(null);


  useEffect(() => {
    if (!exchangeData || !selectedCurrency) return;

    const tokenData = exchangeData.rates.find(r => r.symbol === selectedCurrency);
    const rateAgainstGBDO = tokenData?.rateAgainstGBDO ?? 1;

    setConvertedPrice(basePriceGBDO * rateAgainstGBDO);
  }, [basePriceGBDO, selectedCurrency, exchangeData]);

  useEffect(() => {
    const tokenSymbol =
      paymentMethod === "cash"
        ? null
        : cryptoType === "native"
        ? "GBDO"
        : selectedStablecoin;

    store.setField("quantity", quantity);
    store.setField("tokenSymbol", tokenSymbol || "");
    store.setField("estimatedTotal", (convertedPrice * quantity).toString());
    store.setField("estimatedEscrow", ((convertedPrice * quantity) / 2).toString());
    store.setField("paymentMethod", paymentMethod === "cash" ? "cash" : cryptoType);
  }, [quantity, selectedCurrency, convertedPrice, paymentMethod, cryptoType, selectedStablecoin]);


  const deliveryDays =
    itemAsset.baseDays + (quantity - 1) * Number(itemAsset.perUnitDelay);

  

  return (
    <div className="bg-base-100 rounded-xl shadow-md p-4 flex flex-col space-y-4">
      {galleryImages.length > 0 && (
        <img
          src={imageSrc}
          alt="..."
          onMouseEnter={() => setImageSrc(variantImages.hover)}
          onMouseLeave={() => setImageSrc(variantImages.main)}
          onClick={() => setModalOpen(true)}
          className="rounded-lg h-50 object-cover transition-transform duration-200 hover:scale-105 cursor-pointer"
        />
      )}


      <div className="flex items-center justify-between gap-4">
        {/* Title and Model */}
        <div>
          <h3 className="text-md font-light">{metadata.name}</h3>
          <p className="text-xs text-info-400">{metadata.model}</p>
        </div>

        {/* Description Button */}
        <button
          onClick={() => setDescriptionModalOpen(true)}
          className="btn btn-ghost border-none outline-none btn-sm text-info hover:bg-base-300"
        >
          Description ▸
        </button>
      </div>

      <p className="flex items-baseline gap-1">
        <img
          src="/globalw.png"
          className="w-3 h-3 ml-3 opacity-80 mt-2"
        />
        <span className="text-lg font-light">
          {rawBasePriceGBDO.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>

      </p>

      {/* Quantity Controls */}
      <div className="flex justify-center items-center gap-2">
        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="btn btn-xs">–</button>
        <span className="font-medium">{quantity}</span>
        <button onClick={() => setQuantity(q => q + 1)} className="btn btn-xs">+</button>
      </div>

      {/* Checkout Button */}
      <div className="mt-6 w-full">
        <button
          className="btn bg-white/5 text-white font-light text-xs rounded-md w-full py-3 hover:bg-secondary/30 transition-all"
          onClick={() => {
            useCheckoutStore.getState().setField("asset", {
              id: itemAsset.assetId,
              name: metadata.name ?? "Unnamed Asset",
              metadataCID: metadata.altImage ?? metadata.image ?? "",
              basePriceInGBDO: BigInt(itemAsset.basePriceInGBDO ?? 0),
              baseDays: itemAsset.baseDays,
              perUnitDelay: Number(itemAsset.perUnitDelay ?? "0"),
              variant: itemAsset.variant,
            });

            setBuyModalOpen(true);
          }}
        >
          CHECKOUT
        </button>
      </div>


      {/* Description Modal */}
      {descriptionModalOpen && (
        <DModal isOpen={modalOpen} onClose={() => setDescriptionModalOpen(false)}>
          <div className="max-h-200 max-w-400 overflow-y-auto whitespace-pre-line text-sm mb-8 px-1">
            {(metadata.description || "")
              .split("|||")
              .map((para, idx) => (
                <p key={idx} className="mb-3">{para}</p>
              ))}
          </div>
        </DModal>
      )}

      {/* Checkout Modal */}
      {buyModalOpen && (
        <CheckoutModal
          isOpen={buyModalOpen} 
          selectedCurrency={selectedCurrency}
          variationGroups={variationGroups}
          selectedVariations={selectedVariations}
          setSelectedVariations={setSelectedVariations}
          onClose={() => {
            setBuyModalOpen(false);
            resetForm();
          }}
          openWalletModal={() => setWalletModalOpen(true)}
        />
      )}

      {/* Wallet Modal — render independently */}
      {walletModalOpen && (
        <GlobalWalletModal
          isOpen={walletModalOpen}
          onClose={() => setWalletModalOpen(false)}
        />
      )}

      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={metadata.name}>
          <div className="flex h-[70vh] gap-4">
            {/* Left Panel: Thumbnails */}
            <div className="w-1/4 overflow-y-auto pr-2 border-r border-base-300">
              {galleryImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Asset ${idx + 1}`}
                  className={`mb-3 w-full h-24 object-cover rounded-md cursor-pointer hover:scale-105 transition ${
                    img === imageSrc ? "ring ring-info" : ""
                  }`}
                  onClick={() => setImageSrc(img)}
                />
              ))}
            </div>

            {/* Right Panel: Selected Image */}
            <div className="flex-grow flex items-center justify-center p-4">
              <img
                src={imageSrc}
                alt="Selected Preview"
                className="max-w-full max-h-full rounded-lg transition-transform duration-300 hover:scale-105"
              />
            </div>
          </div>
        </Modal>
      )}

      <p className="text-sm text-light text-gray-500 text-center">
        Lead Time: {deliveryDays} day{deliveryDays === 1 ? "" : "s"}
      </p>
    </div>
  );
};
