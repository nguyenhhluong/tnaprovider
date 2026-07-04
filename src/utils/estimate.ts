import type { EstimateInput, EstimateResult, ProjectType, MaterialGrade, Complexity } from "../types/estimate";
import { scoreLead } from "./leadScoring";

const BASE_RATES: Record<ProjectType, { low: number; high: number }> = {
  "Kitchen joinery": { low: 15000, high: 40000 },
  "Retail fitout": { low: 30000, high: 80000 },
  "Hospitality fitout": { low: 40000, high: 120000 },
  "Office fitout": { low: 25000, high: 75000 },
  "Medical fitout": { low: 50000, high: 150000 },
  "Custom joinery": { low: 10000, high: 35000 },
  "Shopfitting": { low: 35000, high: 90000 },
  "Commercial construction": { low: 60000, high: 200000 },
};

const MATERIAL_MULTIPLIER: Record<MaterialGrade, number> = {
  "Budget": 0.8,
  "Premium": 1.0,
  "Luxury": 1.4,
};

const COMPLEXITY_MULTIPLIER: Record<Complexity, number> = {
  "Simple": 0.85,
  "Standard": 1.0,
  "Complex": 1.25,
  "High-end architectural": 1.5,
};

const SIZE_MULTIPLIER: Record<string, number> = {
  "Small": 0.7,
  "Medium": 1.0,
  "Large": 1.4,
  "Extra Large": 2.0,
};

const SECTOR_MULTIPLIER: Record<string, number> = {
  "Residential": 0.9,
  "Retail": 1.0,
  "Hospitality": 1.15,
  "Medical": 1.2,
  "Office": 1.0,
  "Industrial": 1.1,
};

function getTimelineHint(projectType: ProjectType, complexity: Complexity): string {
  if (complexity === "High-end architectural" || complexity === "Complex") {
    return "8–16 weeks depending on approvals";
  }
  if (complexity === "Standard") {
    return "4–10 weeks typical";
  }
  return "2–6 weeks typical";
}

export function calculateEstimate(input: EstimateInput): EstimateResult {
  const baseRate = BASE_RATES[input.projectType as ProjectType] || { low: 10000, high: 30000 };
  const materialMult = MATERIAL_MULTIPLIER[input.materialGrade as MaterialGrade] || 1;
  const complexityMult = COMPLEXITY_MULTIPLIER[input.complexity as Complexity] || 1;
  const sizeMult = SIZE_MULTIPLIER[input.projectSize] || 1;
  const sectorMult = SECTOR_MULTIPLIER[input.sector] || 1;

  const combinedMult = materialMult * complexityMult * sizeMult * sectorMult;

  let lowPrice = Math.round(baseRate.low * combinedMult);
  let highPrice = Math.round(baseRate.high * combinedMult);

  if (lowPrice < 0) lowPrice = 0;
  if (highPrice < 0) highPrice = 0;

  if (lowPrice > highPrice) {
    lowPrice = Math.round(highPrice * 0.9);
  }

  const timelineHint = getTimelineHint(input.projectType as ProjectType, input.complexity as Complexity);

  const nameParts = input.name.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");

  const leadScoreResult = scoreLead({
    source: "cost-estimator",
    firstName,
    lastName,
    email: input.email,
    phone: input.phone,
    projectType: input.projectType,
    location: input.location,
    targetDate: input.desiredStartDate,
    budget: `${lowPrice}-${highPrice}`,
    message: `${input.projectSize} ${input.materialGrade} ${input.complexity}`,
    uploadedFiles: [],
    score: 0,
    temperature: "cold",
    status: "new",
    createdAt: new Date().toISOString(),
  });

  return { lowPrice, highPrice, timelineHint, leadTemperature: leadScoreResult.temperature };
}
