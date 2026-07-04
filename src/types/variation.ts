export type VariationStatus = "draft" | "sent" | "approved" | "rejected" | "completed";

export interface Variation {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  costImpact: number;
  timeImpactDays: number;
  status: VariationStatus;
  requestedBy: string;
  clientApprovalDate?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
