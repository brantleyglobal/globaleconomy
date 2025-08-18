export type AssetSummary = {
  assetId: number;
  basePriceInGBDO: BigInt;
  baseDays: number;
  perUnitDelay: number;
  name: string;              // from metadata
  model?: string;
  description?: string;
  image?: string;
  altImage?: string;
};
