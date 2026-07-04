export type ProjectType =
  | "Kitchen joinery"
  | "Retail fitout"
  | "Hospitality fitout"
  | "Office fitout"
  | "Medical fitout"
  | "Custom joinery"
  | "Shopfitting"
  | "Commercial construction";

export type TimelineProjectSize = "Small" | "Medium" | "Large" | "Extra Large";

export type MaterialGrade = "Budget" | "Premium" | "Luxury";

export type SiteAccessDifficulty = "Easy" | "Moderate" | "Difficult";

export interface TimelineInput {
  projectType: ProjectType | "";
  projectSize: TimelineProjectSize | "";
  hasDrawings: boolean;
  needsCouncilApproval: boolean;
  materialGrade: MaterialGrade | "";
  desiredCompletionDate: string;
  siteAccessDifficulty: SiteAccessDifficulty | "";
  afterHoursRequired: boolean;
}

export interface TimelineStage {
  name: string;
  durationWeeks: number;
  startDate: string;
  endDate: string;
}

export interface TimelineResult {
  stages: TimelineStage[];
  estimatedStartDate: string;
  estimatedHandoverDate: string;
  totalDurationWeeks: number;
  warning: string | null;
}
