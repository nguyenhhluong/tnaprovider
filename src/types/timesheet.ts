export type WorkType =
  | "factory"
  | "site_install"
  | "delivery"
  | "measure_up"
  | "rectification"
  | "admin"
  | "other";

export type TimesheetStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export interface TimesheetEntry {
  id: string;
  workerId: string;
  workerName: string;
  projectId: string;
  projectName: string;
  date: string;
  startTime: string;
  finishTime: string;
  breakMinutes: number;
  totalHours: number;
  workType: WorkType;
  notes?: string;
  photoUrls?: string[];
  status: TimesheetStatus;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
