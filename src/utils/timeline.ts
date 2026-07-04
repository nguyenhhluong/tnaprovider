import type { TimelineInput, TimelineResult, TimelineStage, ProjectType, SiteAccessDifficulty, MaterialGrade, TimelineProjectSize } from "../types/timeline";

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getBaseDurations(projectType: ProjectType): number[] {
  const map: Record<ProjectType, number[]> = {
    "Kitchen joinery": [1, 1, 2, 1, 2, 3, 1, 2, 1],
    "Retail fitout": [1, 1, 2, 2, 2, 4, 1, 3, 1],
    "Hospitality fitout": [1, 1, 3, 2, 3, 5, 1, 4, 1],
    "Office fitout": [1, 1, 2, 1, 2, 3, 1, 3, 1],
    "Medical fitout": [1, 1, 3, 3, 3, 5, 2, 4, 1],
    "Custom joinery": [1, 1, 2, 1, 2, 3, 1, 2, 1],
    "Shopfitting": [1, 1, 2, 2, 2, 4, 1, 3, 1],
    "Commercial construction": [1, 2, 4, 4, 4, 6, 2, 5, 2],
  };
  return map[projectType] || [1, 1, 2, 1, 2, 3, 1, 2, 1];
}

const STAGE_NAMES = [
  "Consultation",
  "Measure-up",
  "Design & documentation",
  "Approvals",
  "Material procurement",
  "Manufacture",
  "Site preparation",
  "Installation",
  "Defects and handover",
];

const SIZE_MULTIPLIER: Record<TimelineProjectSize, number> = {
  "Small": 0.8,
  "Medium": 1.0,
  "Large": 1.3,
  "Extra Large": 1.6,
};

const ACCESS_MULTIPLIER: Record<SiteAccessDifficulty, number> = {
  "Easy": 1.0,
  "Moderate": 1.15,
  "Difficult": 1.3,
};

const MATERIAL_MULTIPLIER: Record<MaterialGrade, number> = {
  "Budget": 0.85,
  "Premium": 1.0,
  "Luxury": 1.2,
};

export function predictTimeline(input: TimelineInput): TimelineResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let desiredDate: Date | null = null;
  let warning: string | null = null;

  if (input.desiredCompletionDate) {
    desiredDate = new Date(input.desiredCompletionDate + "T00:00:00");
    if (isNaN(desiredDate.getTime())) {
      desiredDate = null;
    } else if (desiredDate <= today) {
      warning = "The desired completion date has already passed. Please select a future date.";
      desiredDate = null;
    }
  }

  const baseDurations = getBaseDurations(input.projectType as ProjectType);
  const sizeMult = SIZE_MULTIPLIER[input.projectSize as TimelineProjectSize] || 1;
  const accessMult = ACCESS_MULTIPLIER[input.siteAccessDifficulty as SiteAccessDifficulty] || 1;
  const materialMult = MATERIAL_MULTIPLIER[input.materialGrade as MaterialGrade] || 1;

  const combinedMult = sizeMult * accessMult * materialMult;

  const durations = baseDurations.map(d => Math.round(d * combinedMult * 10) / 10);

  if (input.needsCouncilApproval) {
    durations[3] += 4;
  }

  if (!input.hasDrawings) {
    durations[2] += 3;
  }

  if (input.afterHoursRequired) {
    warning = warning || "After-hours work will be scheduled outside standard business hours.";
  }

  let currentDate = new Date(today);
  currentDate.setDate(currentDate.getDate() + 14);

  const stages: TimelineStage[] = durations.map((weeks, i) => {
    const stageStart = new Date(currentDate);
    const stageEnd = addWeeks(currentDate, weeks);
    const stage: TimelineStage = {
      name: STAGE_NAMES[i],
      durationWeeks: weeks,
      startDate: formatDate(stageStart),
      endDate: formatDate(stageEnd),
    };
    currentDate = new Date(stageEnd);
    return stage;
  });

  const estimatedStartDate = stages[0].startDate;
  const estimatedHandoverDate = stages[stages.length - 1].endDate;
  const totalDurationWeeks = durations.reduce((sum, d) => sum + d, 0);

  if (desiredDate && currentDate > desiredDate) {
    warning = (warning ? warning + " " : "") +
      "The desired completion date may be unrealistic given the current project parameters. Consider starting earlier or adjusting scope.";
  }

  return {
    stages,
    estimatedStartDate,
    estimatedHandoverDate,
    totalDurationWeeks: Math.round(totalDurationWeeks * 10) / 10,
    warning,
  };
}
