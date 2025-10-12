export type AssetSummary = {
  assetId: number;
  basePriceInGBDO: BigInt;
  baseDays: number;
  perUnitDelay: number;
  name: string;
  model?: string;
  description?: string;
  image?: string;
  altImage?: string;
};
