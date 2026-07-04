import type { Lead } from "../types/platform";
import type { PlatformProject } from "../types/platform";
import type { TimesheetEntry } from "../types/timesheet";
import type { Variation } from "../types/variation";
import type { MaintenanceTicket } from "../types/maintenance";

export interface AnalyticsMetrics {
  leadsBySource: Record<string, number>;
  hotLeads: number;
  conversionRate: number;
  activeProjectCount: number;
  approvedHoursThisWeek: number;
  labourVarianceByProject: Record<string, { estimated: number; actual: number; variance: number }>;
  pendingVariations: number;
  maintenanceTickets: number;
  completedProjects: number;
  avgManufacturingLeadTime: number;
}

export function calculateAnalytics(
  leads: Lead[],
  projects: PlatformProject[],
  timesheets: TimesheetEntry[],
  variations: Variation[],
  maintenanceTickets: MaintenanceTicket[]
): AnalyticsMetrics {
  const leadsBySource = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.source] = (acc[l.source] || 0) + 1;
    return acc;
  }, {});

  const hotLeads = leads.filter((l) => l.temperature === "hot").length;
  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.status === "won").length;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  const activeProjectCount = projects.filter(
    (p) => p.currentStage !== "completed"
  ).length;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const approvedHoursThisWeek = timesheets
    .filter((t) => t.status === "approved" && new Date(t.date) >= weekStart)
    .reduce((sum, t) => sum + t.totalHours, 0);

  const labourVarianceByProject = projects.reduce<Record<string, { estimated: number; actual: number; variance: number }>>(
    (acc, p) => {
      acc[p.projectName] = {
        estimated: p.estimatedLabourHours,
        actual: p.actualLabourHours,
        variance: p.actualLabourHours - p.estimatedLabourHours,
      };
      return acc;
    },
    {}
  );

  const pendingVariations = variations.filter(
    (v) => v.status === "draft" || v.status === "sent"
  ).length;

  const maintenanceTicketsCount = maintenanceTickets.filter(
    (t) => t.status !== "completed" && t.status !== "closed"
  ).length;

  const completedProjects = projects.filter(
    (p) => p.currentStage === "completed"
  ).length;

  const avgManufacturingLeadTime = 14;

  return {
    leadsBySource,
    hotLeads,
    conversionRate,
    activeProjectCount,
    approvedHoursThisWeek,
    labourVarianceByProject,
    pendingVariations,
    maintenanceTickets: maintenanceTicketsCount,
    completedProjects,
    avgManufacturingLeadTime,
  };
}
