export type ReviewStatus = "pending" | "sent" | "received" | "published";

export interface ReviewRequest {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  completedDate: string;
  reviewSent: boolean;
  reviewLink?: string;
  followUpDate?: string;
  status: ReviewStatus;
  rating?: number;
  reviewText?: string;
  createdAt: string;
  updatedAt: string;
}
