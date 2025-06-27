"use client";
import { useState, useEffect, useMemo } from "react";
import CheckoutModal from "~~/components/checkoutModal";
import { useCheckoutStore } from "~~/components/useCheckoutStore";
import { exchangeRates } from "~~/lib/exchangeRates";
import { Modal } from "~~/components/common/descriptionModal"

type AssetVariation = {
  label: string;
  apriceInUSD: bigint;
};

type Props = {
  data: {
    asset: {
      assetId: number;
      basePriceInUSD: number;
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


export const AssetCard = ({ data }: Props) => {
  const { asset: itemAsset, metadata } = data;

  const fiatToStablecoin: Record<string, string> = {
    USD: "USDC", AED: "XAED", AUD: "AUDT", BRL: "BRZ", CAD: "QCAD", CHF: "XCHF",
    CNY: "CNH₮", DAI: "DAI", EUR: "EURC", FDUSD: "FDUSD", FRAX: "FRAX", GBP: "GBPT",
    GUSD: "GUSD", INR: "XINR", JPY: "JPYC", KRW: "KRT", MXN: "MMXN", PYUSD: "PYUSD",
    SGD: "XSGD", TUSD: "TUSD", USDP: "USDP", USDT: "USDT", ZAR: "XZAR",
  };

  const allVariationGroups: Record<"eseries" | "xseries", Record<string, AssetVariation[]>> = {
    eseries: {
      epanel: [
        { label: "Split Phase @60Hz", apriceInUSD: BigInt(0) },
        { label: "Customized", apriceInUSD: BigInt(1_000_000_000) },
      ],
      monitoring: [
        { label: "No Monitoring", apriceInUSD: BigInt(0) },
        { label: "Monitoring", apriceInUSD: BigInt(2_000_000_000) },
      ],
      etie: [
        { label: "Stand Alone", apriceInUSD: BigInt(0) },
        { label: "Grid Tie", apriceInUSD: BigInt(1_000_000_000) },
      ],
    },
    xseries: {
      xpanel: [
        { label: "600v 3 Phase @60Hz", apriceInUSD: BigInt(0) },
        { label: "Customized", apriceInUSD: BigInt(5_000_000_000) },
      ],
      monitoring: [
        { label: "No Monitoring", apriceInUSD: BigInt(0) },
        { label: "Monitoring", apriceInUSD: BigInt(2_000_000_000) },
      ],
      xtie: [
        { label: "Stand Alone", apriceInUSD: BigInt(0) },
        { label: "Grid Tie", apriceInUSD: BigInt(5_000_000_000) },
      ],
    },
  };

  const variationGroups = allVariationGroups[itemAsset.variant];
  const fiatCurrencyList = Object.keys(fiatToStablecoin);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, AssetVariation>>({});
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [convertedPrice, setConvertedPrice] = useState(0);
  const [imageSrc, setImageSrc] = useState(metadata.image);
  const [quantity, setQuantity] = useState(1);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{ assetId: number; name: string } | null>(null);
  const altImage = metadata.altImage || metadata.image;
  const setField = useCheckoutStore(state => state.setField);

  useEffect(() => {
    const initial: Record<string, AssetVariation> = {};
    Object.entries(variationGroups).forEach(([key, options]) => {
      initial[key] = options[0];
    });
    setSelectedVariations(initial);
  }, [itemAsset.variant]);

  const basePriceUSD = useMemo(() => {
    const variationTotal = Object.values(selectedVariations).reduce(
      (sum, v) => sum + v.apriceInUSD,
      BigInt(0)
    );
    return Number(BigInt(itemAsset.basePriceInUSD) + variationTotal) / 1e6;
  }, [itemAsset.basePriceInUSD, selectedVariations]);

  useEffect(() => {
    const rate = exchangeRates[selectedCurrency] || 1;
    setConvertedPrice(basePriceUSD * rate);
  }, [basePriceUSD, selectedCurrency]);

  useEffect(() => {
    const stablecoin = fiatToStablecoin[selectedCurrency] || selectedCurrency;
    setField("asset", {
      id: itemAsset.assetId,
      name: metadata.name || "",
      metadataCID: metadata.image || "",
      priceInUSD: itemAsset.basePriceInUSD,
    });
    setField("quantity", quantity);
    setField("tokenSymbol", stablecoin);
    setField("estimatedTotal", (convertedPrice * quantity).toString());
    setField("estimatedEscrow", ((convertedPrice * quantity) / 2).toString());
  }, [itemAsset.assetId, itemAsset.basePriceInUSD, metadata, quantity, selectedCurrency, convertedPrice]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const currency = e.target.value;
    setSelectedCurrency(currency);
  };


  const totalDays =
    itemAsset.baseDays + (quantity - 1) * Number(itemAsset.perUnitDelay);

  const variationDisplayLabels: Record<string, string> = {
    epanel: "Panel Configuration",
    xpanel: "Panel Configuration",
    monitoring: "Remote Monitoring",
    etie: "Grid Integration",
    xtie: "Grid Integration",
  };

  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);



  return (
    
    <div className="bg-base-100 rounded-xl shadow-md p-4 flex flex-col">
      {metadata.image && (
        <img
          src={`https://ipfs.io/ipfs/${imageSrc}`}
          className="rounded-lg mb-3 h-40 object-cover transition duration-200 hover:scale-105"
          onMouseEnter={() => setImageSrc(altImage)}
          onMouseLeave={() => setImageSrc(metadata.image)}
          alt={metadata.name || "Asset image"}
        />
      )}

      <h3 className="text-lg font-light mb-0">{metadata.name}</h3>
      <p className="text-sm text-info-400 mt-0">{metadata.model}</p>

      <button
        onClick={() => setDescriptionModalOpen(true)}
        className="btn btn-ghost btn-sm w-fit self-end text-info-500 hover:bg-base-300"
      >
        Description
      </button>


      {Object.entries(variationGroups).map(([groupKey, options]) => (
        <div key={groupKey}>
          <h3 className="text-sm mt-6 font-light text-info-400">
            {variationDisplayLabels[groupKey] || groupKey.toUpperCase()}
          </h3>
          <div className="flex rounded-md mt-3 overflow-hidden border-none w-full mb-4">
            {options.map(option => (
              <button
                key={option.label}
                onClick={() =>
                  setSelectedVariations(prev => ({ ...prev, [groupKey]: option }))
                }
                className={`flex-1 px-3 py-1 text-sm mx-2 font-medium transition-colors duration-200 ${
                  selectedVariations[groupKey]?.label === option.label
                    ? "bg-secondary-content rounded text-info-500"
                    : "bg-secondary text-info-500 rounded hover:bg-neutral-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <p className="text-md mt-10 font-medium mb-3">
        {convertedPrice.toFixed(2)} {selectedCurrency}
      </p>

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setQuantity(q => Math.max(1, q - 1))}
          className="btn btn-xs"
        >
          –
        </button>
        <span className="font-medium">{quantity}</span>
        <button
          onClick={() => setQuantity(q => q + 1)}
          className="btn btn-xs"
        >
          +
        </button>
      </div>

      <select
        className="select select-bordered w-full my-2"
        value={selectedCurrency}
        onChange={handleCurrencyChange}
      >
        {fiatCurrencyList.map(currency => (
          <option key={currency} value={currency}>
            Pay in {currency} ({fiatToStablecoin[currency] || "Stablecoin"})
          </option>
        ))}
      </select>

      <button
        className="btn btn-secondary w-full"
        onClick={() => {
          setSelectedAsset({
            assetId: itemAsset.assetId,
            name: metadata.name || "Unnamed Asset",
          });
          setBuyModalOpen(true);
        }}
      >
        Checkout
      </button>

      {buyModalOpen && selectedAsset && (
        <CheckoutModal
          asset={selectedAsset}
          selectedCurrency={selectedCurrency}
          onClose={() => setBuyModalOpen(false)}
        />
      )}
      {descriptionModalOpen && (
        <Modal title="Product Description" onClose={() => setDescriptionModalOpen(false)}>
          <div className="max-h-96 overflow-y-auto whitespace-pre-line text-sm px-1">
            {(metadata.description || "")
              .split("|||")
              .map((para, idx) => (
                <p key={idx} className="mb-3">{para}</p>
              ))}
          </div>
        </Modal>
      )}


      <p className="text-xs text-gray-500 mb-2">Lead Time {totalDays} days</p>
    </div>
  );
};
