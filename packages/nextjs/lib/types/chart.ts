export type TPairInfo = {
  base: string;
  market: string;
  quote: string;
};

export type TTick = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  t: number; // timestamp in ms
  o: string;
  h: string;
  l: string;
  c: string;
};

