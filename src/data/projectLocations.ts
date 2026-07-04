import { projects } from "./projects";

export interface ProjectLocation {
  id: string;
  projectTitle: string;
  suburb: string;
  state: string;
  sector: string;
  projectType: string;
  projectLink: string;
}

export const projectLocations: ProjectLocation[] = projects.map((project) => {
  const [suburbPart, statePart] = project.location.split(",").map((part) => part.trim());

  return {
    id: project.id,
    projectTitle: project.title,
    suburb: suburbPart || project.location,
    state: statePart || "",
    sector: project.sector,
    projectType: project.scope,
    projectLink: `/projects/${project.id}`,
  };
});

export const uniqueSectors = [...new Set(projectLocations.map(l => l.sector))].sort();
export const uniqueStates = [...new Set(projectLocations.map(l => l.state).filter(Boolean))].sort();
