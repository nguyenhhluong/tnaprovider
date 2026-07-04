import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { StatusBadge } from "../../components/platform/StatusBadge";
import { SEO } from "../../components/SEO";
import {
  FileText,
  Plus,
  X,
  AlertCircle,
  Loader2,
  Send,
  CheckCircle2,
  Ban,
  Repeat,
  ExternalLink,
  Trash2,
  GripVertical,
  Eye,
  FileSpreadsheet,
} from "lucide-react";

type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
type RequestStatus = "new" | "quoted" | "converted" | "closed";
type Tab = "requests" | "quotes" | "builder";

interface QuoteRequest {
  id: string;
  title: string;
  scope: string | null;
  location: string | null;
  budget: number | null;
  lead_name: string | null;
  lead_email: string | null;
  status: string;
  created_at: string;
}

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

interface Quote {
  id: string;
  request_id?: string;
  quote_request_id?: string;
  quote_number?: string;
  lead_name?: string;
  lead_email?: string;
  client_name?: string;
  title: string;
  status: QuoteStatus;
  items: QuoteItem[];
  subtotal: number;
  gst: number;
  total: number;
  notes?: string;
  created_at: string;
  sent_at?: string;
  accepted_at?: string;
  expires_at?: string;
}

const QUOTE_STATUSES: QuoteStatus[] = ["draft", "sent", "accepted", "rejected", "expired", "converted"];

const GST_RATE = 0.1;

function calcItemTotal(qty: number, price: number): number {
  return Math.round(qty * price * 100) / 100;
}

function calcSubtotal(items: QuoteItem[]): number {
  return items.reduce((sum, i) => sum + i.total, 0);
}

function calcGst(subtotal: number): number {
  return Math.round(subtotal * GST_RATE * 100) / 100;
}

function calcTotal(subtotal: number, gst: number): number {
  return Math.round((subtotal + gst) * 100) / 100;
}

function recalcItems(items: QuoteItem[]): QuoteItem[] {
  return items.map((i) => ({
    ...i,
    total: calcItemTotal(i.quantity, i.unit_price),
  }));
}

function emptyItem(): Omit<QuoteItem, "id"> {
  return { description: "", quantity: 1, unit: "each", unit_price: 0, total: 0 };
}

const UNIT_OPTIONS = ["each", "m", "m2", "m3", "hr", "day", "week", "lot", "set", "kg", "t"];

