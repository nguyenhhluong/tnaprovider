export type MaintenanceCategory = "structural" | "electrical" | "plumbing" | "joinery" | "painting" | "general" | "other";
export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type MaintenanceStatus = "new" | "reviewing" | "scheduled" | "completed" | "closed";

export interface MaintenanceTicket {
  id: string;
  clientName: string;
  projectId: string;
  projectName: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  description: string;
  status: MaintenanceStatus;
  assignedTo?: string;
  scheduledDate?: string;
  completedDate?: string;
  dueDate: string;
  photoUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
