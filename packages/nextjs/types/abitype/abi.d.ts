import "abitype";
import "~~/node_modules/viem/node_modules/abitype";

type AddressType = string;

declare module "abitype" {
  export interface Register {
    AddressType: AddressType;
  }
}

declare module "~~/node_modules/viem/node_modules/abitype" {
  export interface Register {
    AddressType: AddressType;
  }
}

export interface Asset {
  name: string;
  priceInGBDO: bigint;
  metadataCID: string;
  baseDays: number;
  perUnitDelay: number;
  active: boolean;
}

export interface AssetOnChain {
  name: string;
  priceInGBDO: bigint;
  metadataCID: string;
  active: boolean;
  baseDays: number;
  perUnitDelay: number;
}

export interface MetadataFromIPFS {
  name?: string;
  description?: string;
  image?: string;
  [key: string]: unknown;
}

export interface AssetFullView {
  assetId: number;
  asset: AssetOnChain;
  metadata: MetadataFromIPFS;
}


