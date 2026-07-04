import { useState } from "react";
import type { Variation, VariationStatus } from "../../types/variation";
import type { PlatformProject } from "../../types/platform";

interface VariationFormProps {
  projects: PlatformProject[];
  onSubmit: (variation: Variation) => void;
}

export function VariationForm({ projects, onSubmit }: VariationFormProps) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [costImpact, setCostImpact] = useState(0);
  const [timeImpactDays, setTimeImpactDays] = useState(0);
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    const project = projects.find((p) => p.id === projectId);
    const variation: Variation = {
      id: `V${Date.now()}`,
      projectId,
      projectName: project?.projectName || "",
      title: title.trim(),
      description: description.trim(),
      costImpact,
      timeImpactDays,
      status: "draft",
      requestedBy: "Admin",
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(variation);
    setTitle("");
    setDescription("");
    setCostImpact(0);
    setTimeImpactDays(0);
    setNotes("");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h3 className="font-display font-bold text-lg mb-4">New Variation</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.projectName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm"
            placeholder="Variation title"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cost Impact ($)</label>
          <input
            type="number"
            value={costImpact}
            onChange={(e) => setCostImpact(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm"
          />
          <p className="text-xs text-gray-500 mt-0.5">Positive = additional cost, Negative = saving</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time Impact (days)</label>
          <input
            type="number"
            value={timeImpactDays}
            onChange={(e) => setTimeImpactDays(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm"
            placeholder="Describe the variation"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm"
            placeholder="Internal notes"
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-4 px-6 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors"
      >
        Create Variation
      </button>
    </form>
  );
}
