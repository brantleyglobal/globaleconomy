export type AssetSummary = {
  assetId: number;
  basePriceInGBDo: BigInt;
  baseDays: number;
  perUnitDelay: number;
  name: string;
  model?: string;
  description?: string;
  image?: string;
  altImage?: string;
};
