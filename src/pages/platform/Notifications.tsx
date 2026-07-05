import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { SEO } from "../../components/SEO";
import { PageHeader } from "../../components/shared/PageHeader";
import { useAuth } from "../../context/AuthContext";
import {
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  Settings,
  Clock,
  Plus,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
  MailOpen,
  Mail,
  Filter,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/ui/Button";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  status: string;
  channel: string;
  created_at: string;
  read_at: string | null;
  entity_type: string | null;
  entity_id: string | null;
}

interface NotificationPreferences {
  leads: boolean;
  quotes: boolean;
  tasks: boolean;
  projects: boolean;
  maintenance: boolean;
}

interface ReminderRule {
  id: string;
  name: string;
  type: string;
  offset_hours: number;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

type Tab = "notifications" | "preferences" | "reminders";

const TYPE_LABELS: Record<string, string> = {
  lead_followup: "Lead Follow-up",
  quote_expiry: "Quote Expiry",
  task_due: "Task Due",
  project_due: "Project Due",
  maintenance_pending: "Maintenance Pending",
};

const FILTER_TYPES = ["", "lead_followup", "quote_expiry", "task_due", "project_due", "maintenance_pending"];

const DEFAULT_PREFERENCES: NotificationPreferences = {
  leads: true,
  quotes: true,
  tasks: true,
  projects: true,
  maintenance: true,
};

export function Notifications() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const { user } = useAuth();
  const isOwnerAdmin = user?.role === "owner" || user?.role === "admin";
  const isOwnerAdminManager = isOwnerAdmin || user?.role === "manager";

  const [activeTab, setActiveTab] = useState<Tab>("notifications");

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [markAllLoading, setMarkAllLoading] = useState(false);

  // Preferences
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [prefsSuccess, setPrefsSuccess] = useState(false);

