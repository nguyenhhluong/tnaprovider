import type { PlatformProject } from "../../types/platform";
import type { ProgressPhoto } from "../../types/progress";
import type { Variation } from "../../types/variation";
import { StatusBadge } from "./StatusBadge";
import { ProgressPhotoFeed } from "./ProgressPhotoFeed";
import { VariationList } from "./VariationList";
import { MapPin, User, Calendar, Phone, Mail } from "lucide-react";

interface ClientProjectViewProps {
  project: PlatformProject;
  progressPhotos: ProgressPhoto[];
  variations: Variation[];
}

export function ClientProjectView({ project, progressPhotos, variations }: ClientProjectViewProps) {
  const progress = Math.max(0, Math.min(100, project.progress));

  return (
    <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-display font-bold">{project.projectName}</h2>
            <p className="text-gray-500 dark:text-gray-400">{project.client}</p>
          </div>
          <StatusBadge status={project.currentStage} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {project.location}
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Project Manager: {project.projectManager}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Estimated completion: {new Date(project.deadline).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-sm">Contact PM: 0406 409 668</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-sm">info@tnaprovider.com.au</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium">Project Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-accent rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {progressPhotos.length > 0 && (
          <div className="mb-6">
            <h3 className="font-display font-bold text-lg mb-3">Progress Photos</h3>
            <ProgressPhotoFeed photos={progressPhotos} />
          </div>
        )}

        {variations.length > 0 && (
          <div className="mb-6">
            <h3 className="font-display font-bold text-lg mb-3">Variations</h3>
            <VariationList variations={variations} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 bg-gray-50 dark:bg-gray-900">
        <h3 className="font-display font-bold mb-2">Next Milestone</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {project.currentStage === "install" ? "Installation in progress - completion expected by " + new Date(project.deadline).toLocaleDateString("en-AU") :
           project.currentStage === "manufacture" ? "Manufacturing in progress - next stage: Install" :
           project.currentStage === "design" ? "Design phase - awaiting client approval" :
           project.currentStage === "defects" ? "Defects rectification in progress" :
           project.currentStage === "completed" ? "Project completed. Thank you for your business!" :
           "Project in " + project.currentStage + " stage"}
        </p>
      </div>
    </div>
  );
}
