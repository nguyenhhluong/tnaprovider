import { useState, useEffect } from "react"
import { PageHeader } from "../../components/shared/PageHeader"
import { LoadingState } from "../../components/shared/LoadingState"
import { EmptyState } from "../../components/shared/EmptyState"
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

type PayRuleFormState = {
  name: string
  ordinary_hours_per_day: string
  overtime_daily_after_hours: string
  overtime_rate_multiplier: string
  double_time_after_hours: string
  double_time_multiplier: string
  is_active: boolean
}

function parseRequiredPositiveNumber(value: string, label: string) {
  const cleaned = value.trim()
  if (cleaned === "") return { value: null, error: `${label} is required.` }
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed) || parsed <= 0) return { value: null, error: `${label} must be greater than 0.` }
  return { value: parsed, error: null }
}

function parseOptionalPositiveNumber(value: string, label: string) {
  const cleaned = value.trim()
  if (cleaned === "") return { value: null, error: null }
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed) || parsed <= 0) return { value: null, error: `${label} must be greater than 0.` }
  return { value: parsed, error: null }
}

export function PayRules() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>()
  const [rules, setRules] = useState<PayRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<PayRuleFormState>({
    name: "",
    ordinary_hours_per_day: "",
    overtime_daily_after_hours: "",
    overtime_rate_multiplier: "",
    double_time_after_hours: "",
    double_time_multiplier: "",
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
    setForm({ name: "", ordinary_hours_per_day: "", overtime_daily_after_hours: "", overtime_rate_multiplier: "", double_time_after_hours: "", double_time_multiplier: "", is_active: false })
    setErrors([])
    setEditingId(null)
    setShowNewForm(false)
  }

  const startEdit = (rule: PayRule) => {
    setForm({
      name: rule.name,
      ordinary_hours_per_day: String(rule.ordinary_hours_per_day),
      overtime_daily_after_hours: String(rule.overtime_daily_after_hours),
      overtime_rate_multiplier: String(rule.overtime_rate_multiplier),
      double_time_after_hours: rule.double_time_after_hours ? String(rule.double_time_after_hours) : "",
      double_time_multiplier: String(rule.double_time_multiplier),
      is_active: !!rule.is_active,
    })
    setErrors([])
    setEditingId(rule.id)
    setShowNewForm(true)
  }

  const updateField = (name: keyof PayRuleFormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors([])
  }

  const handleSave = async () => {
    setErrors([])
    setSuccess(null)

    const nameError = form.name.trim() ? null : "Name is required."
    const errs = [
      nameError,
      parseRequiredPositiveNumber(form.ordinary_hours_per_day, "Ordinary hours per day").error,
      parseRequiredPositiveNumber(form.overtime_daily_after_hours, "Overtime after hours").error,
      parseRequiredPositiveNumber(form.overtime_rate_multiplier, "Overtime multiplier").error,
      parseOptionalPositiveNumber(form.double_time_after_hours, "Double time after").error,
      parseRequiredPositiveNumber(form.double_time_multiplier, "Double time multiplier").error,
    ].filter((e): e is string => e !== null)

    if (errs.length > 0) {
      setErrors(errs)
      return
    }

    const ordinary = Number(form.ordinary_hours_per_day)
    const otAfter = Number(form.overtime_daily_after_hours)
    const otMult = Number(form.overtime_rate_multiplier)
    const dtAfter = form.double_time_after_hours.trim() ? Number(form.double_time_after_hours) : null
    const dtMult = Number(form.double_time_multiplier)

    setSaving(true)

    const body: any = {
      name: form.name.trim(),
      ordinary_hours_per_day: ordinary,
      overtime_daily_after_hours: otAfter,
      overtime_rate_multiplier: otMult,
      double_time_multiplier: dtMult,
      double_time_after_hours: dtAfter,
      is_active: form.is_active ? 1 : 0,
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
      setErrors([e.message])
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
      setErrors([e.message])
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
      setErrors([e.message])
    }
  }

  const NumericInput = ({ label, field, placeholder }: { label: string; field: keyof PayRuleFormState; placeholder?: string }) => (
    <div>
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={form[field] as string}
        onChange={(e) => updateField(field, e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-brand-dark dark:text-white"
      />
    </div>
  )

  return (
    <>
      <PageHeader title="Pay Rules" description="Configure overtime, double time, and ordinary hours for payroll calculations." onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {errors.length > 0 && (
          <div className="flex flex-col gap-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
            {errors.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {e}
              </div>
            ))}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-brand-dark dark:text-white" />
              </div>
              <NumericInput label="Ordinary Hours / Day" field="ordinary_hours_per_day" />
              <NumericInput label="OT After (hours)" field="overtime_daily_after_hours" />
              <NumericInput label="OT Multiplier" field="overtime_rate_multiplier" />
              <NumericInput label="Double Time After (hours)" field="double_time_after_hours" placeholder="Leave empty to disable" />
              <NumericInput label="DT Multiplier" field="double_time_multiplier" />
            </div>
            <p className="text-xs text-gray-400">Double Time After: overtime shifts to double time after this many hours. Leave empty to disable double time.</p>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active_form" checked={form.is_active} onChange={(e) => updateField("is_active", e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
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

        {loading && <LoadingState message="Loading pay rules..." />}

        {!loading && rules.length === 0 && !showNewForm && (
          <EmptyState icon={Plus} title="No pay rules" message="No pay rules configured yet. Create one to get started." action={{ label: "Create Rule", onClick: () => { resetForm(); setShowNewForm(true) } }} />
        )}

        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className={`bg-white dark:bg-brand-darker rounded-xl border p-5 ${rule.is_active ? "border-brand-accent/30 ring-1 ring-brand-accent/20" : "border-gray-200 dark:border-gray-800"}`}>
              <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
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
