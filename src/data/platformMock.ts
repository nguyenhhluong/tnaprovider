import type { Lead } from "../types/platform";
import type { TimesheetEntry } from "../types/timesheet";
import type { Variation } from "../types/variation";
import type { MaintenanceTicket } from "../types/maintenance";
import type { ProgressPhoto } from "../types/progress";
import type { ReviewRequest } from "../types/review";
import type { PlatformWorker, PlatformProject, Activity, DashboardMetrics } from "../types/platform";

export const mockLeads: Lead[] = [
  { id: "L1", name: "Sarah Johnson", company: "Johnson Properties", phone: "0401 234 567", email: "sarah@jp.com.au", source: "website", status: "new", temperature: "hot", score: 85, notes: "Looking for custom kitchen joinery", nextAction: "Call to discuss scope", assignedTo: "Mike Connor", createdAt: "2026-07-01T09:00:00Z", updatedAt: "2026-07-01T09:00:00Z" },
  { id: "L2", name: "David Chen", company: "Chen Interiors", phone: "0402 345 678", email: "david@cheninteriors.com", source: "referral", status: "contacted", temperature: "warm", score: 65, notes: "Referred by James at BuildCorp", nextAction: "Send portfolio", assignedTo: "Mike Connor", createdAt: "2026-06-28T14:00:00Z", updatedAt: "2026-06-29T10:00:00Z" },
  { id: "L3", name: "Emma Williams", company: "Williams Group", phone: "0403 456 789", source: "phone", status: "site_visit_booked", temperature: "hot", score: 92, notes: "Very keen, wants full fitout", nextAction: "Site visit on Friday", assignedTo: "Lisa Park", createdAt: "2026-06-25T11:00:00Z", updatedAt: "2026-06-30T16:00:00Z" },
  { id: "L4", name: "James Thompson", email: "james@thompsondev.com", source: "website", status: "quoted", temperature: "warm", score: 70, notes: "Quote sent for office fitout", nextAction: "Follow up on quote", assignedTo: "Mike Connor", createdAt: "2026-06-20T08:00:00Z", updatedAt: "2026-06-28T09:00:00Z" },
  { id: "L5", name: "Lisa Brown", company: "Brown & Co", phone: "0404 567 890", source: "social_media", status: "won", temperature: "hot", score: 95, nextAction: "Start project onboarding", assignedTo: "Lisa Park", createdAt: "2026-06-15T10:00:00Z", updatedAt: "2026-06-29T14:00:00Z" },
  { id: "L6", name: "Robert Taylor", company: "Taylor Hospitality", phone: "0405 678 901", email: "robert@taylorhosp.com", source: "referral", status: "lost", temperature: "cold", score: 20, notes: "Went with another provider", assignedTo: "Mike Connor", createdAt: "2026-06-10T09:00:00Z", updatedAt: "2026-06-25T11:00:00Z" },
  { id: "L7", name: "Anna Garcia", source: "walk_in", status: "new", temperature: "warm", score: 50, nextAction: "Call to qualify lead", assignedTo: "Lisa Park", createdAt: "2026-07-02T15:00:00Z", updatedAt: "2026-07-02T15:00:00Z" },
  { id: "L8", name: "Mark Wilson", company: "Wilson Retail", phone: "0406 789 012", email: "mark@wilsonretail.com", source: "website", status: "contacted", temperature: "cold", score: 35, notes: "Window shopping, small budget", assignedTo: "Mike Connor", createdAt: "2026-06-30T13:00:00Z", updatedAt: "2026-07-01T09:00:00Z" },
];

export const mockWorkers: PlatformWorker[] = [
  { id: "W1", name: "Tom Baker", role: "Carpenter", payRate: 45, phone: "0410 111 222", email: "tom@tnaprovider.com.au", isActive: true, createdAt: "2025-01-15T08:00:00Z" },
  { id: "W2", name: "John Smith", role: "Cabinet Maker", payRate: 50, phone: "0410 222 333", email: "john@tnaprovider.com.au", isActive: true, createdAt: "2025-02-01T08:00:00Z" },
  { id: "W3", name: "Alex Turner", role: "Installer", payRate: 40, phone: "0410 333 444", email: "alex@tnaprovider.com.au", isActive: true, createdAt: "2025-03-10T08:00:00Z" },
  { id: "W4", name: "Chris Lee", role: "Factory Hand", payRate: 35, phone: "0410 444 555", email: "chris@tnaprovider.com.au", isActive: true, createdAt: "2025-04-01T08:00:00Z" },
  { id: "W5", name: "Sam Wilson", role: "Project Manager", payRate: 65, phone: "0410 555 666", email: "sam@tnaprovider.com.au", isActive: true, createdAt: "2025-01-01T08:00:00Z" },
];

