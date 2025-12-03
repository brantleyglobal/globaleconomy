// types/charts.ts
export interface ProjectData {
  name: string;
  symbol: string;
  currentValue: number;
  projectedValue: number;
  userShare: number;
  nextDistribution?: string;
  projectedGrowthRate: number; // make this consistently required OR optional
  termLength?: number;
  userBalance: number;
}
