import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { useAuth } from "../../context/AuthContext";
import { MessageSquare, Plus, Send, CheckCircle2, XCircle, Clock, AlertCircle, UserPlus, UserMinus, Users as UsersIcon } from "lucide-react";
import { Button } from "../../components/ui/Button";

interface Project {
  id: string;
  title: string;
  client_name: string;
  status: string;
  sector: string;
  location: string;
  budget: number | null;
  start_date: string | null;
  target_date: string | null;
}

interface Update {
  id: string;
  title: string;
  message: string | null;
  status: string;
  progress_percent: number;
  image_url: string | null;
  created_by_name: string;
  created_at: string;
}

interface Variation {
  id: string;
  title: string;
  description: string | null;
  amount: number | null;
  status: string;
  requested_by_name: string | null;
  decided_by_name: string | null;
  created_at: string;
}

interface Message {
  id: string;
  message: string;
  sender_name: string;
  sender_role: string;
  sender_id?: string;
  created_at: string;
}

export function ClientPortal() {
  const { user } = useAuth();
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Client access management
  const [clientUsers, setClientUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [accessMsg, setAccessMsg] = useState("");

  const isAdmin = user?.role === "owner" || user?.role === "admin" || user?.role === "manager";

  // Load client users for admin access management
  useEffect(() => {
    if (isAdmin) {
      fetch("/api/platform/client-users")
        .then((r) => r.ok ? r.json() : [])
        .then(setClientUsers)
        .catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    fetch("/api/client-portal/projects")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setProjects(data); setLoading(false); })
      .catch(() => { setLoading(false); setError("Failed to load projects"); });
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    Promise.all([
      fetch(`/api/client-portal/projects/${selectedProject}/updates`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/client-portal/projects/${selectedProject}/variations`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/client-portal/projects/${selectedProject}/messages`).then((r) => r.ok ? r.json() : []),
    ]).then(([u, v, m]) => {
      setUpdates(u);
      setVariations(v);
      setMessages(m);
    }).catch(() => setError("Failed to load project details"));
  }, [selectedProject]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedProject) return;
    try {
      const res = await fetch(`/api/client-portal/projects/${selectedProject}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { id: data.id, message: newMessage.trim(), sender_name: user?.name || "", sender_role: user?.role || "", sender_id: user?.id, created_at: new Date().toISOString() }]);
        setNewMessage("");
      }
    } catch {}
  };

  const handleGrantAccess = async () => {
    if (!selectedProject || !selectedClientId) return;
    setAccessMsg("");
    try {
      const res = await fetch(`/api/platform/projects/${selectedProject}/client-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId }),
      });
      const data = await res.json();
      setAccessMsg(res.ok ? "Access granted" : data.error || "Failed");
    } catch { setAccessMsg("Failed to grant access"); }
  };

  const handleRevokeAccess = async (clientId: string) => {
    if (!selectedProject) return;
    setAccessMsg("");
    try {
      const res = await fetch(`/api/platform/projects/${selectedProject}/client-access/${clientId}`, { method: "DELETE" });
      const data = await res.json();
      setAccessMsg(res.ok ? "Access revoked" : data.error || "Failed");
    } catch { setAccessMsg("Failed to revoke access"); }
  };

  const handleVariationAction = async (varId: string, action: "approve" | "reject") => {
    try {
      await fetch(`/api/client-portal/variations/${varId}/${action}`, { method: "PATCH" });
      setVariations((prev) => prev.map((v) => v.id === varId ? { ...v, status: action === "approve" ? "approved" : "rejected" } : v));
    } catch {}
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
      pending: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
      approved: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
      rejected: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
      in_progress: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
      completed: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    };
    return `px-2.5 py-1 text-xs font-semibold rounded-full ${colors[status] || "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`;
  };

  if (loading) {
    return (
      <>
        <PlatformHeader title="Client Portal" onMenuClick={() => setSidebarOpen(true)} />
        <div className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PlatformHeader title="Client Portal" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {projects.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-display font-bold text-brand-dark dark:text-white mb-2">
              No Projects Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              {user?.role === "client"
                ? "You don't have any assigned projects yet. Your project manager will grant you access when your project starts."
                : "No projects with client access assigned. Grant client access from a project to get started."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-4">Projects</h2>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selectedProject === p.id ? "border-brand-accent bg-brand-accent/5" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"} bg-white dark:bg-gray-900`}
                >
                  <h3 className="font-semibold text-brand-dark dark:text-white text-sm">{p.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{p.sector} · {p.location}</p>
                  <span className={statusBadge(p.status)}>{p.status}</span>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2 space-y-8">
              {selectedProject ? (
                <>
                  {/* Client Access Management (admin only) */}
                  {isAdmin && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <UsersIcon className="w-5 h-5 text-brand-accent" />
                        <h3 className="text-lg font-display font-bold text-brand-dark dark:text-white">Client Access</h3>
                      </div>
                      {accessMsg && (
                        <p className={`text-sm mb-3 ${accessMsg.includes("denied") || accessMsg.includes("Failed") ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                          {accessMsg}
                        </p>
                      )}
                      <div className="flex gap-2 mb-3">
                        <select
                          value={selectedClientId}
                          onChange={(e) => setSelectedClientId(e.target.value)}
                          className="flex-1 h-11 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white text-sm focus:outline-none focus:ring-1 focus:border-brand-accent"
                        >
                          <option value="">Select client...</option>
                          {clientUsers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                        </select>
                        <button onClick={handleGrantAccess} className="px-4 bg-brand-accent text-white rounded-xl hover:bg-brand-accent-hover transition-colors text-sm font-semibold">
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Show current access list */}
                      {(() => {
                        const currentProject = projects.find((p) => p.id === selectedProject);
                        if (!currentProject) return null;
                        return null; // access info shown in project list panel
                      })()}
                    </div>
                  )}

                  {/* Updates Timeline */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                    <h3 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-4">Progress Updates</h3>
                    {updates.length === 0 ? (
                      <p className="text-sm text-gray-400">No updates yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {updates.map((u) => (
                          <div key={u.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-brand-dark dark:text-white text-sm">{u.title}</h4>
                              <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</span>
                            </div>
                            {u.message && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{u.message}</p>}
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>{u.created_by_name}</span>
                              {u.progress_percent > 0 && (
                                <div className="flex items-center gap-1">
                                  <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-accent rounded-full" style={{ width: `${u.progress_percent}%` }} />
                                  </div>
                                  <span>{u.progress_percent}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Variations */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                    <h3 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-4">Variations</h3>
                    {variations.length === 0 ? (
                      <p className="text-sm text-gray-400">No variations yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {variations.map((v) => (
                          <div key={v.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold text-brand-dark dark:text-white text-sm">{v.title}</h4>
                                {v.description && <p className="text-xs text-gray-500 mt-1">{v.description}</p>}
                              </div>
                              <span className={statusBadge(v.status)}>{v.status}</span>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="text-xs text-gray-500">
                                {v.amount ? `$${v.amount.toLocaleString()}` : "No amount"} · {v.requested_by_name || "Client"}
                              </div>
                              {v.status === "pending" && (
                                <div className="flex gap-2">
                                  <button onClick={() => handleVariationAction(v.id, "approve")} className="p-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40"><CheckCircle2 className="w-4 h-4" /></button>
                                  <button onClick={() => handleVariationAction(v.id, "reject")} className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40"><XCircle className="w-4 h-4" /></button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                    <h3 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-4">Messages</h3>
                    <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                      {messages.length === 0 ? (
                        <p className="text-sm text-gray-400">No messages yet.</p>
                      ) : (
                        messages.map((m) => (
                          <div key={m.id} className={`p-3 rounded-xl ${m.sender_id === user?.id ? "bg-brand-accent/10 ml-8" : "bg-gray-50 dark:bg-gray-800/50 mr-8"}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-brand-dark dark:text-white">{m.sender_name}</span>
                              <span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{m.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent text-sm"
                      />
                      <button onClick={handleSendMessage} className="px-4 bg-brand-accent text-white rounded-xl hover:bg-brand-accent-hover transition-colors">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-gray-400">Select a project to view details.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
