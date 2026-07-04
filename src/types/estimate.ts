export type ProjectType =
  | "Kitchen joinery"
  | "Retail fitout"
  | "Hospitality fitout"
  | "Office fitout"
  | "Medical fitout"
  | "Custom joinery"
  | "Shopfitting"
  | "Commercial construction";

export type MaterialGrade = "Budget" | "Premium" | "Luxury";

export type Complexity = "Simple" | "Standard" | "Complex" | "High-end architectural";

export type Sector = "Residential" | "Retail" | "Hospitality" | "Medical" | "Office" | "Industrial";

export interface EstimateInput {
  projectType: ProjectType | "";
  sector: Sector | "";
  projectSize: string;
  materialGrade: MaterialGrade | "";
  complexity: Complexity | "";
  location: string;
  desiredStartDate: string;
  name: string;
  email: string;
  phone: string;
}

export interface EstimateResult {
  lowPrice: number;
  highPrice: number;
  timelineHint: string;
  leadTemperature: "cold" | "warm" | "hot";
}
