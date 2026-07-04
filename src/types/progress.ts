export interface ProgressPhoto {
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  stage: string;
  imageUrl: string;
  note?: string;
  uploadedBy: string;
  visibleToClient: boolean;
  createdAt: string;
}