export const mockProjects: PlatformProject[] = [
  { id: "P1", client: "Lumina Hospitality", projectName: "Lumina Cafe Flagship", location: "Sydney CBD, NSW", projectManager: "Sam Wilson", deadline: "2026-08-15", progress: 65, estimatedLabourHours: 320, actualLabourHours: 280, estimatedLabourCost: 16000, actualLabourCost: 14800, openVariations: 1, pendingApprovals: 2, currentStage: "install", createdAt: "2026-04-01T08:00:00Z", updatedAt: "2026-07-02T10:00:00Z" },
  { id: "P2", client: "City Health Partners", projectName: "Modern Medical Clinic", location: "Canberra, ACT", projectManager: "Sam Wilson", deadline: "2026-09-01", progress: 40, estimatedLabourHours: 450, actualLabourHours: 175, estimatedLabourCost: 22500, actualLabourCost: 9100, openVariations: 2, pendingApprovals: 1, currentStage: "manufacture", createdAt: "2026-05-01T08:00:00Z", updatedAt: "2026-07-01T14:00:00Z" },
  { id: "P3", client: "Aura Fashion", projectName: "Aura Boutique", location: "Melbourne CBD, VIC", projectManager: "Sam Wilson", deadline: "2026-07-20", progress: 90, estimatedLabourHours: 280, actualLabourHours: 255, estimatedLabourCost: 14000, actualLabourCost: 13200, openVariations: 0, pendingApprovals: 0, currentStage: "defects", createdAt: "2026-03-15T08:00:00Z", updatedAt: "2026-07-02T09:00:00Z" },
  { id: "P4", client: "Nexus Technologies", projectName: "Nexus Tech Hub", location: "North Sydney, NSW", projectManager: "Sam Wilson", deadline: "2026-10-01", progress: 15, estimatedLabourHours: 800, actualLabourHours: 95, estimatedLabourCost: 40000, actualLabourCost: 5200, openVariations: 3, pendingApprovals: 4, currentStage: "design", createdAt: "2026-06-01T08:00:00Z", updatedAt: "2026-07-02T11:00:00Z" },
  { id: "P5", client: "Brown & Co", projectName: "Brown Office Fitout", location: "Parramatta, NSW", projectManager: "Sam Wilson", deadline: "2026-11-01", progress: 5, estimatedLabourHours: 200, actualLabourHours: 10, estimatedLabourCost: 10000, actualLabourCost: 500, openVariations: 0, pendingApprovals: 1, currentStage: "approved", createdAt: "2026-06-29T08:00:00Z", updatedAt: "2026-07-01T10:00:00Z" },
];

export const mockTimesheets: TimesheetEntry[] = [
  { id: "T1", workerId: "W1", workerName: "Tom Baker", projectId: "P1", projectName: "Lumina Cafe Flagship", date: "2026-07-01", startTime: "07:00", finishTime: "15:30", breakMinutes: 30, totalHours: 8, workType: "site_install", notes: "Installing kitchen joinery", status: "submitted", createdAt: "2026-07-01T16:00:00Z", updatedAt: "2026-07-01T16:00:00Z" },
  { id: "T2", workerId: "W2", workerName: "John Smith", projectId: "P1", projectName: "Lumina Cafe Flagship", date: "2026-07-01", startTime: "06:30", finishTime: "14:30", breakMinutes: 0, totalHours: 8, workType: "factory", notes: "Prefab work", status: "approved", approvedBy: "Sam Wilson", approvedAt: "2026-07-02T09:00:00Z", createdAt: "2026-07-01T15:00:00Z", updatedAt: "2026-07-02T09:00:00Z" },
  { id: "T3", workerId: "W3", workerName: "Alex Turner", projectId: "P2", projectName: "Modern Medical Clinic", date: "2026-07-01", startTime: "22:00", finishTime: "06:00", breakMinutes: 30, totalHours: 7.5, workType: "site_install", notes: "After hours install - medical equipment", status: "submitted", createdAt: "2026-07-02T06:30:00Z", updatedAt: "2026-07-02T06:30:00Z" },
  { id: "T4", workerId: "W4", workerName: "Chris Lee", projectId: "P3", projectName: "Aura Boutique", date: "2026-06-30", startTime: "08:00", finishTime: "16:00", breakMinutes: 30, totalHours: 7.5, workType: "delivery", notes: "Delivered materials to site", status: "approved", approvedBy: "Sam Wilson", approvedAt: "2026-07-01T10:00:00Z", createdAt: "2026-06-30T16:30:00Z", updatedAt: "2026-07-01T10:00:00Z" },
  { id: "T5", workerId: "W1", workerName: "Tom Baker", projectId: "P1", projectName: "Lumina Cafe Flagship", date: "2026-06-30", startTime: "07:00", finishTime: "15:30", breakMinutes: 30, totalHours: 8, workType: "site_install", status: "rejected", rejectionReason: "Incomplete notes - please add details about work completed", createdAt: "2026-06-30T16:00:00Z", updatedAt: "2026-07-01T09:00:00Z" },
  { id: "T6", workerId: "W2", workerName: "John Smith", projectId: "P2", projectName: "Modern Medical Clinic", date: "2026-07-02", startTime: "07:00", finishTime: "15:30", breakMinutes: 30, totalHours: 8, workType: "measure_up", notes: "Site measure-up for cabinetry", status: "draft", createdAt: "2026-07-02T10:00:00Z", updatedAt: "2026-07-02T10:00:00Z" },
];

