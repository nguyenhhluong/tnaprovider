import { useState } from "react";
import type { MaintenanceTicket, MaintenanceCategory, MaintenancePriority } from "../../types/maintenance";
import type { PlatformProject } from "../../types/platform";

interface MaintenanceTicketFormProps {
  projects: PlatformProject[];
  onSubmit: (ticket: MaintenanceTicket) => void;
}

const categories: { value: MaintenanceCategory; label: string }[] = [
  { value: "structural", label: "Structural" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "joinery", label: "Joinery" },
  { value: "painting", label: "Painting" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
];

const priorities: { value: MaintenancePriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function MaintenanceTicketForm({ projects, onSubmit }: MaintenanceTicketFormProps) {
  const [clientName, setClientName] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [category, setCategory] = useState<MaintenanceCategory>("general");
  const [priority, setPriority] = useState<MaintenancePriority>("medium");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !description.trim() || !dueDate) return;

    const project = projects.find((p) => p.id === projectId);
    const ticket: MaintenanceTicket = {
      id: `M${Date.now()}`,
      clientName: clientName.trim(),
      projectId,
      projectName: project?.projectName || "",
      category,
      priority,
      description: description.trim(),
      status: "new",
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(ticket);
    setClientName("");
    setDescription("");
    setDueDate("");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h3 className="font-display font-bold text-lg mb-4">New Maintenance Ticket</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Client Name</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm"
            required
          />
        </div>
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
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm"
          >
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm"
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-4 px-6 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors"
      >
        Create Ticket
      </button>
    </form>
  );
}
