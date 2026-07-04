import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export function ProjectBoard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("all");
  const [error, setError] = useState("");

  const fetchProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/platform/projects", { credentials: "include" });
      if (res.ok) setProjects(await res.json());
      else setError("Failed to load projects");
    } catch {
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const filtered = stageFilter === "all" ? projects : projects.filter((p) => p.status === stageFilter);
  const stages = ["all", ...new Set(projects.map((p) => p.status || "active").filter(Boolean))];

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-accent" /></div>;
  if (error) return <p className="text-sm text-red-500 text-center py-8">{error}</p>;

  return (
    <div className="space-y-4">
      {stages.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {stages.map((stage) => (
            <button key={stage} onClick={() => setStageFilter(stage)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${stageFilter === stage ? "bg-brand-accent text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
            >
              {stage === "all" ? "All" : stage.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No projects found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-brand-dark dark:text-white mb-1">{p.title || p.client_name}</h3>
              <p className="text-xs text-gray-500 mb-3">{p.location || ''}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 capitalize">{p.status || 'active'}</span>
                {p.budget && <span className="text-gray-400">${Number(p.budget).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
