// types/charts.ts
export interface ProjectData {
  name: string;
  symbol: string;
  currentValue: number;
  projectedValue: number;
  userShare: number;
  nextDistribution?: string;
  termLength?: number;
  userBalance: number;
}
