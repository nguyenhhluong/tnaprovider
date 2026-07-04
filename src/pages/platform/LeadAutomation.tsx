import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { SEO } from "../../components/SEO";
import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  ListChecks,
  Loader2,
  MessageSquare,
  Plus,
  Target,
  User,
  X,
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
}

interface FollowUp {
  id: string;
  title: string;
  note: string | null;
  due_date: string;
  status: "pending" | "completed";
  lead_id: string;
  lead_name: string;
  created_by_name: string;
  completed_by_name: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  lead_id: string;
  created_by_name: string;
  created_at: string;
}

type FollowUpTab = "due_today" | "overdue" | "upcoming";
type ViewTab = "timeline" | "followups";

export default function LeadAutomation() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");

  // Modal & form
  const [showModal, setShowModal] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Tabs
  const [followUpTab, setFollowUpTab] = useState<FollowUpTab>("due_today");
  const [viewTab, setViewTab] = useState<ViewTab>("followups");

  // Load leads
  useEffect(() => {
    fetch("/api/platform/leads")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Lead[]) => {
        setLeads(data);
        if (data.length > 0) {
          setSelectedLeadId(data[0].id);
        }
        setLoadingLeads(false);
      })
      .catch(() => {
        setLoadingLeads(false);
        setError("Failed to load leads");
      });
  }, []);

  // Load follow-ups and activities when lead changes
  useEffect(() => {
    if (!selectedLeadId) return;
    setLoadingDetails(true);
    setError("");
    Promise.all([
      fetch(`/api/automation/leads/${selectedLeadId}/followups`).then((r) =>
        r.ok ? r.json() : []
      ),
      fetch(`/api/automation/leads/${selectedLeadId}/activities`).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([fups, acts]: [FollowUp[], Activity[]]) => {
        setFollowups(fups);
        setActivities(acts);
        setLoadingDetails(false);
      })
      .catch(() => {
        setLoadingDetails(false);
        setError("Failed to load details");
      });
  }, [selectedLeadId]);

  const handleCreateFollowUp = async () => {
    if (!formTitle.trim() || !formDueDate || !selectedLeadId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/automation/leads/${selectedLeadId}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: formTitle.trim(),
          note: formNote.trim() || null,
          due_date: formDueDate,
        }),
      });
      if (res.ok) {
        const created: FollowUp = await res.json();
        setFollowups((prev) => [...prev, created]);
        setShowModal(false);
        setFormTitle("");
        setFormNote("");
        setFormDueDate("");
      }
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkDone = async (followUpId: string) => {
    try {
      const res = await fetch(
        `/api/automation/leads/${selectedLeadId}/followups/${followUpId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: "completed" }),
        }
      );
      if (res.ok) {
        setFollowups((prev) =>
          prev.map((f) =>
            f.id === followUpId
              ? { ...f, status: "completed", completed_at: new Date().toISOString() }
              : f
          )
        );
      }
    } catch {
      /* ignore */
    }
  };

  // Derived stats
  const totalFollowUps = followups.length;
  const dueToday = followups.filter((f) => {
    if (f.status === "completed") return false;
    const today = new Date().toISOString().slice(0, 10);
    return f.due_date?.slice(0, 10) === today;
  });
  const overdue = followups.filter((f) => {
    if (f.status === "completed") return false;
    const today = new Date().toISOString().slice(0, 10);
    return f.due_date && f.due_date.slice(0, 10) < today;
  });
  const completed = followups.filter((f) => f.status === "completed");

  const getFilteredFollowUps = () => {
    switch (followUpTab) {
      case "due_today":
        return dueToday;
      case "overdue":
        return overdue;
      case "upcoming":
        return followups.filter((f) => {
          if (f.status === "completed") return false;
          const today = new Date().toISOString().slice(0, 10);
          return f.due_date && f.due_date.slice(0, 10) > today;
        });
    }
  };

  const activityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Bell className="w-4 h-4" />;
      case "email":
        return <MessageSquare className="w-4 h-4" />;
      case "meeting":
        return <User className="w-4 h-4" />;
      case "note":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  if (loadingLeads) {
    return (
      <>
        <PlatformHeader title="Lead Automation" onMenuClick={() => setSidebarOpen(true)} />
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Lead Automation - TNA Provider"
        description="Automate follow-ups and track lead activity"
        canonical="/platform/lead-automation"
      />
      <PlatformHeader title="Lead Automation" onMenuClick={() => setSidebarOpen(true)} />

      <div className="p-4 md:p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-display font-bold text-brand-dark dark:text-white mb-2">
              No Leads Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Add leads to start automating follow-ups and tracking activity.
            </p>
          </div>
        ) : (
          <>
            {/* Lead Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-brand-dark dark:text-white whitespace-nowrap">
                  Select Lead
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="h-11 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white text-sm focus:outline-none focus:ring-1 focus:border-brand-accent min-w-[220px]"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 h-11 px-5 bg-brand-accent text-white rounded-xl hover:bg-brand-accent-hover transition-colors text-sm font-semibold shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Follow-up
              </button>
            </div>

            {/* Selected Lead Info */}
            {selectedLead && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white">
                    {selectedLead.name}
                  </h2>
                  <span className="text-xs text-gray-500">{selectedLead.email}</span>
                  {selectedLead.phone && (
                    <span className="text-xs text-gray-500">{selectedLead.phone}</span>
                  )}
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 capitalize">
                    {selectedLead.status}
                  </span>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                    <ListChecks className="w-5 h-5 text-brand-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-dark dark:text-white">{totalFollowUps}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Follow-ups</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-dark dark:text-white">{dueToday.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Due Today</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-dark dark:text-white">{overdue.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Overdue</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-dark dark:text-white">{completed.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setViewTab("followups")}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  viewTab === "followups"
                    ? "border-brand-accent text-brand-accent"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-brand-dark dark:hover:text-white"
                }`}
              >
                Follow-ups
              </button>
              <button
                onClick={() => setViewTab("timeline")}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  viewTab === "timeline"
                    ? "border-brand-accent text-brand-accent"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-brand-dark dark:hover:text-white"
                }`}
              >
                Activity Timeline
              </button>
            </div>

            {/* Content */}
            {loadingDetails ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
              </div>
            ) : viewTab === "timeline" ? (
              /* Activity Timeline */
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                <h3 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-6">
                  Activity Timeline
                </h3>
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                      <MessageSquare className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400">No activity recorded yet.</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-gray-800" />
                    <div className="space-y-6">
                      {activities.map((a) => (
                        <div key={a.id} className="relative pl-10">
                          <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-brand-accent border-2 border-white dark:border-gray-900 z-10 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-brand-accent uppercase tracking-wider">
                                  {a.type}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(a.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-brand-dark dark:text-white">
                              {a.title}
                            </p>
                            {a.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {a.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">{a.created_by_name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Follow-ups Board */
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                {/* Sub-tabs */}
                <div className="flex gap-1 mb-6">
                  {(["due_today", "overdue", "upcoming"] as FollowUpTab[]).map((tab) => {
                    const count =
                      tab === "due_today"
                        ? dueToday.length
                        : tab === "overdue"
                        ? overdue.length
                        : followups.filter((f) => {
                            if (f.status === "completed") return false;
                            const today = new Date().toISOString().slice(0, 10);
                            return f.due_date && f.due_date.slice(0, 10) > today;
                          }).length;
                    return (
                      <button
                        key={tab}
                        onClick={() => setFollowUpTab(tab)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                          followUpTab === tab
                            ? "bg-brand-accent/10 text-brand-accent"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        {tab === "due_today" && <Calendar className="w-4 h-4" />}
                        {tab === "overdue" && <Clock className="w-4 h-4" />}
                        {tab === "upcoming" && <Bell className="w-4 h-4" />}
                        <span className="capitalize">{tab.replace("_", " ")}</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Follow-ups list */}
                {getFilteredFollowUps().length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400">No follow-ups in this section.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getFilteredFollowUps().map((f) => (
                      <div
                        key={f.id}
                        className={`p-4 rounded-xl border transition-all ${
                          f.status === "completed"
                            ? "bg-gray-50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800"
                            : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4
                                className={`text-sm font-semibold ${
                                  f.status === "completed"
                                    ? "text-gray-400 line-through"
                                    : "text-brand-dark dark:text-white"
                                }`}
                              >
                                {f.title}
                              </h4>
                              {f.status === "completed" ? (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                  Done
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                                  Pending
                                </span>
                              )}
                            </div>
                            {f.note && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                {f.note}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(f.due_date).toLocaleDateString()}
                              </span>
                              <span>{f.created_by_name}</span>
                            </div>
                          </div>
                          {f.status === "pending" && (
                            <button
                              onClick={() => handleMarkDone(f.id)}
                              className="flex-shrink-0 p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                              title="Mark as done"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Follow-up Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl">
            <div className="flex items-center justify-between p-6 pb-4">
              <h3 className="text-lg font-display font-bold text-brand-dark dark:text-white">
                Create Follow-up
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brand-dark dark:text-white mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Follow-up title"
                  className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white text-sm focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-dark dark:text-white mb-1.5">
                  Note (optional)
                </label>
                <textarea
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white text-sm focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-dark dark:text-white mb-1.5">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white text-sm focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 pt-0">
              <button
                onClick={() => setShowModal(false)}
                className="h-11 px-5 rounded-xl border border-gray-300 dark:border-gray-700 text-brand-dark dark:text-white text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFollowUp}
                disabled={submitting || !formTitle.trim() || !formDueDate}
                className="inline-flex items-center gap-2 h-11 px-5 bg-brand-accent text-white rounded-xl hover:bg-brand-accent-hover disabled:opacity-50 disabled:pointer-events-none transition-colors text-sm font-semibold shadow-sm"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
