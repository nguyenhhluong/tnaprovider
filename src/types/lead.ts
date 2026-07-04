export type LeadSource =
  | "contact"
  | "cost-estimator"
  | "booking"
  | "tender-upload"
  | "timeline-predictor"
  | "request-similar-project"
  | "moodboard";

export type LeadTemperature = "cold" | "warm" | "hot";

export interface Lead {
  source: LeadSource;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  projectType: string;
  location: string;
  budget: string;
  targetDate: string;
  tenderDeadline: string;
  message: string;
  uploadedFiles: string[];
  score: number;
  temperature: LeadTemperature;
  status: string;
  createdAt: string;
}

export interface LeadScoreResult {
  score: number;
  temperature: LeadTemperature;
}
