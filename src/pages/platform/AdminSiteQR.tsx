import { useState, useEffect } from "react"
import { PlatformHeader } from "../../components/platform/PlatformHeader"
import { useOutletContext } from "react-router-dom"
import { QRCodeCanvas } from "qrcode.react"
import { MapPin, RefreshCw, Check, Copy, QrCode } from "lucide-react"

export function AdminSiteQR() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>()
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedSite, setSelectedSite] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const origin = window.location.origin

  const fetchSites = async () => {
    try {
      const res = await fetch("/api/realtime-timesheets/sites/admin")
      if (res.ok) setSites(await res.json())
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchSites() }, [])

  const handleRegenerate = async (siteId: string) => {
    setRegenerating(siteId)
    setError(null)
    try {
      const res = await fetch(`/api/realtime-timesheets/sites/${siteId}/qr-token`, { method: "PUT" })
      if (!res.ok) throw new Error("Failed to regenerate")
      const data = await res.json()
      setSites((prev) => prev.map((s) => s.id === siteId ? { ...s, qr_token: data.qrToken } : s))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRegenerating(null)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {}
  }

  return (
    <>
      <PlatformHeader title="Site QR Codes" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && <p className="text-gray-500">Loading sites...</p>}

        {!loading && sites.length === 0 && (
          <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No work sites found. Create a site first.</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {sites.map((site) => {
            const checkInUrl = `${origin}/platform/qr-check-in/${site.qr_token}`
            return (
              <div
                key={site.id}
                className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-brand-dark dark:text-white">{site.name}</h3>
                    {site.address && (
                      <p className="text-sm text-gray-500 mt-0.5">{site.address}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${site.qr_enabled ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {site.qr_enabled ? "Active" : "Disabled"}
                  </span>
                </div>

                <div className="flex justify-center py-2">
                  <div className="bg-white p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                    <QRCodeCanvas value={checkInUrl} size={140} level="M" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Check-in URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={checkInUrl}
                      className="flex-1 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-gray-600 dark:text-gray-400 truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(checkInUrl, site.id)}
                      className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      title="Copy URL"
                    >
                      {copiedId === site.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setSelectedSite(site)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-accent/10 text-brand-accent rounded-lg text-sm font-medium hover:bg-brand-accent/20 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    View QR
                  </button>
                  <button
                    onClick={() => handleRegenerate(site.id)}
                    disabled={regenerating === site.id}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${regenerating === site.id ? "animate-spin" : ""}`} />
                    Regenerate
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {selectedSite && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSite(null)}>
            <div className="bg-white dark:bg-brand-darker rounded-2xl p-8 max-w-sm w-full text-center space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-brand-dark dark:text-white">{selectedSite.name}</h3>
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                  <QRCodeCanvas value={`${origin}/platform/qr-check-in/${selectedSite.qr_token}`} size={220} level="M" />
                </div>
              </div>
              <p className="text-xs text-gray-400">Scan to check in at this site</p>
              <button
                onClick={() => setSelectedSite(null)}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
