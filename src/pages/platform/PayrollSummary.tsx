import { useState, useEffect } from "react"
import { PlatformHeader } from "../../components/platform/PlatformHeader"
import { useOutletContext } from "react-router-dom"
import { formatDurationShort, formatMoney } from "../../lib/timesheet/calculate"
import { Download, ChevronLeft, ChevronRight, FileText } from "lucide-react"

export function PayrollSummary() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const getWeekRange = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    return { weekStart: monday.toISOString(), weekEnd: sunday.toISOString() }
  }

  const [weekOffset, setWeekOffset] = useState(0)

  const getWeekParams = () => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    const range = getWeekRange(d)
    return range
  }

  const fetchSummary = async () => {
    setLoading(true)
    setError(null)
    const { weekStart, weekEnd } = getWeekParams()
    try {
      const res = await fetch(`/api/realtime-timesheets/payroll/summary?weekStart=${encodeURIComponent(weekStart)}&weekEnd=${encodeURIComponent(weekEnd)}`)
      if (res.ok) setData(await res.json())
      else throw new Error("Failed to load")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSummary() }, [weekOffset])

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    setSuccess(null)
    const { weekStart, weekEnd } = getWeekParams()
    try {
      const res = await fetch("/api/realtime-timesheets/payroll/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, weekEnd }),
      })
      if (!res.ok) throw new Error("Export failed")
      const result = await res.json()

      // Download CSV
      const blob = new Blob([result.csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `payroll-export-${weekStart.split("T")[0]}-${weekEnd.split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      setSuccess(`Exported ${result.shiftCount} shifts`)
      fetchSummary()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setExporting(false)
    }
  }

  const weekLabel = data ? `${new Date(data.weekStart).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} - ${new Date(data.weekEnd).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}` : ""

  return (
    <>
      <PlatformHeader title="Payroll Summary" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="font-medium text-brand-dark dark:text-white text-lg">{weekLabel}</span>
            <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                This Week
              </button>
            )}
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || !data?.shifts?.length}
            className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>

        {loading && <p className="text-gray-500">Loading...</p>}

        {data && !loading && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-sm text-gray-400">Total Shifts</p>
                <p className="text-2xl font-bold text-brand-dark dark:text-white mt-1">{data.totalShifts}</p>
              </div>
              <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-sm text-gray-400">Total Allowances</p>
                <p className="text-2xl font-bold text-brand-dark dark:text-white mt-1">{formatMoney(data.totalAllowances)}</p>
              </div>
              <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-sm text-gray-400">Total Gross Pay</p>
                <p className="text-2xl font-bold text-brand-dark dark:text-white mt-1">{formatMoney(data.totalGross)}</p>
              </div>
            </div>

            {data.employees?.length > 0 && (
              <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Employee</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Shifts</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Base</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Overtime</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">DT</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Base Pay</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">OT Pay</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Allowances</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.employees.map((emp: any) => (
                      <tr key={emp.employeeId} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                        <td className="px-4 py-3">
                          <span className="font-medium text-brand-dark dark:text-white">{emp.employeeName}</span>
                          <span className="text-gray-400 ml-2 text-xs">{emp.shiftCount} shifts</span>
                        </td>
                        <td className="text-right px-4 py-3 text-gray-600 dark:text-gray-400">{emp.shiftCount}</td>
                        <td className="text-right px-4 py-3 text-gray-600 dark:text-gray-400">{formatDurationShort(emp.baseSeconds)}</td>
                        <td className="text-right px-4 py-3 text-gray-600 dark:text-gray-400">{formatDurationShort(emp.overtimeSeconds)}</td>
                        <td className="text-right px-4 py-3 text-gray-600 dark:text-gray-400">{formatDurationShort(emp.doubleTimeSeconds)}</td>
                        <td className="text-right px-4 py-3 text-gray-600 dark:text-gray-400">{formatMoney(emp.basePay)}</td>
                        <td className="text-right px-4 py-3 text-gray-600 dark:text-gray-400">{formatMoney(emp.overtimePay)}</td>
                        <td className="text-right px-4 py-3 text-gray-600 dark:text-gray-400">{formatMoney(emp.allowancePay)}</td>
                        <td className="text-right px-4 py-3 font-semibold text-brand-dark dark:text-white">{formatMoney(emp.totalPay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.shifts?.length > 0 && (
              <details className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800">
                <summary className="px-4 py-3 font-medium text-sm text-brand-dark dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30 rounded-xl flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  Detailed Shift List ({data.shifts.length})
                </summary>
                <div className="border-t border-gray-200 dark:border-gray-800 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900/50">
                        <th className="text-left px-3 py-2 font-medium text-gray-500">Employee</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">Date</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Payable</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Base $</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">OT $</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Gross</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Allowance</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.shifts.map((shift: any) => (
                        <tr key={shift.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                          <td className="px-3 py-2 text-brand-dark dark:text-white">{shift.employee_name}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{new Date(shift.checked_in_at).toLocaleDateString("en-AU")}</td>
                          <td className="text-right px-3 py-2 text-gray-600 dark:text-gray-400">{formatDurationShort(shift.payable_seconds || 0)}</td>
                          <td className="text-right px-3 py-2 text-gray-600 dark:text-gray-400">{formatMoney(shift.base_pay || 0)}</td>
                          <td className="text-right px-3 py-2 text-gray-600 dark:text-gray-400">{formatMoney(shift.overtime_pay || 0)}</td>
                          <td className="text-right px-3 py-2 text-gray-600 dark:text-gray-400">{formatMoney(shift.final_gross_pay || 0)}</td>
                          <td className="text-right px-3 py-2 text-gray-600 dark:text-gray-400">{formatMoney(shift.total_allowances || 0)}</td>
                          <td className="text-right px-3 py-2 font-semibold text-brand-dark dark:text-white">{(shift.final_gross_pay || 0) + (shift.total_allowances || 0) > 0 ? formatMoney((shift.final_gross_pay || 0) + (shift.total_allowances || 0)) : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}

            {data.employees?.length === 0 && !loading && (
              <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No approved shifts for this week.</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
