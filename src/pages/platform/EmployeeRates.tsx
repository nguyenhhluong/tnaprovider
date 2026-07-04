import { useState, useEffect } from "react"
import { PlatformHeader } from "../../components/platform/PlatformHeader"
import { useOutletContext } from "react-router-dom"
import { formatMoney } from "../../lib/timesheet/calculate"
import { DollarSign, Save, AlertCircle } from "lucide-react"

export function EmployeeRates() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>()
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editRates, setEditRates] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/realtime-timesheets/admin/employees")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setEmployees(data)
        const rates: Record<string, string> = {}
        for (const emp of data) {
          rates[emp.id] = emp.hourly_rate != null ? String(emp.hourly_rate) : ""
        }
        setEditRates(rates)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (userId: string) => {
    const rate = parseFloat(editRates[userId])
    if (isNaN(rate) || rate <= 0) {
      setError("Rate must be a positive number")
      return
    }
    setSaving(userId)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/realtime-timesheets/admin/employees/${userId}/rate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hourlyRate: rate }),
      })
      if (res.ok) {
        setSuccess(`Rate updated to ${formatMoney(rate)}`)
        setEmployees((prev) =>
          prev.map((e) => (e.id === userId ? { ...e, hourly_rate: rate } : e))
        )
      } else {
        const err = await res.json()
        setError(err.error || "Failed to save rate")
      }
    } catch {
      setError("Network error")
    } finally {
      setSaving(null)
    }
  }

  return (
    <>
      <PlatformHeader title="Employee Rates" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm">
            {success}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hourly Rates</h2>
            <p className="text-sm text-gray-500">Set hourly rates for employees. Workers cannot check in without a valid rate.</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {employees.map((emp) => (
                <div key={emp.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{emp.name}</p>
                    <p className="text-sm text-gray-500 truncate">{emp.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">
                      <DollarSign className="w-3.5 h-3.5 inline" />
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editRates[emp.id] ?? ""}
                      onChange={(e) =>
                        setEditRates((prev) => ({ ...prev, [emp.id]: e.target.value }))
                      }
                      placeholder="Rate"
                      className="w-24 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-sm text-right tabular-nums"
                    />
                    <span className="text-sm text-gray-400">/hr</span>
                  </div>
                  <button
                    onClick={() => handleSave(emp.id)}
                    disabled={saving === emp.id}
                    className="px-3 py-1.5 bg-brand-accent text-white rounded-lg text-sm hover:bg-brand-accent-hover disabled:opacity-50 flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving === emp.id ? "Saving..." : "Save"}
                  </button>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    emp.hourly_rate
                      ? "bg-green-50 text-green-600 dark:bg-green-900/20"
                      : "bg-red-50 text-red-600 dark:bg-red-900/20"
                  }`}>
                    {emp.hourly_rate ? formatMoney(emp.hourly_rate) : "Not set"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
