import type { Lead, LeadScoreResult, LeadTemperature } from "../types/lead";

const COMMERCIAL_PROJECTS = new Set([
  "Retail fitout",
  "Hospitality fitout",
  "Office fitout",
  "Medical fitout",
  "Custom joinery",
  "Shopfitting",
  "Commercial construction",
]);

export function scoreLead(input: Partial<Lead>): LeadScoreResult {
  let score = 0;

  if (input.uploadedFiles && input.uploadedFiles.length > 0) {
    score += 20;
  }

  if (input.phone && input.phone.trim().length > 0) {
    score += 15;
  }

  if (input.budget && input.budget.trim().length > 0) {
    score += 15;
  }

  if (input.targetDate && input.targetDate.trim().length > 0) {
    score += 10;
  }

  if (input.tenderDeadline && input.tenderDeadline.trim().length > 0) {
    score += 10;
  }

  if (
    input.projectType &&
    COMMERCIAL_PROJECTS.has(input.projectType)
  ) {
    score += 10;
  }

  if (input.email && input.email.trim().length > 0) {
    score += 5;
  }

  if (input.company && input.company.trim().length > 0) {
    score += 5;
  }

  if (input.location && input.location.trim().length > 0) {
    score += 5;
  }

  if (input.message && input.message.trim().length > 5) {
    score += 5;
  }

  if (
    input.firstName &&
    input.firstName.trim().length > 0 &&
    input.lastName &&
    input.lastName.trim().length > 0
  ) {
    score += 5;
  }

  score = Math.max(0, Math.min(100, score));

  let temperature: LeadTemperature;
  if (score >= 70) {
    temperature = "hot";
  } else if (score >= 40) {
    temperature = "warm";
  } else {
    temperature = "cold";
  }

  return { score, temperature };
}