export const mockVariations: Variation[] = [
  { id: "V1", projectId: "P1", projectName: "Lumina Cafe Flagship", title: "Additional shelving units", description: "Client requested 4 additional shelving units for back-of-house storage", costImpact: 2500, timeImpactDays: 3, status: "approved", requestedBy: "Sam Wilson", clientApprovalDate: "2026-06-28", createdAt: "2026-06-25T10:00:00Z", updatedAt: "2026-06-28T15:00:00Z" },
  { id: "V2", projectId: "P4", projectName: "Nexus Tech Hub", title: "Extra meeting room", description: "Convert storage room to small meeting room with acoustic treatment", costImpact: -15000, timeImpactDays: 10, status: "sent", requestedBy: "Client", createdAt: "2026-07-01T11:00:00Z", updatedAt: "2026-07-01T11:00:00Z" },
  { id: "V3", projectId: "P2", projectName: "Modern Medical Clinic", title: "Upgrade reception desk", description: "Use premium marble-look material instead of laminate", costImpact: 3500, timeImpactDays: 5, status: "draft", requestedBy: "Lisa Park", createdAt: "2026-06-30T09:00:00Z", updatedAt: "2026-06-30T09:00:00Z" },
  { id: "V4", projectId: "P4", projectName: "Nexus Tech Hub", title: "LED sign removal", description: "Remove LED signage from lobby - client changed mind", costImpact: -2000, timeImpactDays: 2, status: "rejected", requestedBy: "Client", rejectionReason: "Signage already in production, can't cancel", createdAt: "2026-06-28T14:00:00Z", updatedAt: "2026-06-29T16:00:00Z" },
  { id: "V5", projectId: "P2", projectName: "Modern Medical Clinic", title: "Additional power outlets", description: "6 additional GPOs in treatment rooms", costImpact: 1800, timeImpactDays: 2, status: "completed", requestedBy: "Sam Wilson", clientApprovalDate: "2026-06-20", createdAt: "2026-06-18T08:00:00Z", updatedAt: "2026-06-25T10:00:00Z" },
];

