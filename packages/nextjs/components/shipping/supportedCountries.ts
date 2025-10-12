import { Region } from "~~/components/shipping/shippingRates";

export type Country = {
  code: string;
  name: string;
  region: Region; 
};

export const supportedCountries: Country[] = [
  // North America
  { code: "US", name: "United States", region: Region.NorthAmerica }, 
  { code: "CA", name: "Canada", region: Region.NorthAmerica },
  { code: "MX", name: "Mexico", region: Region.NorthAmerica },
  // Caribbean islands
  { code: "BS", name: "Bahamas", region: Region.NorthAmerica },
  { code: "JM", name: "Jamaica", region: Region.NorthAmerica },
  { code: "HT", name: "Haiti", region: Region.NorthAmerica },
  // South America
  { code: "BR", name: "Brazil", region: Region.SouthAmerica },
  { code: "AR", name: "Argentina", region: Region.SouthAmerica },
  { code: "CL", name: "Chile", region: Region.SouthAmerica },
  // Europe
  { code: "DE", name: "Germany", region: Region.Europe },
  { code: "FR", name: "France", region: Region.Europe },
  { code: "IT", name: "Italy", region: Region.Europe },
  // UK & Ireland
  { code: "GB", name: "United Kingdom", region: Region.UKIreland },
  { code: "IE", name: "Ireland", region: Region.UKIreland },
  // Asia-Pacific (exclude China & Australia)
  { code: "IN", name: "India", region: Region.AsiaPacific },
  { code: "SG", name: "Singapore", region: Region.AsiaPacific },
  { code: "MY", name: "Malaysia", region: Region.AsiaPacific },
  // China distinct
  { code: "CN", name: "China", region: Region.China },
  // Australia / New Zealand
  { code: "AU", name: "Australia", region: Region.AustraliaNZ },
  { code: "NZ", name: "New Zealand", region: Region.AustraliaNZ },
  // Middle East
  { code: "AE", name: "United Arab Emirates", region: Region.MiddleEast },
  { code: "SA", name: "Saudi Arabia", region: Region.MiddleEast },
  { code: "IL", name: "Israel", region: Region.MiddleEast },
  // Africa
  { code: "ZA", name: "South Africa", region: Region.Africa },
  { code: "NG", name: "Nigeria", region: Region.Africa },
  { code: "EG", name: "Egypt", region: Region.Africa },

  // Islands & territories
  { code: "WS", name: "Samoa", region: Region.AsiaPacific },
  { code: "FJ", name: "Fiji", region: Region.AsiaPacific },
  { code: "BB", name: "Barbados", region: Region.NorthAmerica },
  { code: "LC", name: "Saint Lucia", region: Region.NorthAmerica },
  { code: "VC", name: "Saint Vincent and the Grenadines", region: Region.NorthAmerica },
];
