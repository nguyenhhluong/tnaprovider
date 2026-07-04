import type { PlatformProject } from "../../types/platform";
import { StatusBadge } from "./StatusBadge";
import { MapPin, User, Calendar, AlertTriangle, Clock } from "lucide-react";

export function ProjectJobCard({ project }: { project: PlatformProject }) {
  const progress = Math.max(0, Math.min(100, project.progress));

  return (
    <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium">{project.projectName}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">{project.client}</p>
        </div>
        <StatusBadge status={project.currentStage} />
      </div>

      <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          {project.location}
        </div>
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          {project.projectManager}
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Due: {new Date(project.deadline).toLocaleDateString("en-AU")}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-accent rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
          <p className="text-gray-500">Est. Hours</p>
          <p className="font-medium">{project.estimatedLabourHours}h</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
          <p className="text-gray-500">Actual Hours</p>
          <p className="font-medium">{project.actualLabourHours}h</p>
        </div>
      </div>

      {(project.openVariations > 0 || project.pendingApprovals > 0) && (
        <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          {project.openVariations > 0 && (
            <span className="flex items-center gap-1 text-xs text-orange-600">
              <AlertTriangle className="w-3 h-3" />
              {project.openVariations} variations
            </span>
          )}
          {project.pendingApprovals > 0 && (
            <span className="flex items-center gap-1 text-xs text-blue-600">
              <Clock className="w-3 h-3" />
              {project.pendingApprovals} approvals
            </span>
          )}
        </div>
      )}
    </div>
  );
}
