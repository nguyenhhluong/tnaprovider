export type LeadStatus = "new" | "contacted" | "site_visit_booked" | "quoted" | "won" | "lost";
export type LeadTemperature = "hot" | "warm" | "cold";
export type LeadSource = "website" | "referral" | "phone" | "social_media" | "walk_in" | "other";

export interface Lead {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  temperature: LeadTemperature;
  score: number;
  notes?: string;
  nextAction?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStage =
  | "enquiry"
  | "quoted"
  | "approved"
  | "design"
  | "manufacture"
  | "install"
  | "defects"
  | "completed";

export interface PlatformProject {
  id: string;
  client: string;
  projectName: string;
  location: string;
  projectManager: string;
  deadline: string;
  progress: number;
  estimatedLabourHours: number;
  actualLabourHours: number;
  estimatedLabourCost: number;
  actualLabourCost: number;
  openVariations: number;
  pendingApprovals: number;
  currentStage: ProjectStage;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformWorker {
  id: string;
  name: string;
  role: string;
  payRate: number;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: "lead" | "timesheet" | "project" | "variation" | "maintenance" | "review";
  action: string;
  description: string;
  timestamp: string;
  userId?: string;
}

export interface DashboardMetrics {
  newLeadsThisWeek: number;
  hotLeads: number;
  activeProjects: number;
  pendingTimesheets: number;
  pendingVariations: number;
  maintenanceRequests: number;
  revenuePipeline: number;
  currentManufacturingLeadTime: number;
  approvedHoursThisWeek: number;
}
