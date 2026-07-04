import { useState, useEffect } from "react"
import { PlatformHeader } from "../../components/platform/PlatformHeader"
import { useOutletContext } from "react-router-dom"
import { Plus, Save, Trash2, AlertCircle, Check } from "lucide-react"

interface PayRule {
  id: number
  name: string
  ordinary_hours_per_day: number
  ordinary_hours_per_week: number
  overtime_daily_after_hours: number
  overtime_weekly_after_hours: number
  overtime_rate_multiplier: number
  double_time_after_hours: number | null
  double_time_multiplier: number
  is_active: number
}

export function PayRules() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>()
  const [rules, setRules] = useState<PayRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: "",
    ordinary_hours_per_day: 7.6,
    overtime_daily_after_hours: 7.6,
    overtime_rate_multiplier: 1.5,
    double_time_after_hours: "",
    double_time_multiplier: 2,
    is_active: false,
  })

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/realtime-timesheets/pay-rules")
      if (res.ok) setRules(await res.json())
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRules() }, [])

  const resetForm = () => {
    setForm({ name: "", ordinary_hours_per_day: 7.6, overtime_daily_after_hours: 7.6, overtime_rate_multiplier: 1.5, double_time_after_hours: "", double_time_multiplier: 2, is_active: false })
    setEditingId(null)
    setShowNewForm(false)
  }

  const startEdit = (rule: PayRule) => {
    setForm({ name: rule.name, ordinary_hours_per_day: rule.ordinary_hours_per_day, overtime_daily_after_hours: rule.overtime_daily_after_hours, overtime_rate_multiplier: rule.overtime_rate_multiplier, double_time_after_hours: rule.double_time_after_hours ? String(rule.double_time_after_hours) : "", double_time_multiplier: rule.double_time_multiplier, is_active: !!rule.is_active })
    setEditingId(rule.id)
    setShowNewForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return }
    setSaving(true)
    setError(null)
    setSuccess(null)

    const body: any = {
      name: form.name,
      ordinary_hours_per_day: form.ordinary_hours_per_day,
      overtime_daily_after_hours: form.overtime_daily_after_hours,
      overtime_rate_multiplier: form.overtime_rate_multiplier,
      double_time_multiplier: form.double_time_multiplier,
      double_time_after_hours: form.double_time_after_hours ? parseFloat(form.double_time_after_hours) : null,
    }

    try {
      const url = editingId ? `/api/realtime-timesheets/pay-rules/${editingId}` : "/api/realtime-timesheets/pay-rules"
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error("Failed to save")
      await fetchRules()
      setSuccess(editingId ? "Rule updated" : "Rule created")
      resetForm()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ruleId: number) => {
    if (!confirm("Delete this pay rule?")) return
    try {
      const res = await fetch(`/api/realtime-timesheets/pay-rules/${ruleId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setRules((prev) => prev.filter((r) => r.id !== ruleId))
      setSuccess("Rule deleted")
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleSetActive = async (ruleId: number) => {
    try {
      const res = await fetch(`/api/realtime-timesheets/pay-rules/${ruleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: 1 }),
      })
      if (!res.ok) throw new Error("Failed to set active")
      await fetchRules()
      setSuccess("Active rule updated")
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <>
      <PlatformHeader title="Pay Rules" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-600 dark:text-green-400">
            <Check className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => { resetForm(); setShowNewForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        </div>

        {showNewForm && (
          <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <h3 className="font-semibold text-brand-dark dark:text-white">{editingId ? "Edit Rule" : "New Rule"}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-brand-dark dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Ordinary Hours/Day</label>
                <input type="number" step="0.1" value={form.ordinary_hours_per_day} onChange={(e) => setForm({ ...form, ordinary_hours_per_day: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-brand-dark dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">OT After (hours)</label>
                <input type="number" step="0.1" value={form.overtime_daily_after_hours} onChange={(e) => setForm({ ...form, overtime_daily_after_hours: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-brand-dark dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">OT Multiplier</label>
                <input type="number" step="0.1" value={form.overtime_rate_multiplier} onChange={(e) => setForm({ ...form, overtime_rate_multiplier: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-brand-dark dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Double Time After</label>
                <input type="number" step="0.1" value={form.double_time_after_hours} onChange={(e) => setForm({ ...form, double_time_after_hours: e.target.value })} placeholder="Leave empty to disable" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-brand-dark dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">DT Multiplier</label>
                <input type="number" step="0.1" value={form.double_time_multiplier} onChange={(e) => setForm({ ...form, double_time_multiplier: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-brand-dark dark:text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active_form" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
              <label htmlFor="is_active_form" className="text-sm font-medium text-gray-600 dark:text-gray-400">Set as active rule</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent/90 disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={resetForm} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading && <p className="text-gray-500">Loading rules...</p>}

        {!loading && rules.length === 0 && !showNewForm && (
          <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <p className="text-gray-500">No pay rules configured yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className={`bg-white dark:bg-brand-darker rounded-xl border p-5 ${rule.is_active ? "border-brand-accent/30 ring-1 ring-brand-accent/20" : "border-gray-200 dark:border-gray-800"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-brand-dark dark:text-white">{rule.name}</h3>
                  {rule.is_active && <span className="text-xs bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded-full font-medium">Active</span>}
                </div>
                <div className="flex items-center gap-2">
                  {!rule.is_active && (
                    <button onClick={() => handleSetActive(rule.id)} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                      Set Active
                    </button>
                  )}
                  <button onClick={() => startEdit(rule)} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="text-xs px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-500 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-400">Ordinary:</span> <span className="text-brand-dark dark:text-white font-medium">{rule.ordinary_hours_per_day}h/day</span></div>
                <div><span className="text-gray-400">Overtime:</span> <span className="text-brand-dark dark:text-white font-medium">×{rule.overtime_rate_multiplier} after {rule.overtime_daily_after_hours}h</span></div>
                <div><span className="text-gray-400">Double Time:</span> <span className="text-brand-dark dark:text-white font-medium">{rule.double_time_after_hours ? `×${rule.double_time_multiplier} after ${rule.double_time_after_hours}h` : "Not set"}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