  // Reminder Rules
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState({ name: "", type: "lead_followup", offset_hours: 24 });
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleFormError, setRuleFormError] = useState<string | null>(null);
  const [runRemindersLoading, setRunRemindersLoading] = useState(false);
  const [runRemindersResult, setRunRemindersResult] = useState<{ success: boolean; message: string } | null>(null);

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    setNotifError(null);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const body = await res.json();
      setNotifications(body.notifications || []);
    } catch (err) {
      setNotifError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setNotifLoading(false);
    }
  }, [filterType]);

  const fetchPreferences = useCallback(async () => {
    setPrefsLoading(true);
    try {
      const res = await fetch("/api/notifications/preferences");
      if (res.ok) setPreferences(await res.json());
    } catch {} finally {
      setPrefsLoading(false);
    }
  }, []);

  const fetchReminderRules = useCallback(async () => {
    if (!isOwnerAdminManager) return;
    setRulesLoading(true);
    setRulesError(null);
    try {
      const res = await fetch("/api/notifications/reminder-rules");
      if (!res.ok) throw new Error("Failed to fetch reminder rules");
      setReminderRules(await res.json());
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : "Failed to load reminder rules");
    } finally {
      setRulesLoading(false);
    }
  }, [isOwnerAdminManager]);

  useEffect(() => {
    if (activeTab === "notifications") fetchNotifications();
  }, [fetchNotifications, activeTab]);

  useEffect(() => {
    if (activeTab === "preferences") fetchPreferences();
  }, [fetchPreferences, activeTab]);

  useEffect(() => {
    if (activeTab === "reminders") fetchReminderRules();
  }, [fetchReminderRules, activeTab]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error();
    } catch {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    }
  };

  const handleMarkAllRead = async () => {
    setMarkAllLoading(true);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark all as read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      setNotifError("Failed to mark all as read");
    } finally {
      setMarkAllLoading(false);
    }
  };

  const handleTogglePreference = async (key: keyof NotificationPreferences) => {
    const newVal = !preferences[key];
    const updated = { ...preferences, [key]: newVal };
    setPreferences(updated);
    setPrefsSaving(true);
    setPrefsError(null);
    setPrefsSuccess(false);
    try {
      const body: Record<string, boolean> = {};
      body[`notify_${key}`] = newVal;
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      setPrefsSuccess(true);
    } catch (err) {
      setPreferences(preferences);
      setPrefsError(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleToggleRule = async (rule: ReminderRule) => {
    try {
      const res = await fetch(`/api/notifications/reminder-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (res.ok) await fetchReminderRules();
    } catch {
      // ignore
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setRuleFormError(null);
    if (!ruleForm.name.trim()) {
      setRuleFormError("Name is required");
      return;
    }
    if (ruleForm.offset_hours < 1) {
      setRuleFormError("Interval must be at least 1 hour");
      return;
    }
    setRuleSaving(true);
    try {
      const res = await fetch("/api/notifications/reminder-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create rule");
      }
      await fetchReminderRules();
      setShowCreateRule(false);
      setRuleForm({ name: "", type: "lead_followup", offset_hours: 24 });
    } catch (err) {
      setRuleFormError(err instanceof Error ? err.message : "Failed to create rule");
    } finally {
      setRuleSaving(false);
    }
  };

  const handleEditRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRuleId) return;
    setRuleFormError(null);
    if (!ruleForm.name.trim()) {
      setRuleFormError("Name is required");
      return;
    }
    if (ruleForm.offset_hours < 1) {
      setRuleFormError("Interval must be at least 1 hour");
      return;
    }
    setRuleSaving(true);
    try {
      const res = await fetch(`/api/notifications/reminder-rules/${editingRuleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update rule");
      }
      await fetchReminderRules();
      setEditingRuleId(null);
    } catch (err) {
      setRuleFormError(err instanceof Error ? err.message : "Failed to update rule");
    } finally {
      setRuleSaving(false);
    }
  };

  const handleRunReminders = async () => {
    setRunRemindersLoading(true);
    setRunRemindersResult(null);
    try {
      const res = await fetch("/api/notifications/run-reminders", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setRunRemindersResult({ success: true, message: data.message || "Reminders triggered successfully" });
        fetchReminderRules();
      } else {
        setRunRemindersResult({ success: false, message: data.error || "Failed to run reminders" });
      }
    } catch {
      setRunRemindersResult({ success: false, message: "Failed to run reminders" });
    } finally {
      setRunRemindersLoading(false);
    }
  };

  const startEditRule = (rule: ReminderRule) => {
    setRuleForm({ name: rule.name, type: rule.type, offset_hours: rule.offset_hours });
    setEditingRuleId(rule.id);
    setShowCreateRule(false);
    setRuleFormError(null);
  };

  const cancelForm = () => {
    setShowCreateRule(false);
    setEditingRuleId(null);
    setRuleForm({ name: "", type: "lead_followup", offset_hours: 24 });
    setRuleFormError(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "lead": return <Filter className="w-4 h-4" />;
      case "quote": return <Bell className="w-4 h-4" />;
      case "task": return <CheckCircle2 className="w-4 h-4" />;
      case "project": return <Clock className="w-4 h-4" />;
      case "maintenance": return <Settings className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Bell }[] = [
    { key: "notifications", label: "Notifications", icon: BellRing },
    { key: "preferences", label: "Preferences", icon: Settings },
    { key: "reminders", label: "Reminder Rules", icon: Clock },
  ];

  const filterLabels: Record<string, string> = {
    "": "All",
    lead: "Leads",
    quote: "Quotes",
    task: "Tasks",
    project: "Projects",
    maintenance: "Maintenance",
  };

  return (
    <>
      <SEO title="Notifications | TNA Provider Platform" description="Manage notifications, preferences, and reminder rules." canonical="https://tnaprovider.com.au/platform/notifications" />
      <PageHeader title="Notifications" description="Manage your notifications and preferences." onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-8 max-w-4xl">

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white dark:bg-gray-900 rounded-xl p-1 shadow-sm border border-gray-100 dark:border-gray-800 overflow-x-auto">
        {tabs.map((tab) => {
          const disabled = tab.key === "reminders" && !isOwnerAdminManager;
          return (
            <button
              key={tab.key}
              onClick={() => !disabled && setActiveTab(tab.key)}
              disabled={disabled}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                disabled
                  ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  : activeTab === tab.key
                    ? "bg-brand-accent/10 text-brand-accent"
                    : "text-gray-500 dark:text-gray-400 hover:text-brand-dark dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-accent/10 text-brand-accent">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllLoading}
              >
                {markAllLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <CheckCheck className="w-4 h-4 mr-1" />
                )}
                Mark all read
              </Button>
            )}
          </div>

          {/* Type filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {FILTER_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === type
                    ? "bg-brand-accent text-white"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-accent/30"
                }`}
              >
                {filterLabels[type]}
              </button>
            ))}
          </div>

          {/* Error */}
          {notifError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{notifError}</p>
            </div>
          )}

          {/* Loading */}
          {notifLoading ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-12 text-center">
              <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No notifications found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => notif.status !== 'read' && handleMarkAsRead(notif.id)}
                  className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                    notif.status === 'read'
                      ? "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                      : "bg-brand-accent/5 dark:bg-brand-accent/10 border-brand-accent/20 dark:border-brand-accent/30"
                  } hover:bg-gray-50 dark:hover:bg-gray-800/50`}
                >
                  <div className={`mt-0.5 shrink-0 ${notif.status === 'read' ? "text-gray-300 dark:text-gray-600" : "text-brand-accent"}`}>
                    {notif.status === 'read' ? <MailOpen className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`text-sm font-semibold ${notif.status === 'read' ? "text-gray-600 dark:text-gray-400" : "text-brand-dark dark:text-white"}`}>
                        {notif.title}
                      </span>
                      {notif.channel === 'email_mock' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                          (internal notification only)
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${notif.status === 'read' ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-300"}`}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-gray-400">{new Date(notif.created_at).toLocaleString()}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400 capitalize">
                        {getTypeIcon(notif.type)}
                        {TYPE_LABELS[notif.type] || notif.type}
                      </span>
                    </div>
                  </div>
                  {notif.status !== 'read' && (
                    <span className="w-2 h-2 rounded-full bg-brand-accent shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === "preferences" && (
        <div>
          <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-1">Notification Preferences</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choose which types of notifications you receive.</p>

          {prefsError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{prefsError}</p>
            </div>
          )}

          {prefsSuccess && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">Preferences saved.</p>
            </div>
          )}

          {prefsLoading ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
              {(Object.keys(TYPE_LABELS) as (keyof NotificationPreferences)[]).map((key) => (
                <div key={key} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-semibold text-brand-dark dark:text-white capitalize">{TYPE_LABELS[key]}</p>
                    <p className="text-xs text-gray-500">Receive notifications for {TYPE_LABELS[key].toLowerCase()} activity</p>
                  </div>
                  <button
                    onClick={() => handleTogglePreference(key)}
                    disabled={prefsSaving}
                    className={`transition-colors ${prefsSaving ? "opacity-50" : ""}`}
                  >
                    {preferences[key] ? (
                      <ToggleRight className="w-8 h-8 text-brand-accent" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reminder Rules Tab */}
      {activeTab === "reminders" && isOwnerAdminManager && (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div>
              <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-1">Reminder Rules</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Automate notification reminders for platform activity.</p>
            </div>
            <div className="flex items-center gap-2">
              {isOwnerAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunReminders}
                  disabled={runRemindersLoading}
                >
                  {runRemindersLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Bell className="w-4 h-4 mr-1" />
                  )}
                  Run Reminders
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => { cancelForm(); setShowCreateRule(true); }}
              >
                <Plus className="w-4 h-4 mr-1" />
                New Rule
              </Button>
            </div>
          </div>

          {runRemindersResult && (
            <div className={`mb-4 p-4 rounded-xl border flex items-start gap-3 ${
              runRemindersResult.success
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}>
              {runRemindersResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              )}
              <p className={`text-sm ${runRemindersResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                {runRemindersResult.message}
              </p>
            </div>
          )}

          {/* Create / Edit form */}
          {(showCreateRule || editingRuleId) && (
            <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
              <h3 className="text-sm font-bold text-brand-dark dark:text-white mb-4">
                {editingRuleId ? "Edit Rule" : "Create Rule"}
              </h3>
              <form onSubmit={editingRuleId ? handleEditRule : handleCreateRule} className="flex flex-col gap-4 max-w-md">
                {ruleFormError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-300">{ruleFormError}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rule Name</label>
                  <input
                    type="text"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Type</label>
                  <select
                    value={ruleForm.type}
                    onChange={(e) => setRuleForm((p) => ({ ...p, type: e.target.value }))}
                    className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full"
                  >
                    {Object.entries(TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Interval (hours)</label>
                  <input
                    type="number"
                    min={1}
                    value={ruleForm.offset_hours}
                    onChange={(e) => setRuleForm((p) => ({ ...p, offset_hours: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" size="md" disabled={ruleSaving}>
                    {ruleSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {ruleSaving ? "Saving..." : editingRuleId ? "Update Rule" : "Create Rule"}
                  </Button>
                  <Button type="button" variant="ghost" size="md" onClick={cancelForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Rules list */}
          {rulesLoading ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
            </div>
          ) : rulesError ? (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{rulesError}</p>
            </div>
          ) : reminderRules.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-12 text-center">
              <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No reminder rules configured. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reminderRules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-brand-dark dark:text-white">{rule.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        rule.enabled
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}>
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {TYPE_LABELS[rule.type] || rule.type} · Every {rule.offset_hours}h
                    </p>
                    {rule.lastRun && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Last run: {new Date(rule.lastRun).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleRule(rule)}
                      className="transition-colors"
                      title={rule.enabled ? "Disable" : "Enable"}
                    >
                      {rule.enabled ? (
                        <ToggleRight className="w-7 h-7 text-brand-accent" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={() => startEditRule(rule)}
                      className="p-2 text-gray-400 hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}

export default Notifications;
