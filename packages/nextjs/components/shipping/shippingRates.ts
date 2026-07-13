// types/shippingRates.ts

export type ShippingCategory = "standard" | "heavy";

export enum Region {
    NorthAmerica,  // 0
    SouthAmerica,  // 1
    Europe,        // 2
    UKIreland,     // 3
    AsiaPacific,   // 4
    China,         // 5
    AustraliaNZ,   // 6
    MiddleEast,    // 7
    Africa         // 8
}

export interface ShippingRate {
  region: Region;
  category: ShippingCategory;
  Rate: number;
  notes?: string;
}

export const shippingRates: ShippingRate[] = [
  {
    region: Region.NorthAmerica,
    category: "standard",
    Rate: 180,
    notes: "Includes domestic US, CA, MX, and Caribbean territories."
  },
  {
    region: Region.NorthAmerica,
    category: "heavy",
    Rate: 450,
    notes: "Applies to standard over-land LTL and island air-freight pallets."
  },
  {
    region: Region.SouthAmerica,
    category: "standard",
    Rate: 250,
  },
  {
    region: Region.SouthAmerica,
    category: "heavy",
    Rate: 650,
  },
  {
    region: Region.Europe,
    category: "standard",
    Rate: 220,
  },
  {
    region: Region.Europe,
    category: "heavy",
    Rate: 600,
    notes: "Check active local carrier service advisories for Eastern Europe destinations."
  },
  {
    region: Region.UKIreland,
    category: "standard",
    Rate: 230,
    notes: "Covers UK mainland, Ireland, and Crown dependencies (Jersey, Guernsey, Man)."
  },
  {
    region: Region.UKIreland,
    category: "heavy",
    Rate: 620,
  },
  {
    region: Region.AsiaPacific,
    category: "standard",
    Rate: 260,
  },
  {
    region: Region.AsiaPacific,
    category: "heavy",
    Rate: 700,
  },
  {
    region: Region.China,
    category: "standard",
    Rate: 210,
    notes: "Includes mainland China, Hong Kong, and Macao hubs."
  },
  {
    region: Region.China,
    category: "heavy",
    Rate: 580,
  },
  {
    region: Region.AustraliaNZ,
    category: "standard",
    Rate: 280,
    notes: "Covers AU, NZ, and all isolated Oceania/Polynesian territories."
  },
  {
    region: Region.AustraliaNZ,
    category: "heavy",
    Rate: 750,
  },
  {
    region: Region.MiddleEast,
    category: "standard",
    Rate: 300,
  },
  {
    region: Region.MiddleEast,
    category: "heavy",
    Rate: 800,
  },
  {
    region: Region.Africa,
    category: "standard",
    Rate: 350,
  },
  {
    region: Region.Africa,
    category: "heavy",
    Rate: 900,
    notes: "Extended delivery times may apply for remote interior regions."
  }
];