export default function Quotes() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const [tab, setTab] = useState<Tab>("requests");

  // Quote Requests
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ title: "", scope: "", location: "", budget: "", target_date: "" });
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Quotes
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [quotesError, setQuotesError] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteDetailLoading, setQuoteDetailLoading] = useState(false);
  const [quoteActionLoading, setQuoteActionLoading] = useState<string | null>(null);
  const [sendDate, setSendDate] = useState("");

  // Quote Builder
  const [builderSubject, setBuilderSubject] = useState("");
  const [builderClientName, setBuilderClientName] = useState("");
  const [builderClientEmail, setBuilderClientEmail] = useState("");
  const [builderNotes, setBuilderNotes] = useState("");
  const [builderItems, setBuilderItems] = useState<QuoteItem[]>([]);
  const [builderSubmitting, setBuilderSubmitting] = useState(false);

  // Preview
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);

  const builderSubtotal = calcSubtotal(builderItems);
  const builderGst = calcGst(builderSubtotal);
  const builderTotal = calcTotal(builderSubtotal, builderGst);

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError("");
    try {
      const res = await fetch("/api/quotes/requests", { credentials: "include" });
      if (res.ok) {
        setRequests(await res.json());
      } else {
        setRequestsError("Failed to load quote requests");
      }
    } catch {
      setRequestsError("Failed to load quote requests");
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const fetchQuotes = useCallback(async () => {
    setQuotesLoading(true);
    setQuotesError("");
    try {
      const res = await fetch("/api/quotes", { credentials: "include" });
      if (res.ok) {
        setQuotes(await res.json());
      } else {
        setQuotesError("Failed to load quotes");
      }
    } catch {
      setQuotesError("Failed to load quotes");
    } finally {
      setQuotesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchQuotes();
  }, [fetchRequests, fetchQuotes]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSubmitting(true);
    try {
      const res = await fetch("/api/quotes/requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestForm),
      });
      if (res.ok) {
        const created = await res.json();
        setRequests((prev) => [created, ...prev]);
        setShowRequestModal(false);
        setRequestForm({ title: "", scope: "", location: "", budget: "", target_date: "" });
      }
    } catch {
      // ignore
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleSelectQuote = async (quote: Quote) => {
    setSelectedQuote(quote);
    if (quote.items?.length) return;
    setQuoteDetailLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { credentials: "include" });
      if (res.ok) {
        const full = await res.json();
        setSelectedQuote(full);
      }
    } catch {
      // ignore
    } finally {
      setQuoteDetailLoading(false);
    }
  };

  const handleQuoteAction = async (id: string, action: string, body?: Record<string, unknown>) => {
    setQuoteActionLoading(`${action}_${id}`);
    try {
      const res = await fetch(`/api/quotes/${id}/${action}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) {
        const updated = await res.json();
        setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, ...updated } : q)));
        if (selectedQuote?.id === id) setSelectedQuote((prev) => (prev ? { ...prev, ...updated } : null));
        if (action === "send") setSendDate("");
      }
    } catch {
      // ignore
    } finally {
      setQuoteActionLoading(null);
    }
  };

  const handleConvertToProject = async (id: string) => {
    setQuoteActionLoading(`convert_${id}`);
    try {
      const res = await fetch(`/api/quotes/${id}/convert-to-project`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const updated = await res.json();
        setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, ...updated } : q)));
        if (selectedQuote?.id === id) setSelectedQuote((prev) => (prev ? { ...prev, ...updated } : null));
      }
    } catch {
      // ignore
    } finally {
      setQuoteActionLoading(null);
    }
  };

  // Builder item handlers
  const addBuilderItem = () => {
    const newItem: QuoteItem = {
      id: crypto.randomUUID?.() || `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ...emptyItem(),
    };
    setBuilderItems((prev) => [...prev, newItem]);
  };

  const updateBuilderItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    setBuilderItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, [field]: value };
        if (field === "quantity" || field === "unit_price") {
          next.total = calcItemTotal(
            field === "quantity" ? (value as number) : item.quantity,
            field === "unit_price" ? (value as number) : item.unit_price
          );
        }
        return next;
      });
      return updated;
    });
  };

  const removeBuilderItem = (id: string) => {
    setBuilderItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCreateQuote = async () => {
    if (!builderSubject.trim() || !builderClientName.trim() || builderItems.length === 0) return;
    setBuilderSubmitting(true);
    const items = recalcItems(builderItems);
    const subtotal = calcSubtotal(items);
    const gst = calcGst(subtotal);
    const total = calcTotal(subtotal, gst);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: builderSubject,
          client_name: builderClientName,
          client_email: builderClientEmail || undefined,
          notes: builderNotes || undefined,
          items,
          subtotal,
          gst,
          total,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        // Add items one by one
        if (created.id) {
          for (const item of items) {
            await fetch(`/api/quotes/${created.id}/items`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item),
            });
          }
        }
        setQuotes((prev) => [created, ...prev]);
        setBuilderSubject("");
        setBuilderClientName("");
        setBuilderClientEmail("");
        setBuilderNotes("");
        setBuilderItems([]);
        setTab("quotes");
      }
    } catch {
      // ignore
    } finally {
      setBuilderSubmitting(false);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

  const renderQuoteDetail = () => {
    if (!selectedQuote) return null;
    const q = selectedQuote;
    const sub = q.subtotal || calcSubtotal(q.items || []);
    const gst = q.gst || calcGst(sub);
    const total = q.total || calcTotal(sub, gst);

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 bg-black/40 overflow-y-auto" onClick={() => setSelectedQuote(null)}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-3xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-accent" />
{q.title}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setPreviewQuote(q); setSelectedQuote(null); }}
                className="p-2 text-gray-400 hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button onClick={() => setSelectedQuote(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {quoteDetailLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Client</p>
                  <p className="font-medium text-brand-dark dark:text-white">{q.lead_name}</p>
                  {q.lead_email && <p className="text-sm text-gray-500">{q.lead_email}</p>}
                </div>
                <div className="text-right">
                  <StatusBadge status={q.status} />
                  <p className="text-xs text-gray-500 mt-1">Created {new Date(q.created_at).toLocaleDateString("en-AU")}</p>
                  {q.sent_at && <p className="text-xs text-gray-500">Sent {new Date(q.sent_at).toLocaleDateString("en-AU")}</p>}
                  {q.expires_at && <p className="text-xs text-gray-500">Expires {new Date(q.expires_at).toLocaleDateString("en-AU")}</p>}
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 pr-2 font-semibold text-gray-500">Description</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-16">Qty</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-20">Unit</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-24">Unit Price</th>
                      <th className="text-right py-2 pl-2 font-semibold text-gray-500 w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!q.items || q.items.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400">No line items</td>
                      </tr>
                    ) : (
                      q.items.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 pr-2 text-brand-dark dark:text-white">{item.description}</td>
                          <td className="py-2 px-2 text-right">{item.quantity}</td>
                          <td className="py-2 px-2 text-right">{item.unit}</td>
                          <td className="py-2 px-2 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                          <td className="py-2 pl-2 text-right font-mono font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex justify-between w-48">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-mono">{formatCurrency(sub)}</span>
                </div>
                <div className="flex justify-between w-48">
                  <span className="text-gray-500">GST (10%)</span>
                  <span className="font-mono">{formatCurrency(gst)}</span>
                </div>
                <div className="flex justify-between w-48 text-base font-bold text-brand-dark dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(total)}</span>
                </div>
              </div>

              {q.notes && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{q.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                {q.status === "draft" && (
                  <>
                    <button
                      onClick={() => setSendDate(new Date().toISOString().split("T")[0])}
                      className="flex items-center gap-1.5 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Send Quote
                    </button>
                    {sendDate && (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="date"
                          value={sendDate}
                          onChange={(e) => setSendDate(e.target.value)}
                          className="h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        />
                        <button
                          onClick={() => handleQuoteAction(q.id, "send", { sent_at: sendDate, expires_at: sendDate })}
                          disabled={quoteActionLoading === `send_${q.id}`}
                          className="h-9 px-3 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {quoteActionLoading === `send_${q.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Send"}
                        </button>
                        <button onClick={() => setSendDate("")} className="h-9 px-3 text-xs text-gray-500 hover:text-gray-700">
                          Cancel
                        </button>
                      </div>
                    )}
                  </>
                )}
                {q.status === "sent" && (
                  <>
                    <button
                      onClick={() => handleQuoteAction(q.id, "accept")}
                      disabled={quoteActionLoading === `accept_${q.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {quoteActionLoading === `accept_${q.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Accept
                    </button>
                    <button
                      onClick={() => handleQuoteAction(q.id, "reject")}
                      disabled={quoteActionLoading === `reject_${q.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {quoteActionLoading === `reject_${q.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                      Reject
                    </button>
                  </>
                )}
                {q.status === "accepted" && (
                  <button
                    onClick={() => handleConvertToProject(q.id)}
                    disabled={quoteActionLoading === `convert_${q.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {quoteActionLoading === `convert_${q.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
                    Convert to Project
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    if (!previewQuote) return null;
    const q = previewQuote;
    const sub = q.subtotal || calcSubtotal(q.items || []);
    const gst = q.gst || calcGst(sub);
    const total = q.total || calcTotal(sub, gst);

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-10 bg-black/40 overflow-y-auto" onClick={() => setPreviewQuote(null)}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-3xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end px-6 py-3 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors mr-2"
            >
              <ExternalLink className="w-4 h-4" />
              Print
            </button>
            <button onClick={() => setPreviewQuote(null)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-8 print:p-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-2xl font-display font-bold text-brand-dark dark:text-white">QUOTATION</h1>
                <p className="text-sm text-gray-500 mt-1">TNA Provider</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-brand-dark dark:text-white">Quote #{q.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-gray-500">{new Date(q.created_at).toLocaleDateString("en-AU")}</p>
                {q.expires_at && <p className="text-xs text-gray-500">Valid until: {new Date(q.expires_at).toLocaleDateString("en-AU")}</p>}
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-8">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bill To</p>
              <p className="font-medium text-brand-dark dark:text-white">{q.lead_name || q.client_name}</p>
              {q.lead_email && <p className="text-sm text-gray-500">{q.lead_email}</p>}
            </div>

            {/* Subject */}
            <p className="text-lg font-semibold text-brand-dark dark:text-white mb-4">{q.title}</p>

            {/* Items */}
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="text-left py-2 font-semibold text-gray-600 dark:text-gray-400">Description</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-600 dark:text-gray-400 w-16">Qty</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-600 dark:text-gray-400 w-20">Unit</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-600 dark:text-gray-400 w-28">Unit Price</th>
                  <th className="text-right py-2 font-semibold text-gray-600 dark:text-gray-400 w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {q.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-2.5 pr-2 text-brand-dark dark:text-white">{item.description}</td>
                    <td className="py-2.5 px-2 text-right">{item.quantity}</td>
                    <td className="py-2.5 px-2 text-right">{item.unit}</td>
                    <td className="py-2.5 px-2 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2.5 text-right font-mono font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex flex-col items-end gap-1 text-sm mb-8">
              <div className="flex justify-between w-56">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-mono">{formatCurrency(sub)}</span>
              </div>
              <div className="flex justify-between w-56">
                <span className="text-gray-500">GST (10%)</span>
                <span className="font-mono">{formatCurrency(gst)}</span>
              </div>
              <div className="flex justify-between w-56 text-lg font-bold text-brand-dark dark:text-white border-t-2 border-gray-300 dark:border-gray-600 pt-1 mt-1">
                <span>Total</span>
                <span className="font-mono">{formatCurrency(total)}</span>
              </div>
            </div>

            {q.notes && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-8">
                <p className="font-semibold text-gray-500 mb-1">Notes</p>
                <p className="whitespace-pre-wrap">{q.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4 mt-8">
              <p>TNA Provider &mdash; Commercial Fitouts, Shopfitting &amp; Joinery Sydney</p>
              <p className="mt-1">ABN: 00 000 000 000 &bull; Ph: 0000 000 000 &bull; enquiries@tnaprovider.com.au</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabNav = () => (
    <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
      {([
        { key: "requests" as Tab, label: "Quote Requests" },
        { key: "quotes" as Tab, label: "Quotes" },
        { key: "builder" as Tab, label: "Quote Builder" },
      ]).map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === t.key
              ? "border-brand-accent text-brand-accent"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const renderRequestsTab = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{requests.length} requests</p>
        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {requestsError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{requestsError}</p>
        </div>
      )}

      {requestsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No quote requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-brand-dark dark:text-white">{req.lead_name || req.title}</h4>
                  <p className="text-xs text-gray-500">{req.lead_email || ''}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{req.scope || ''}</p>
              <p className="text-xs text-gray-400 mt-2">{new Date(req.created_at).toLocaleDateString("en-AU")}</p>
            </div>
          ))}
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowRequestModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white">New Quote Request</h2>
              <button onClick={() => setShowRequestModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={requestForm.title}
                  onChange={(e) => setRequestForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Scope</label>
                <textarea
                  required
                  rows={3}
                  value={requestForm.scope}
                  onChange={(e) => setRequestForm((f) => ({ ...f, scope: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent text-sm resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowRequestModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={requestSubmitting} className="px-5 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors disabled:opacity-50 flex items-center gap-1.5">
                  {requestSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderQuotesTab = () => (
    <div>
      {quotesError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{quotesError}</p>
        </div>
      )}

      {quotesLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No quotes yet</p>
          <button onClick={() => setTab("builder")} className="mt-3 text-sm text-brand-accent hover:underline">Create your first quote</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {quotes.map((quote) => (
            <button
              key={quote.id}
              onClick={() => handleSelectQuote(quote)}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-left hover:border-brand-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="min-w-0">
                  <h4 className="font-medium text-brand-dark dark:text-white truncate">{quote.title}</h4>
                  <p className="text-xs text-gray-500">{quote.client_name}</p>
                </div>
                <StatusBadge status={quote.status} />
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-2">
                <span className="font-mono font-medium text-brand-dark dark:text-white">{formatCurrency(quote.total || 0)}</span>
                <span>{new Date(quote.created_at).toLocaleDateString("en-AU")}</span>
                {quote.items && <span>{quote.items.length} items</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderBuilderTab = () => (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Create a new quote with line items. All totals are calculated automatically.</p>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
            <input
              type="text"
              value={builderSubject}
              onChange={(e) => setBuilderSubject(e.target.value)}
              placeholder="e.g. Kitchen Fitout - Phase 1"
              className="w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Client Name *</label>
            <input
              type="text"
              value={builderClientName}
              onChange={(e) => setBuilderClientName(e.target.value)}
              placeholder="Client name"
              className="w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Client Email</label>
            <input
              type="email"
              value={builderClientEmail}
              onChange={(e) => setBuilderClientEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent text-sm"
            />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Line Items</h3>
            <button
              onClick={addBuilderItem}
              className="flex items-center gap-1 text-sm text-brand-accent hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          {builderItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
              <p className="text-sm">No line items. Click "Add Item" to begin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="w-8" />
                    <th className="text-left py-2 pr-1 font-semibold text-gray-500">Description</th>
                    <th className="text-right py-2 px-1 font-semibold text-gray-500 w-16">Qty</th>
                    <th className="text-right py-2 px-1 font-semibold text-gray-500 w-20">Unit</th>
                    <th className="text-right py-2 px-1 font-semibold text-gray-500 w-28">Unit Price</th>
                    <th className="text-right py-2 px-1 font-semibold text-gray-500 w-28">Total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {builderItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-1.5">
                        <GripVertical className="w-4 h-4 text-gray-300" />
                      </td>
                      <td className="py-1.5 pr-1">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateBuilderItem(item.id, "description", e.target.value)}
                          placeholder="Item description"
                          className="w-full h-9 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent text-xs"
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateBuilderItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-16 h-9 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent text-xs text-right"
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <select
                          value={item.unit}
                          onChange={(e) => updateBuilderItem(item.id, "unit", e.target.value)}
                          className="w-20 h-9 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent text-xs"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateBuilderItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                          className="w-full h-9 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent text-xs text-right"
                        />
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono font-medium text-sm">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="py-1.5">
                        <button
                          onClick={() => removeBuilderItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Calculated Totals */}
        <div className="flex flex-col items-end gap-1 text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between w-48">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-mono">{formatCurrency(builderSubtotal)}</span>
          </div>
          <div className="flex justify-between w-48">
            <span className="text-gray-500">GST (10%)</span>
            <span className="font-mono">{formatCurrency(builderGst)}</span>
          </div>
          <div className="flex justify-between w-48 text-base font-bold text-brand-dark dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1">
            <span>Total</span>
            <span className="font-mono">{formatCurrency(builderTotal)}</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
          <textarea
            rows={2}
            value={builderNotes}
            onChange={(e) => setBuilderNotes(e.target.value)}
            placeholder="Payment terms, delivery notes, etc."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent text-sm resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => { setBuilderSubject(""); setBuilderClientName(""); setBuilderClientEmail(""); setBuilderNotes(""); setBuilderItems([]); }}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleCreateQuote}
            disabled={builderSubmitting || !builderSubject.trim() || !builderClientName.trim() || builderItems.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors disabled:opacity-50"
          >
            {builderSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Create Quote
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SEO title="Quotes | TNA Provider Platform" description="Manage quotes and quote requests." canonical="https://tnaprovider.com.au/platform/quotes" />
      <PlatformHeader title="Quotes &amp; Estimations" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6">
        {renderTabNav()}

        {tab === "requests" && renderRequestsTab()}
        {tab === "quotes" && renderQuotesTab()}
        {tab === "builder" && renderBuilderTab()}
      </div>

      {selectedQuote && renderQuoteDetail()}
      {previewQuote && renderPreview()}
    </>
  );
}