export const mockProgressPhotos: ProgressPhoto[] = [
  { id: "PP1", projectId: "P1", projectName: "Lumina Cafe Flagship", date: "2026-07-01", stage: "Install", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800", note: "Kitchen joinery installation progress", uploadedBy: "Tom Baker", visibleToClient: true, createdAt: "2026-07-01T14:00:00Z" },
  { id: "PP2", projectId: "P1", projectName: "Lumina Cafe Flagship", date: "2026-06-28", stage: "Install", imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800", note: "Internal wiring progress", uploadedBy: "Sam Wilson", visibleToClient: false, createdAt: "2026-06-28T12:00:00Z" },
  { id: "PP3", projectId: "P2", projectName: "Modern Medical Clinic", date: "2026-07-02", stage: "Manufacture", imageUrl: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=800", note: "Cabinetry in production at factory", uploadedBy: "John Smith", visibleToClient: true, createdAt: "2026-07-02T11:00:00Z" },
  { id: "PP4", projectId: "P3", projectName: "Aura Boutique", date: "2026-06-29", stage: "Defects", imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800", note: "Final walkthrough with client", uploadedBy: "Sam Wilson", visibleToClient: true, createdAt: "2026-06-29T16:00:00Z" },
];

export const mockMaintenanceTickets: MaintenanceTicket[] = [
  { id: "M1", clientName: "Lumina Hospitality", projectId: "P1", projectName: "Lumina Cafe Flagship", category: "joinery", priority: "high", description: "Kitchen drawer runner broken on main prep station", status: "new", dueDate: "2026-07-10", createdAt: "2026-07-02T08:00:00Z", updatedAt: "2026-07-02T08:00:00Z" },
  { id: "M2", clientName: "Aura Fashion", projectId: "P3", projectName: "Aura Boutique", category: "painting", priority: "medium", description: "Small scuff mark on wall near entrance", status: "scheduled", assignedTo: "Tom Baker", scheduledDate: "2026-07-05", dueDate: "2026-07-08", createdAt: "2026-06-30T10:00:00Z", updatedAt: "2026-07-01T14:00:00Z" },
  { id: "M3", clientName: "Nexus Technologies", projectId: "P4", projectName: "Nexus Tech Hub", category: "electrical", priority: "urgent", description: "Power point not working in meeting room 3", status: "reviewing", dueDate: "2026-07-03", createdAt: "2026-07-01T09:00:00Z", updatedAt: "2026-07-01T15:00:00Z" },
  { id: "M4", clientName: "Private Client", projectId: "P3", projectName: "Aura Boutique", category: "general", priority: "low", description: "Door handle slightly loose", status: "completed", assignedTo: "Alex Turner", completedDate: "2026-06-28", dueDate: "2026-07-01", createdAt: "2026-06-25T11:00:00Z", updatedAt: "2026-06-28T15:00:00Z" },
];

export const mockReviewRequests: ReviewRequest[] = [
  { id: "R1", projectId: "P3", projectName: "Aura Boutique", clientName: "Aura Fashion", completedDate: "2026-06-25", reviewSent: true, reviewLink: "https://g.page/review/aura", followUpDate: "2026-07-05", status: "sent", createdAt: "2026-06-26T09:00:00Z", updatedAt: "2026-06-26T09:00:00Z" },
  { id: "R2", projectId: "P1", projectName: "Lumina Cafe Flagship", clientName: "Lumina Hospitality", completedDate: "2026-06-20", reviewSent: false, status: "pending", followUpDate: "2026-07-03", createdAt: "2026-06-21T10:00:00Z", updatedAt: "2026-06-21T10:00:00Z" },
  { id: "R3", projectId: "P5", projectName: "Brown Office Fitout", clientName: "Brown & Co", completedDate: "2026-06-15", reviewSent: true, reviewLink: "https://g.page/review/brownco", followUpDate: "2026-06-30", status: "received", rating: 5, reviewText: "Excellent work, highly recommend!", createdAt: "2026-06-16T08:00:00Z", updatedAt: "2026-06-28T14:00:00Z" },
];

export const mockActivities: Activity[] = [
  { id: "A1", type: "lead", action: "New lead", description: "Sarah Johnson submitted a website enquiry", timestamp: "2026-07-02T09:00:00Z" },
  { id: "A2", type: "timesheet", action: "Timesheet approved", description: "John Smith's timesheet for 01/07 was approved", timestamp: "2026-07-02T09:00:00Z" },
  { id: "A3", type: "maintenance", action: "New maintenance request", description: "Lumina Cafe reported broken drawer runner", timestamp: "2026-07-02T08:00:00Z" },
  { id: "A4", type: "project", action: "Project stage update", description: "Lumina Cafe Flagship moved to Install stage", timestamp: "2026-07-01T14:00:00Z" },
  { id: "A5", type: "variation", action: "Variation sent", description: "Extra meeting room variation sent to Nexus Tech Hub", timestamp: "2026-07-01T11:00:00Z" },
  { id: "A6", type: "timesheet", action: "Timesheet rejected", description: "Tom Baker's 30/06 timesheet was rejected", timestamp: "2026-07-01T09:00:00Z" },
  { id: "A7", type: "lead", action: "Lead won", description: "Lisa Brown signed off on project", timestamp: "2026-06-29T14:00:00Z" },
];

export const mockDashboardMetrics: DashboardMetrics = {
  newLeadsThisWeek: 3,
  hotLeads: 2,
  activeProjects: 4,
  pendingTimesheets: 3,
  pendingVariations: 2,
  maintenanceRequests: 3,
  revenuePipeline: 850000,
  currentManufacturingLeadTime: 14,
  approvedHoursThisWeek: 15.5,
};
