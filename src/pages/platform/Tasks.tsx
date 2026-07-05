import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { SEO } from "../../components/SEO";
import { PageHeader } from "../../components/shared/PageHeader";
import {
  Plus, X, Loader2, AlertCircle, MessageSquare, UserPlus,
  Calendar, ArrowRight, ChevronDown, List, Columns, LayoutTemplate,
  Filter, Trash2
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

interface Comment {
  id: string;
  message: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string;
  project_title?: string;
  assigned_to: string | null;
  assigned_name?: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  task_count: number;
}

type TaskStatus = "todo" | "in_progress" | "blocked" | "done" | "cancelled";
type TaskPriority = "low" | "medium" | "high" | "urgent";
type ViewMode = "board" | "table";

const STATUS_COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "blocked", label: "Blocked" },
  { key: "done", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
];

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  medium: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
  high: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
  urgent: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "border-t-gray-300 dark:border-t-gray-600",
  in_progress: "border-t-brand-accent",
  blocked: "border-t-red-500",
  done: "border-t-green-500",
  cancelled: "border-t-gray-400 dark:border-t-gray-500",
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const text = await res.text().catch(() => "Request failed");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function Tasks() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [projectFilter, setProjectFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("board");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    project_id: "",
    assigned_to: "",
    due_at: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [applyTemplateProject, setApplyTemplateProject] = useState("");
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set("project_id", projectFilter);
      if (assigneeFilter) params.set("assigned_to", assigneeFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (statusFilter) params.set("status", statusFilter);
      const qs = params.toString();
      const data = await apiFetch<Task[]>(`/api/tasks${qs ? `?${qs}` : ""}`);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [projectFilter, assigneeFilter, priorityFilter, statusFilter]);

  const fetchProjects = useCallback(async () => {
    try {
      setProjects(await apiFetch<Project[]>("/api/platform/projects"));
    } catch { /* non-critical */ }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setUsers(await apiFetch<User[]>("/api/platform/users"));
    } catch { /* non-critical */ }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      setTemplates(await apiFetch<Template[]>("/api/tasks/templates"));
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchTemplates();
  }, [fetchProjects, fetchUsers, fetchTemplates]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openDetail = async (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
    setComments([]);
    setCommentsLoading(true);
    try {
      const data = await apiFetch<Task>(`/api/tasks/${task.id}`);
      setSelectedTask(data);
      const commentData = await apiFetch<Comment[]>(`/api/tasks/${task.id}/comments`);
      setComments(commentData);
    } catch {
      setError("Failed to load task details");
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const newTask = await apiFetch<Task>("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      setTasks((prev) => [newTask, ...prev]);
      setShowCreateModal(false);
      setCreateForm({ title: "", description: "", priority: "medium", project_id: "", assigned_to: "", due_at: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusUpdate = async (taskId: string, status: TaskStatus) => {
    try {
      await apiFetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchTasks();
      if (selectedTask?.id === taskId) {
        const taskRes = await fetch(`/api/tasks/${taskId}`, { credentials: "include" });
        if (taskRes.ok) setSelectedTask(await taskRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleAssign = async (taskId: string, assignedTo: string) => {
    try {
      await apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: assignedTo || null }),
      });
      await fetchTasks();
      if (selectedTask?.id === taskId) {
        const taskRes = await fetch(`/api/tasks/${taskId}`, { credentials: "include" });
        if (taskRes.ok) setSelectedTask(await taskRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign user");
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTask) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newComment }),
      });
      if (res.ok) {
        const commentsRes = await fetch(`/api/tasks/${selectedTask.id}/comments`, { credentials: "include" });
        if (commentsRes.ok) setComments(await commentsRes.json());
        setNewComment("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId || !applyTemplateProject) return;
    setApplyingTemplate(true);
    try {
      await apiFetch(`/api/tasks/templates/${selectedTemplateId}/apply-to-project/${applyTemplateProject}`, {
        method: "POST",
      });
      fetchTasks();
      setSelectedTemplateId("");
      setApplyTemplateProject("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply template");
    } finally {
      setApplyingTemplate(false);
    }
  };

  const groupedTasks = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  const priorityBadge = (priority: TaskPriority) => (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  );

  const TaskCard = ({ task }: { task: Task }) => (
    <button
      onClick={() => openDetail(task)}
      className="w-full text-left bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-brand-dark dark:text-white leading-snug line-clamp-2">{task.title}</h4>
        {priorityBadge(task.priority)}
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        {task.assigned_name && (
          <span className="flex items-center gap-1">
            <UserPlus className="w-3 h-3" />
            {task.assigned_name}
          </span>
        )}
        {task.due_at && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(task.due_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </button>
  );

  if (loading) {
    return (
      <>
        <PageHeader title="Tasks" description="Manage and track project tasks." onMenuClick={() => setSidebarOpen(true)} />
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Tasks | TNA Provider Platform" description="Task management board." canonical="https://tnaprovider.com.au/platform/tasks" />
      <PageHeader title="Tasks" description="Manage and track project tasks." onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-8">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("board")}
              className={`p-2 ${viewMode === "board" ? "bg-brand-accent text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              title="Board view"
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 ${viewMode === "table" ? "bg-brand-accent text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowTemplatePanel(!showTemplatePanel)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <LayoutTemplate className="w-4 h-4" />
            Templates
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="h-10 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent"
        >
          <option value="">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="h-10 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent"
        >
          <option value="">All Assignees</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-10 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent"
        >
          <option value="">All Statuses</option>
          {STATUS_COLUMNS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {(projectFilter || assigneeFilter || priorityFilter || statusFilter) && (
          <button
            onClick={() => { setProjectFilter(""); setAssigneeFilter(""); setPriorityFilter(""); setStatusFilter(""); }}
            className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Board View */}
      {viewMode === "board" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {STATUS_COLUMNS.map((col) => {
            const columnTasks = groupedTasks(col.key);
            return (
              <div key={col.key} className="flex flex-col">
                <div className={`flex items-center justify-between mb-3 px-1`}>
                  <h3 className="text-sm font-semibold text-brand-dark dark:text-white flex items-center gap-2">
                    <span className={`w-1 h-4 rounded-full ${col.key === "todo" ? "bg-gray-400" : col.key === "in_progress" ? "bg-brand-accent" : col.key === "blocked" ? "bg-red-500" : col.key === "done" ? "bg-green-500" : "bg-gray-500"}`} />
                    {col.label}
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{columnTasks.length}</span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignee</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No tasks found.</td></tr>
                )}
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                    onClick={() => openDetail(task)}
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-brand-dark dark:text-white">{task.title}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs capitalize text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                        {task.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">{priorityBadge(task.priority)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {task.assigned_name || <span className="text-gray-400">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {task.due_at ? new Date(task.due_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusUpdate(task.id, e.target.value as TaskStatus)}
                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-accent font-semibold"
                      >
                        {STATUS_COLUMNS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white">Create Task</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Task title *"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                required
                className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full"
              />
              <textarea
                placeholder="Description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={3}
                className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full resize-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={createForm.project_id}
                  onChange={(e) => setCreateForm({ ...createForm, project_id: e.target.value })}
                  className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent"
                >
                  <option value="">Select project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as TaskPriority })}
                  className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent"
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={createForm.assigned_to}
                  onChange={(e) => setCreateForm({ ...createForm, assigned_to: e.target.value })}
                  className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent"
                >
                  <option value="">Assign to...</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input
                  type="date"
                  value={createForm.due_at}
                  onChange={(e) => setCreateForm({ ...createForm, due_at: e.target.value })}
                  className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={createLoading || !createForm.title}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover disabled:opacity-50 transition-colors"
                >
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Drawer */}
      {detailOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailOpen(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 shadow-xl border-l border-gray-100 dark:border-gray-800 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white truncate">{selectedTask.title}</h2>
              <button onClick={() => setDetailOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status update */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_COLUMNS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => handleStatusUpdate(selectedTask.id, s.key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        selectedTask.status === s.key
                          ? "bg-brand-accent text-white border-brand-accent"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Description</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedTask.description || <span className="text-gray-400 italic">No description</span>}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Priority</label>
                    <div>{priorityBadge(selectedTask.priority)}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Due Date</label>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedTask.due_at ? new Date(selectedTask.due_at).toLocaleDateString() : <span className="text-gray-400">Not set</span>}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Project</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedTask.project_title || <span className="text-gray-400">N/A</span>}</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Assignee</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTask.assigned_to || ""}
                      onChange={(e) => handleAssign(selectedTask.id, e.target.value)}
                      className="h-10 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent flex-1"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-brand-dark dark:text-white">Comments</h3>
                  <span className="text-xs text-gray-400">({comments.length})</span>
                </div>

                {commentsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-brand-accent" />
                  </div>
                ) : (
                  <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                    {comments.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">No comments yet.</p>
                    )}
                    {comments.map((c) => (
                      <div key={c.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-brand-dark dark:text-white">{c.user_name}</span>
                          <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{c.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handlePostComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 h-10 px-4 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent"
                  />
                  <button
                    type="submit"
                    disabled={postingComment || !newComment.trim()}
                    className="px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Admin Panel */}
      {showTemplatePanel && (
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-brand-accent" />
                Task Templates
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Apply a template to create task sets for a project.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {templates.length === 0 && (
              <div className="md:col-span-3 text-center py-8 text-sm text-gray-400">No templates available.</div>
            )}
            {templates.map((t) => (
              <div
                key={t.id}
                className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                  selectedTemplateId === t.id
                    ? "border-brand-accent bg-brand-accent/5 dark:bg-brand-accent/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
                onClick={() => setSelectedTemplateId(t.id)}
              >
                <h4 className="text-sm font-semibold text-brand-dark dark:text-white mb-1">{t.name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t.description}</p>
                <span className="text-xs text-brand-accent font-semibold">{t.task_count} tasks</span>
              </div>
            ))}
          </div>

          {selectedTemplateId && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex-1 w-full sm:w-auto">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Apply to project</label>
                <select
                  value={applyTemplateProject}
                  onChange={(e) => setApplyTemplateProject(e.target.value)}
                  className="h-10 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full"
                >
                  <option value="">Select project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <button
                onClick={handleApplyTemplate}
                disabled={applyingTemplate || !applyTemplateProject}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover disabled:opacity-50 transition-colors mt-1 sm:mt-0"
              >
                {applyingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutTemplate className="w-4 h-4" />}
                Apply Template
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
