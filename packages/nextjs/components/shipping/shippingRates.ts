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
    region: 0,
    category: "standard",
    Rate: 180,
  },
  {
    region: 0,
    category: "heavy",
    Rate: 450,
  },
  {
    region: 1,
    category: "standard",
    Rate: 250,
  },
  {
    region: 1,
    category: "heavy",
    Rate: 650,
  },
  {
    region: 2,
    category: "standard",
    Rate: 220,
  },
  {
    region: 2,
    category: "heavy",
    Rate: 600,
  },
  {
    region: 3,
    category: "standard",
    Rate: 230,
  },
  {
    region: 3,
    category: "heavy",
    Rate: 620,
  },
  {
    region: 4,
    category: "standard",
    Rate: 260,
  },
  {
    region: 4,
    category: "heavy",
    Rate: 700,
  },
  {
    region: 5,
    category: "standard",
    Rate: 210,
  },
  {
    region: 5,
    category: "heavy",
    Rate: 580,
  },
  {
    region: 6,
    category: "standard",
    Rate: 280,
  },
  {
    region: 6,
    category: "heavy",
    Rate: 750,
  },
  {
    region: 7,
    category: "standard",
    Rate: 300,
  },
  {
    region: 7,
    category: "heavy",
    Rate: 800,
  },
  {
    region: 8,
    category: "standard",
    Rate: 350,
  },
  {
    region: 8,
    category: "heavy",
    Rate: 900,
  },
];
