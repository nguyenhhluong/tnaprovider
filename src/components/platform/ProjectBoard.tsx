import { useState } from "react";
import type { ProjectStage } from "../../types/platform";
import { mockProjects } from "../../data/platformMock";
import { ProjectJobCard } from "./ProjectJobCard";

const stages: ProjectStage[] = ["enquiry", "quoted", "approved", "design", "manufacture", "install", "defects", "completed"];

export function ProjectBoard() {
  const [stageFilter, setStageFilter] = useState<ProjectStage | "all">("all");

  const filtered = stageFilter === "all" ? mockProjects : mockProjects.filter((p) => p.currentStage === stageFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStageFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${stageFilter === "all" ? "bg-brand-accent text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
        >
          All
        </button>
        {stages.map((stage) => (
          <button
            key={stage}
            onClick={() => setStageFilter(stage)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${stageFilter === stage ? "bg-brand-accent text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
          >
            {stage.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No projects found in this stage.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectJobCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
