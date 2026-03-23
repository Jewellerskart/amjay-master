export type MetalData = {
  state: string;
  TenGram24K?: number;
  updatedAt: string;
  OneGramPrice: number;
  HundredGm?: number;
};
export type TMetalData = {
  currentPage?: number;
};
export type LiveRateApiResponse = {
  date: {
    Gold: MetalData;
    Silver: MetalData;
  };
};
